-- Migration: Customers, Reviews & Loyalty Foundation
-- Phase 1 - 9: Schema, RPCs, Tenant RLS, and Ledger Security

-- ============================================================
-- 1. CUSTOMERS TABLE ENHANCEMENTS
-- ============================================================
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists updated_at timestamptz default now();

-- Ensure tenant-scoped unique index on phone
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'uq_customers_restaurant_phone'
  ) then
    begin
      alter table public.customers add constraint uq_customers_restaurant_phone unique (restaurant_id, phone);
    exception when others then
      -- If existing primary key conflicts, ensure the unique constraint index exists safely
      null;
    end;
  end if;
end $$;

create index if not exists idx_customers_restaurant on public.customers(restaurant_id);
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_customers_email on public.customers(email);

-- ============================================================
-- 2. REVIEWS & RATINGS EXTENSION (DISH_RATINGS ENHANCEMENTS)
-- ============================================================
alter table public.dish_ratings add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.dish_ratings add column if not exists customer_name text;
alter table public.dish_ratings add column if not exists review_text text;
alter table public.dish_ratings add column if not exists status text not null default 'published' check (status in ('published', 'hidden', 'flagged'));
alter table public.dish_ratings add column if not exists updated_at timestamptz default now();
alter table public.dish_ratings add column if not exists created_by uuid;

create index if not exists idx_dish_ratings_restaurant on public.dish_ratings(restaurant_id);
create index if not exists idx_dish_ratings_menu_item on public.dish_ratings(menu_item_id);
create index if not exists idx_dish_ratings_customer on public.dish_ratings(customer_id);
create index if not exists idx_dish_ratings_status on public.dish_ratings(status);

-- ============================================================
-- 3. LOYALTY ACCOUNTS TABLE
-- ============================================================
create table if not exists public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  lifetime_points int not null default 0 check (lifetime_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_loyalty_accounts_restaurant_customer unique (restaurant_id, customer_id)
);

create index if not exists idx_loyalty_accounts_restaurant_customer
  on public.loyalty_accounts(restaurant_id, customer_id);

-- ============================================================
-- 4. LOYALTY TRANSACTIONS TABLE (LEDGER)
-- ============================================================
create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('earn', 'redeem', 'adjustment', 'reversal')),
  points int not null,
  reference_type text,
  reference_id text,
  description text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint uq_loyalty_ref_type_unique unique nulls not distinct (restaurant_id, reference_type, reference_id, type)
);

create index if not exists idx_loyalty_tx_account on public.loyalty_transactions(loyalty_account_id);
create index if not exists idx_loyalty_tx_restaurant on public.loyalty_transactions(restaurant_id);
create index if not exists idx_loyalty_tx_customer on public.loyalty_transactions(customer_id);

-- ============================================================
-- 5. RESTAURANT SETTINGS LOYALTY CONFIGURATION
-- ============================================================
alter table public.restaurant_settings add column if not exists loyalty_earn_rate_inr numeric(10,2) not null default 100.00;
alter table public.restaurant_settings add column if not exists loyalty_enabled boolean not null default true;

-- ============================================================
-- 6. SECURITY DEFINER ATOMIC LOYALTY & REVIEW RPCs
-- ============================================================

-- A. Earn Loyalty Points for Completed/Served Order
create or replace function public.earn_loyalty_for_order(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_session record;
  v_customer_id uuid;
  v_earn_rate numeric(10,2) := 100.00;
  v_loyalty_enabled boolean := true;
  v_points_earned int;
  v_account_id uuid;
  v_order_amount numeric(10,2);
  v_customer_name text;
  v_customer_phone text;
begin
  -- 1. Fetch Session Order
  select * into v_order
  from public.session_orders
  where id = p_order_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  -- 2. Verify Order Status is served/completed
  if v_order.status not in ('served', 'completed') then
    return jsonb_build_object('ok', false, 'error', 'Order must be served or completed to earn points', 'status', v_order.status);
  end if;

  -- 3. Fetch Dining Session & Customer details if available
  select * into v_session
  from public.dining_sessions
  where id = v_order.session_id;

  if v_session.id is not null then
    v_customer_phone := v_session.phone;
    v_customer_name := v_session.customer_name;
  end if;

  if v_customer_phone is null or v_customer_phone = '' then
    -- Cannot attribute loyalty without customer phone identity
    return jsonb_build_object('ok', false, 'error', 'No customer phone identity associated with order');
  end if;

  -- 4. Check Restaurant Loyalty Settings
  select coalesce(loyalty_earn_rate_inr, 100.00), coalesce(loyalty_enabled, true)
  into v_earn_rate, v_loyalty_enabled
  from public.restaurant_settings
  where restaurant_id = v_order.restaurant_id;

  if not v_loyalty_enabled or v_earn_rate <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Loyalty program disabled or invalid earn rate');
  end if;

  -- 5. Calculate Points
  v_order_amount := coalesce(v_order.total, v_order.amount, 0);
  v_points_earned := floor(v_order_amount / v_earn_rate)::int;

  if v_points_earned <= 0 then
    return jsonb_build_object('ok', true, 'points_earned', 0, 'reason', 'Order total below earning threshold');
  end if;

  -- 6. Resolve/Upsert Customer Record
  select id into v_customer_id
  from public.customers
  where restaurant_id = v_order.restaurant_id and phone = v_customer_phone;

  if v_customer_id is null then
    insert into public.customers (restaurant_id, phone, name, visits, last_visit, last_visit_at)
    values (v_order.restaurant_id, v_customer_phone, v_customer_name, 1, now(), now())
    on conflict (restaurant_id, phone) do update
      set last_visit = now(), last_visit_at = now()
    returning id into v_customer_id;
  end if;

  -- 7. Get or Create Loyalty Account
  insert into public.loyalty_accounts (restaurant_id, customer_id, balance, lifetime_points)
  values (v_order.restaurant_id, v_customer_id, 0, 0)
  on conflict (restaurant_id, customer_id) do nothing;

  select id into v_account_id
  from public.loyalty_accounts
  where restaurant_id = v_order.restaurant_id and customer_id = v_customer_id;

  -- 8. Insert Earning Transaction (Idempotent via unique constraint)
  insert into public.loyalty_transactions (
    restaurant_id, loyalty_account_id, customer_id, type, points, reference_type, reference_id, description
  ) values (
    v_order.restaurant_id, v_account_id, v_customer_id, 'earn', v_points_earned, 'order', p_order_id::text,
    'Earned from Order #' || coalesce(v_order.order_number::text, p_order_id::text)
  ) on conflict (restaurant_id, reference_type, reference_id, type) do nothing;

  -- If constraint triggered idempotent skip, check if row was actually inserted
  if not found then
    return jsonb_build_object('ok', true, 'status', 'already_awarded', 'points', v_points_earned);
  end if;

  -- 9. Update Loyalty Account Balance
  update public.loyalty_accounts
  set balance = balance + v_points_earned,
      lifetime_points = lifetime_points + v_points_earned,
      updated_at = now()
  where id = v_account_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'customer_id', v_customer_id,
    'points_earned', v_points_earned
  );
end $$;

-- B. Redeem Loyalty Points Atomic
create or replace function public.redeem_loyalty_points_atomic(
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_points int,
  p_reference_id text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.loyalty_accounts;
  v_effective_created_by uuid;
begin
  v_effective_created_by := coalesce(auth.uid(), p_created_by);

  if p_points <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Redemption points must be greater than zero');
  end if;

  -- Lock loyalty account row for update
  select * into v_account
  from public.loyalty_accounts
  where restaurant_id = p_restaurant_id and customer_id = p_customer_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Loyalty account not found');
  end if;

  if v_account.balance < p_points then
    return jsonb_build_object('ok', false, 'error', 'Insufficient loyalty points balance', 'available', v_account.balance, 'requested', p_points);
  end if;

  -- Deduct Points
  update public.loyalty_accounts
  set balance = balance - p_points,
      updated_at = now()
  where id = v_account.id;

  -- Record Ledger Transaction
  insert into public.loyalty_transactions (
    restaurant_id, loyalty_account_id, customer_id, type, points, reference_type, reference_id, description, created_by
  ) values (
    p_restaurant_id, v_account.id, p_customer_id, 'redeem', -p_points, 'redemption', coalesce(p_reference_id, gen_random_uuid()::text),
    'Redeemed ' || p_points || ' points', v_effective_created_by
  );

  return jsonb_build_object(
    'ok', true,
    'customer_id', p_customer_id,
    'points_redeemed', p_points,
    'remaining_balance', v_account.balance - p_points
  );
end $$;

-- C. Adjust Loyalty Points Atomic (Admin Manual Adjustment)
create or replace function public.adjust_loyalty_points_atomic(
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_points int,
  p_reason text,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.loyalty_accounts;
  v_effective_created_by uuid;
  v_new_balance int;
begin
  v_effective_created_by := coalesce(auth.uid(), p_created_by);

  if p_reason is null or trim(p_reason) = '' then
    return jsonb_build_object('ok', false, 'error', 'Adjustment reason is required');
  end if;

  if p_points = 0 then
    return jsonb_build_object('ok', false, 'error', 'Adjustment points cannot be zero');
  end if;

  -- Ensure Loyalty Account Exists
  insert into public.loyalty_accounts (restaurant_id, customer_id, balance, lifetime_points)
  values (p_restaurant_id, p_customer_id, 0, 0)
  on conflict (restaurant_id, customer_id) do nothing;

  select * into v_account
  from public.loyalty_accounts
  where restaurant_id = p_restaurant_id and customer_id = p_customer_id
  for update;

  v_new_balance := v_account.balance + p_points;

  if v_new_balance < 0 then
    return jsonb_build_object('ok', false, 'error', 'Adjustment would result in negative balance', 'current_balance', v_account.balance);
  end if;

  -- Update Balance
  update public.loyalty_accounts
  set balance = v_new_balance,
      lifetime_points = case when p_points > 0 then lifetime_points + p_points else lifetime_points end,
      updated_at = now()
  where id = v_account.id;

  -- Record Ledger Transaction
  insert into public.loyalty_transactions (
    restaurant_id, loyalty_account_id, customer_id, type, points, reference_type, reference_id, description, created_by
  ) values (
    p_restaurant_id, v_account.id, p_customer_id, 'adjustment', p_points, 'manual_adjustment', gen_random_uuid()::text,
    p_reason, v_effective_created_by
  );

  return jsonb_build_object(
    'ok', true,
    'customer_id', p_customer_id,
    'points_adjusted', p_points,
    'new_balance', v_new_balance
  );
end $$;

-- D. Reverse Order Loyalty Points Atomic (Refund/Cancellation Reversal)
create or replace function public.reverse_order_loyalty_points_atomic(
  p_restaurant_id uuid,
  p_order_id uuid,
  p_reason text default 'Order refund/cancellation reversal',
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_earn_tx public.loyalty_transactions;
  v_account public.loyalty_accounts;
  v_effective_created_by uuid;
  v_points_to_reverse int;
  v_deducted_points int;
begin
  v_effective_created_by := coalesce(auth.uid(), p_created_by);

  -- Find original earn transaction for this order
  select * into v_earn_tx
  from public.loyalty_transactions
  where restaurant_id = p_restaurant_id
    and reference_type = 'order'
    and reference_id = p_order_id::text
    and type = 'earn'
  limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'status', 'no_original_points_earned');
  end if;

  v_points_to_reverse := v_earn_tx.points;

  -- Lock account for update
  select * into v_account
  from public.loyalty_accounts
  where id = v_earn_tx.loyalty_account_id
  for update;

  -- Calculate reversal (floor balance at 0 if needed)
  v_deducted_points := least(v_account.balance, v_points_to_reverse);

  -- Update Balance
  update public.loyalty_accounts
  set balance = balance - v_deducted_points,
      updated_at = now()
  where id = v_account.id;

  -- Insert Reversal Transaction
  insert into public.loyalty_transactions (
    restaurant_id, loyalty_account_id, customer_id, type, points, reference_type, reference_id, description, created_by
  ) values (
    p_restaurant_id, v_account.id, v_earn_tx.customer_id, 'reversal', -v_deducted_points, 'refund', p_order_id::text,
    p_reason, v_effective_created_by
  ) on conflict (restaurant_id, reference_type, reference_id, type) do nothing;

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'points_reversed', v_deducted_points,
    'new_balance', v_account.balance - v_deducted_points
  );
end $$;

-- E. Create Verified Review RPC
create or replace function public.submit_verified_review_atomic(
  p_restaurant_id uuid,
  p_menu_item_id text,
  p_rating int,
  p_review_text text default null,
  p_customer_name text default null,
  p_session_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_id uuid;
begin
  if p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'Rating must be between 1 and 5');
  end if;

  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    return jsonb_build_object('ok', false, 'error', 'Invalid restaurant');
  end if;

  if not exists (select 1 from public.menu_items where id = p_menu_item_id and restaurant_id = p_restaurant_id) then
    return jsonb_build_object('ok', false, 'error', 'Unknown menu item for this restaurant');
  end if;

  insert into public.dish_ratings (
    restaurant_id, menu_item_id, rating, review_text, customer_name, session_id, status, created_by
  ) values (
    p_restaurant_id, p_menu_item_id, p_rating, p_review_text, coalesce(p_customer_name, 'Guest'), p_session_id, 'published', auth.uid()
  ) returning id into v_review_id;

  return jsonb_build_object('ok', true, 'review_id', v_review_id);
end $$;

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

alter table public.customers enable row level security;
alter table public.dish_ratings enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;

-- Customers Policies
drop policy if exists "Staff can view customers in their tenant" on public.customers;
create policy "Staff can view customers in their tenant"
  on public.customers for select
  to authenticated
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_memberships where user_id = auth.uid()
    )
  );

drop policy if exists "Staff can update customers in their tenant" on public.customers;
create policy "Staff can update customers in their tenant"
  on public.customers for update
  to authenticated
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_memberships where user_id = auth.uid()
    )
  );

-- Dish Ratings / Reviews Policies
drop policy if exists "Public can view published reviews" on public.dish_ratings;
create policy "Public can view published reviews"
  on public.dish_ratings for select
  to public
  using (status = 'published');

drop policy if exists "Staff can manage reviews in their tenant" on public.dish_ratings;
create policy "Staff can manage reviews in their tenant"
  on public.dish_ratings for all
  to authenticated
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_memberships where user_id = auth.uid()
    )
  );

-- Loyalty Accounts Policies
drop policy if exists "Staff can view loyalty accounts in their tenant" on public.loyalty_accounts;
create policy "Staff can view loyalty accounts in their tenant"
  on public.loyalty_accounts for select
  to authenticated
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_memberships where user_id = auth.uid()
    )
  );

-- Loyalty Transactions Policies
drop policy if exists "Staff can view loyalty transactions in their tenant" on public.loyalty_transactions;
create policy "Staff can view loyalty transactions in their tenant"
  on public.loyalty_transactions for select
  to authenticated
  using (
    restaurant_id in (
      select restaurant_id from public.restaurant_memberships where user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. EXECUTION PERMISSIONS
-- ============================================================
revoke all on function public.earn_loyalty_for_order(uuid) from public, anon;
grant execute on function public.earn_loyalty_for_order(uuid) to authenticated, service_role;

revoke all on function public.redeem_loyalty_points_atomic(uuid, uuid, int, text, uuid) from public, anon;
grant execute on function public.redeem_loyalty_points_atomic(uuid, uuid, int, text, uuid) to authenticated, service_role;

revoke all on function public.adjust_loyalty_points_atomic(uuid, uuid, int, text, uuid) from public, anon;
grant execute on function public.adjust_loyalty_points_atomic(uuid, uuid, int, text, uuid) to authenticated, service_role;

revoke all on function public.reverse_order_loyalty_points_atomic(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.reverse_order_loyalty_points_atomic(uuid, uuid, text, uuid) to authenticated, service_role;

grant execute on function public.submit_verified_review_atomic(uuid, text, int, text, text, uuid) to anon, authenticated, service_role;
