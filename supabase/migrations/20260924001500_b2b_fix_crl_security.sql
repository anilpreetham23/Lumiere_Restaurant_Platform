-- Corrective Migration: Customers, Reviews & Loyalty Security Fixes
-- Defect 1: Loyalty Manual Adjustment Authorization
-- Defect 2: Loyalty Redemption & Reversal Execution Bounds
-- Defect 3: Verified Review Purchase Verification

-- ============================================================
-- 1. DEFECT 1 & 2 FIX: LOYALTY MUTATION RPCs (SERVICE_ROLE ONLY)
-- ============================================================

-- A. Redeem Loyalty Points Atomic (Hardened & Restricted)
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

  -- Validate customer belongs to restaurant
  if not exists (
    select 1 from public.customers
    where id = p_customer_id and restaurant_id = p_restaurant_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Customer does not belong to the specified restaurant');
  end if;

  -- Lock loyalty account row for update
  select * into v_account
  from public.loyalty_accounts
  where restaurant_id = p_restaurant_id and customer_id = p_customer_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Loyalty account not found for customer');
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

-- B. Adjust Loyalty Points Atomic (Hardened & Restricted)
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

  -- Validate customer belongs to restaurant
  if not exists (
    select 1 from public.customers
    where id = p_customer_id and restaurant_id = p_restaurant_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Customer does not belong to the specified restaurant');
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

-- C. Reverse Order Loyalty Points Atomic (Hardened & Restricted)
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

  -- Validate order belongs to restaurant
  if not exists (
    select 1 from public.session_orders
    where id = p_order_id and restaurant_id = p_restaurant_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Order does not belong to the specified restaurant');
  end if;

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

  -- Check if already reversed
  if exists (
    select 1 from public.loyalty_transactions
    where restaurant_id = p_restaurant_id
      and reference_type = 'refund'
      and reference_id = p_order_id::text
      and type = 'reversal'
  ) then
    return jsonb_build_object('ok', true, 'status', 'already_reversed', 'points_reversed', 0);
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

-- ============================================================
-- 2. DEFECT 3 FIX: VERIFIED REVIEW INTERACTION VALIDATION
-- ============================================================

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
  v_session record;
  v_review_id uuid;
  v_customer_id uuid;
  v_customer_name text;
begin
  -- 1. Rating Bounds Validation
  if p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'Rating must be between 1 and 5');
  end if;

  -- 2. Session ID Required for Verified Review
  if p_session_id is null then
    return jsonb_build_object('ok', false, 'error', 'Valid dining session ID is required to submit a verified review');
  end if;

  -- 3. Verify Session Belongs to Restaurant
  select * into v_session
  from public.dining_sessions
  where id = p_session_id and restaurant_id = p_restaurant_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Session not found or does not belong to specified restaurant');
  end if;

  -- 4. Verify Dish was Actually Ordered in this Session
  if not exists (
    select 1
    from public.session_orders o
    where o.session_id = p_session_id
      and o.restaurant_id = p_restaurant_id
      and exists (
        select 1
        from jsonb_array_elements(o.items) item
        where item->>'menu_item_id' = p_menu_item_id
      )
  ) then
    return jsonb_build_object('ok', false, 'error', 'Dish was not ordered in this dining session');
  end if;

  -- 5. Duplicate Review Protection for same session + menu item
  if exists (
    select 1
    from public.dish_ratings
    where session_id = p_session_id and menu_item_id = p_menu_item_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'A review for this dish has already been submitted for this session');
  end if;

  -- 6. Resolve Customer Identity if Phone present
  if v_session.phone is not null and v_session.phone <> '' then
    select id into v_customer_id
    from public.customers
    where restaurant_id = p_restaurant_id and phone = v_session.phone;
  end if;

  v_customer_name := coalesce(p_customer_name, v_session.customer_name, 'Guest');

  -- 7. Insert Verified Dish Rating / Review
  insert into public.dish_ratings (
    restaurant_id, menu_item_id, rating, review_text, customer_name, customer_id, session_id, status, created_by
  ) values (
    p_restaurant_id, p_menu_item_id, p_rating, p_review_text, v_customer_name, v_customer_id, p_session_id, 'published', auth.uid()
  ) returning id into v_review_id;

  return jsonb_build_object('ok', true, 'review_id', v_review_id);
end $$;

-- ============================================================
-- 3. EXECUTION PERMISSIONS REVISION
-- ============================================================

-- Revoke mutation RPCs from public, anon, and authenticated database roles
revoke all on function public.earn_loyalty_for_order(uuid) from public, anon, authenticated;
grant execute on function public.earn_loyalty_for_order(uuid) to service_role;

revoke all on function public.redeem_loyalty_points_atomic(uuid, uuid, int, text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_loyalty_points_atomic(uuid, uuid, int, text, uuid) to service_role;

revoke all on function public.adjust_loyalty_points_atomic(uuid, uuid, int, text, uuid) from public, anon, authenticated;
grant execute on function public.adjust_loyalty_points_atomic(uuid, uuid, int, text, uuid) to service_role;

revoke all on function public.reverse_order_loyalty_points_atomic(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.reverse_order_loyalty_points_atomic(uuid, uuid, text, uuid) to service_role;

-- Verified review RPC remains executable by anon & authenticated because it enforces session interaction verification internally
revoke all on function public.submit_verified_review_atomic(uuid, text, int, text, text, uuid) from public;
grant execute on function public.submit_verified_review_atomic(uuid, text, int, text, text, uuid) to anon, authenticated, service_role;
