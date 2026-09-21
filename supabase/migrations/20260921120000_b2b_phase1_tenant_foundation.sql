begin;

-- Phase 1 is intentionally additive. Existing rows, primary keys, labels,
-- tokens, customer phone identity, and payment columns are preserved.
create extension if not exists "pgcrypto";

create table if not exists public.restaurants (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  logo text,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  phone text,
  email text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stable identity for the existing single-restaurant installation.
do $$
begin
  if exists (
    select 1 from public.restaurants
    where (id = '00000000-0000-0000-0000-000000000001'::uuid and slug <> 'lumiere')
       or (slug = 'lumiere' and id <> '00000000-0000-0000-0000-000000000001'::uuid)
  ) then
    raise exception 'Existing restaurant conflicts with the deterministic Lumiere tenant identity';
  end if;

  insert into public.restaurants (id, name, slug, status)
  values ('00000000-0000-0000-0000-000000000001'::uuid, 'Lumiere', 'lumiere', 'active')
  on conflict (id) do nothing;
end $$;

create or replace function public.default_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.restaurants where slug = 'lumiere' limit 1;
$$;

revoke all on function public.default_restaurant_id() from public, anon, authenticated;
grant execute on function public.default_restaurant_id() to anon, authenticated;

create table if not exists public.restaurant_memberships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index if not exists idx_restaurant_memberships_user
  on public.restaurant_memberships(user_id);
create index if not exists idx_restaurant_memberships_restaurant
  on public.restaurant_memberships(restaurant_id);

create table if not exists public.restaurant_branding (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  primary_color text not null default '#7a2e35',
  secondary_color text not null default '#16130f',
  accent_color text not null default '#c9a45c',
  background_color text not null default '#f6f0e7',
  assets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep this legacy table available for compatibility with older deployments.
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  restaurant_name text not null default 'Lumiere',
  tagline text not null default 'International Fine Dining',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  hours text not null default '',
  currency text not null default 'INR',
  deposit_amount numeric(10,2) not null default 500,
  service_charge_pct numeric(5,2) not null default 0,
  payment_gateway text not null default 'razorpay',
  accepting_orders boolean not null default true
);

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.restaurant_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  restaurant_name text not null default 'Lumiere',
  tagline text not null default 'International Fine Dining',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  hours text not null default '',
  currency text not null default 'INR',
  deposit_amount numeric(10,2) not null default 500,
  service_charge_pct numeric(5,2) not null default 0,
  payment_gateway text not null default 'razorpay',
  accepting_orders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.restaurant_branding (restaurant_id)
select public.default_restaurant_id()
where public.default_restaurant_id() is not null
on conflict (restaurant_id) do nothing;

insert into public.restaurant_settings (
  restaurant_id, restaurant_name, tagline, phone, email, address, hours,
  currency, deposit_amount, service_charge_pct, payment_gateway, accepting_orders
)
select public.default_restaurant_id(), restaurant_name, tagline, phone, email, address, hours,
  currency, deposit_amount, service_charge_pct, payment_gateway, accepting_orders
from public.app_settings
where id = 1
on conflict (restaurant_id) do nothing;

-- Add tenant keys as nullable first so existing data can be backfilled safely.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'dining_sessions', 'dish_ratings', 'menu_items', 'messages',
    'orders', 'restaurant_tables', 'reservations', 'service_requests',
    'session_orders', 'payments'
  ] loop
    execute format(
      'alter table public.%I add column if not exists restaurant_id uuid',
      table_name
    );
  end loop;
end $$;

-- Preserve the legacy customers primary key (phone), birthday, and last_visit.
alter table public.customers add column if not exists id uuid default gen_random_uuid();
alter table public.customers add column if not exists last_visit_at timestamptz;
update public.customers
set id = coalesce(id, gen_random_uuid()),
    last_visit_at = coalesce(last_visit_at, last_visit)
where id is null or last_visit_at is null;
alter table public.customers alter column id set not null;
create unique index if not exists uq_customers_id on public.customers(id);

-- Add the missing additive payment fields without replacing the live payments table.
alter table public.payments add column if not exists updated_at timestamptz default now();
alter table public.payments add column if not exists intent_id uuid;
alter table public.payments add column if not exists provider_order_id text;
alter table public.payments add column if not exists provider_payment_id text;
alter table public.payments add column if not exists paid_amount numeric(10,2);
alter table public.payments add column if not exists payment_method_type text;
update public.payments
set paid_amount = coalesce(paid_amount, amount)
where paid_amount is null;
alter table public.payments alter column paid_amount set default 0;
alter table public.payments alter column paid_amount set not null;

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  purpose text not null check (purpose in ('dine_in_bill', 'reservation_deposit')),
  session_id uuid,
  reservation_id uuid,
  table_token uuid,
  expected_amount numeric(10,2) not null check (expected_amount > 0),
  currency text not null default 'INR',
  tip_amount numeric(10,2) not null default 0,
  provider text not null check (provider in ('stripe', 'razorpay')),
  provider_order_id text,
  client_secret text,
  status text not null default 'created' check (
    status in ('created', 'processing', 'succeeded', 'failed', 'cancelled', 'expired')
  ),
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  constraint payment_intents_relationship_check check (
    (purpose = 'dine_in_bill' and session_id is not null and reservation_id is null)
    or
    (purpose = 'reservation_deposit' and reservation_id is not null and session_id is null)
  )
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.payment_intents'::regclass
      and conname = 'payment_intents_relationship_check'
  ) then
    alter table public.payment_intents
      add constraint payment_intents_relationship_check check (
        (purpose = 'dine_in_bill' and session_id is not null and reservation_id is null)
        or
        (purpose = 'reservation_deposit' and reservation_id is not null and session_id is null)
      );
  end if;
end $$;

create index if not exists idx_payment_intents_restaurant
  on public.payment_intents(restaurant_id);
create index if not exists idx_payment_intents_session
  on public.payment_intents(session_id);
create index if not exists idx_payment_intents_reservation
  on public.payment_intents(reservation_id);
create index if not exists idx_payment_intents_provider_order
  on public.payment_intents(provider, provider_order_id);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  created_at timestamptz not null default now(),
  payment_id uuid not null,
  session_id uuid,
  reservation_id uuid,
  provider text not null check (provider in ('stripe', 'razorpay', 'cash')),
  provider_refund_id text not null,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'INR',
  reason text,
  status text not null default 'succeeded' check (status in ('pending', 'succeeded', 'failed')),
  created_by uuid,
  constraint uq_payment_refund_provider_id unique (provider, provider_refund_id)
);

create index if not exists idx_payment_refunds_restaurant
  on public.payment_refunds(restaurant_id);
create index if not exists idx_payment_refunds_payment
  on public.payment_refunds(payment_id);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  provider text not null check (provider in ('stripe', 'razorpay')),
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'ignored', 'failed')),
  error_message text,
  processed_at timestamptz,
  constraint uq_webhook_provider_event unique (provider, event_id)
);

-- Backfill every existing single-restaurant row to the deterministic tenant.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'dining_sessions', 'dish_ratings', 'menu_items', 'messages',
    'orders', 'restaurant_tables', 'reservations', 'service_requests',
    'session_orders', 'payments'
  ] loop
    execute format(
      'update public.%I set restaurant_id = public.default_restaurant_id() where restaurant_id is null',
      table_name
    );
  end loop;
end $$;

-- New payment intents/refunds are tenant-owned from creation.
-- Existing payment rows were backfilled above.

-- Install tenant indexes before policies are replaced.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'dining_sessions', 'dish_ratings', 'menu_items', 'messages',
    'orders', 'restaurant_tables', 'reservations', 'service_requests',
    'session_orders', 'payments'
  ] loop
    execute format(
      'create index if not exists %I on public.%I(restaurant_id)',
      'idx_' || table_name || '_restaurant', table_name
    );
  end loop;
end $$;

create unique index if not exists uq_payments_provider_payment_id
  on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

-- Refuse to continue rather than create a partially tenantized schema.
do $$
declare
  missing_rows bigint;
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'dining_sessions', 'dish_ratings', 'menu_items', 'messages',
    'orders', 'restaurant_tables', 'reservations', 'service_requests',
    'session_orders', 'payments'
  ] loop
    execute format('select count(*) from public.%I where restaurant_id is null', table_name)
      into missing_rows;
    if missing_rows > 0 then
      raise exception 'Cannot tenantize %. % rows have no restaurant_id', table_name, missing_rows;
    end if;
  end loop;
end $$;

-- Add tenant foreign keys after backfill. Existing unrelated foreign keys remain.
do $$
declare
  table_name text;
  constraint_name text;
begin
  foreach table_name in array array[
    'customers', 'dining_sessions', 'dish_ratings', 'menu_items', 'messages',
    'orders', 'restaurant_tables', 'reservations', 'service_requests',
    'session_orders', 'payments'
  ] loop
    constraint_name := table_name || '_restaurant_id_fkey';
    if not exists (select 1 from pg_constraint where conname = constraint_name) then
      execute format(
        'alter table public.%I add constraint %I foreign key (restaurant_id) references public.restaurants(id) on delete restrict',
        table_name, constraint_name
      );
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_intents_restaurant_id_fkey') then
    alter table public.payment_intents
      add constraint payment_intents_restaurant_id_fkey
      foreign key (restaurant_id) references public.restaurants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_refunds_restaurant_id_fkey') then
    alter table public.payment_refunds
      add constraint payment_refunds_restaurant_id_fkey
      foreign key (restaurant_id) references public.restaurants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_intent_id_fkey') then
    alter table public.payments
      add constraint payments_intent_id_fkey
      foreign key (intent_id) references public.payment_intents(id) on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dish_ratings_menu_item_id_fkey') then
    alter table public.dish_ratings
      add constraint dish_ratings_menu_item_id_fkey
      foreign key (menu_item_id) references public.menu_items(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dish_ratings_session_id_fkey') then
    alter table public.dish_ratings
      add constraint dish_ratings_session_id_fkey
      foreign key (session_id) references public.dining_sessions(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'service_requests_session_id_fkey') then
    alter table public.service_requests
      add constraint service_requests_session_id_fkey
      foreign key (session_id) references public.dining_sessions(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reservations_table_id_fkey') then
    alter table public.reservations
      add constraint reservations_table_id_fkey
      foreign key (table_id) references public.restaurant_tables(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_intents_session_id_fkey') then
    alter table public.payment_intents
      add constraint payment_intents_session_id_fkey
      foreign key (session_id) references public.dining_sessions(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_intents_reservation_id_fkey') then
    alter table public.payment_intents
      add constraint payment_intents_reservation_id_fkey
      foreign key (reservation_id) references public.reservations(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_refunds_payment_id_fkey') then
    alter table public.payment_refunds
      add constraint payment_refunds_payment_id_fkey
      foreign key (payment_id) references public.payments(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_refunds_session_id_fkey') then
    alter table public.payment_refunds
      add constraint payment_refunds_session_id_fkey
      foreign key (session_id) references public.dining_sessions(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_refunds_reservation_id_fkey') then
    alter table public.payment_refunds
      add constraint payment_refunds_reservation_id_fkey
      foreign key (reservation_id) references public.reservations(id) on delete set null;
  end if;
end $$;

-- Preserve the old customer phone primary key while making the customer identity
-- tenant-aware for future duplicate phone numbers in separate restaurants.
create unique index if not exists uq_customers_restaurant_phone
  on public.customers(restaurant_id, phone);

-- Existing application rows are now safe to require a tenant.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'dining_sessions', 'dish_ratings', 'menu_items', 'messages',
    'orders', 'restaurant_tables', 'reservations', 'service_requests',
    'session_orders', 'payments'
  ] loop
    execute format('alter table public.%I alter column restaurant_id set not null', table_name);
  end loop;
end $$;

-- Legacy public form actions do not send a tenant ID. Their only valid public
-- tenant is the default Lumiere restaurant until tenant-aware public routing exists.
alter table public.messages alter column restaurant_id set default public.default_restaurant_id();
alter table public.orders alter column restaurant_id set default public.default_restaurant_id();
alter table public.reservations alter column restaurant_id set default public.default_restaurant_id();

create or replace function public.is_restaurant_member(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.restaurant_memberships
    where restaurant_id = p_restaurant_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_restaurant_member(uuid) from public, anon, authenticated;
grant execute on function public.is_restaurant_member(uuid) to anon, authenticated;

create or replace function public.has_restaurant_role(p_restaurant_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.restaurant_memberships
    where restaurant_id = p_restaurant_id
      and user_id = auth.uid()
      and role = any(p_roles)
  );
$$;

revoke all on function public.has_restaurant_role(uuid, text[]) from public, anon, authenticated;
grant execute on function public.has_restaurant_role(uuid, text[]) to authenticated;

-- Prepare all relevant tables for the final policy set.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'restaurants', 'restaurant_memberships', 'restaurant_branding', 'restaurant_settings',
    'customers', 'dining_sessions', 'dish_ratings', 'menu_items', 'messages',
    'orders', 'restaurant_tables', 'reservations', 'service_requests',
    'session_orders', 'payments', 'payment_intents', 'payment_refunds',
    'app_settings', 'subscribers', 'webhook_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Remove only the policies on tables whose tenant policy is being replaced.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'restaurants', 'restaurant_memberships', 'restaurant_branding', 'restaurant_settings',
        'customers', 'dining_sessions', 'dish_ratings', 'menu_items', 'messages',
        'orders', 'restaurant_tables', 'reservations', 'service_requests',
        'session_orders', 'payments', 'payment_intents', 'payment_refunds',
        'app_settings', 'subscribers', 'webhook_events'
      )
  loop
    execute format('drop policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

create policy "member read restaurants" on public.restaurants
  for select to authenticated
  using (public.is_restaurant_member(id));

create policy "member read memberships" on public.restaurant_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy "owner manage memberships" on public.restaurant_memberships
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner']))
  with check (public.has_restaurant_role(restaurant_id, array['owner']));

create policy "member read branding" on public.restaurant_branding
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id));

create policy "member manage branding" on public.restaurant_branding
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy "member read settings" on public.restaurant_settings
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id));

create policy "member manage settings" on public.restaurant_settings
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy "public read default menu" on public.menu_items
  for select to anon, authenticated
  using (restaurant_id = public.default_restaurant_id() or public.is_restaurant_member(restaurant_id));

create policy "member write menu" on public.menu_items
  for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy "public insert reservations" on public.reservations
  for insert to anon, authenticated
  with check (restaurant_id = public.default_restaurant_id());

create policy "public insert messages" on public.messages
  for insert to anon, authenticated
  with check (restaurant_id = public.default_restaurant_id());

create policy "public insert orders" on public.orders
  for insert to anon, authenticated
  with check (restaurant_id = public.default_restaurant_id());

create policy "member all reservations" on public.reservations
  for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));

create policy "member all messages" on public.messages
  for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));

create policy "member all orders" on public.orders
  for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'dining_sessions', 'restaurant_tables', 'service_requests',
    'session_orders', 'payments', 'payment_intents', 'payment_refunds'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_restaurant_member(restaurant_id)) with check (public.is_restaurant_member(restaurant_id))',
      'member all ' || table_name, table_name
    );
  end loop;
end $$;

create policy "public read ratings" on public.dish_ratings
  for select to anon, authenticated
  using (restaurant_id = public.default_restaurant_id() or public.is_restaurant_member(restaurant_id));

create policy "authenticated read subscribers" on public.subscribers
  for select to authenticated using (true);
create policy "public insert subscribers" on public.subscribers
  for insert to anon, authenticated with check (true);

create policy "member all app settings" on public.app_settings
  for all to authenticated
  using (public.is_restaurant_member(public.default_restaurant_id()))
  with check (public.is_restaurant_member(public.default_restaurant_id()));

-- Webhook events intentionally remain service-role-only through RLS default deny.

-- Preserve the old QR function signature while replacing its implementation.
create or replace function public.resolve_table(p_token uuid)
returns table(id uuid, label text, seats int, state text)
language sql
security definer
set search_path = public
as $$
  select id, label, seats, state
  from public.restaurant_tables
  where token = p_token;
$$;

create or replace function public.get_session(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table public.restaurant_tables;
  v_sess public.dining_sessions;
  v_orders jsonb;
  v_reqs jsonb;
begin
  select * into v_table from public.restaurant_tables where token = p_token;
  if not found then return null; end if;

  select * into v_sess
  from public.dining_sessions
  where table_id = v_table.id
    and restaurant_id = v_table.restaurant_id
    and status in ('open', 'bill_pending')
  order by created_at desc limit 1;

  if not found then
    return jsonb_build_object(
      'restaurant_id', v_table.restaurant_id,
      'table', to_jsonb(v_table) - 'token',
      'session', null,
      'orders', '[]'::jsonb
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at), '[]'::jsonb)
    into v_orders
  from public.session_orders o
  where o.session_id = v_sess.id and o.restaurant_id = v_table.restaurant_id;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]'::jsonb)
    into v_reqs
  from public.service_requests r
  where r.session_id = v_sess.id
    and r.restaurant_id = v_table.restaurant_id
    and r.status <> 'done';

  return jsonb_build_object(
    'restaurant_id', v_table.restaurant_id,
    'table', to_jsonb(v_table) - 'token',
    'session', to_jsonb(v_sess),
    'orders', v_orders,
    'requests', v_reqs
  );
end $$;

create or replace function public.get_menu_for_table(p_token uuid)
returns setof public.menu_items
language sql
security definer
set search_path = public
as $$
  select m.*
  from public.menu_items m
  where exists (
    select 1 from public.restaurant_tables t
    where t.token = p_token and t.restaurant_id = m.restaurant_id
  )
  order by m.sort;
$$;

create or replace function public.place_order(
  p_token uuid,
  p_items jsonb,
  p_customer text default null,
  p_phone text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table public.restaurant_tables;
  v_sess public.dining_sessions;
  v_item jsonb;
  v_mi public.menu_items;
  v_qty int;
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_amount numeric(10,2) := 0;
begin
  select * into v_table from public.restaurant_tables where token = p_token;
  if not found then raise exception 'invalid table'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'empty order'; end if;

  select * into v_sess
  from public.dining_sessions
  where table_id = v_table.id
    and restaurant_id = v_table.restaurant_id
    and status in ('open', 'bill_pending')
  order by created_at desc limit 1;

  if not found then
    insert into public.dining_sessions(restaurant_id, table_id, customer_name, phone)
    values (v_table.restaurant_id, v_table.id, p_customer, p_phone)
    returning * into v_sess;
    update public.restaurant_tables
    set state = 'occupied', current_session_id = v_sess.id
    where id = v_table.id and restaurant_id = v_table.restaurant_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_mi
    from public.menu_items
    where id = (v_item->>'menu_item_id')
      and restaurant_id = v_table.restaurant_id;
    if not found then raise exception 'unknown item %', v_item->>'menu_item_id'; end if;
    if not v_mi.available then raise exception '% is sold out', v_mi.title; end if;
    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    v_amount := v_amount + v_mi.price * v_qty;
    v_line := jsonb_build_object(
      'menu_item_id', v_mi.id, 'title', v_mi.title,
      'price', v_mi.price, 'qty', v_qty, 'notes', v_item->>'notes'
    );
    v_lines := v_lines || v_line;
  end loop;

  insert into public.session_orders(restaurant_id, session_id, items, amount, notes)
  values (v_table.restaurant_id, v_sess.id, v_lines, v_amount, p_notes);

  return public.get_session(p_token);
end $$;

create or replace function public.call_service(p_token uuid, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table public.restaurant_tables;
  v_sess public.dining_sessions;
begin
  if p_type not in ('waiter', 'water', 'bill') then raise exception 'bad type'; end if;
  select * into v_table from public.restaurant_tables where token = p_token;
  if not found then raise exception 'invalid table'; end if;
  select * into v_sess
  from public.dining_sessions
  where table_id = v_table.id
    and restaurant_id = v_table.restaurant_id
    and status in ('open', 'bill_pending')
  order by created_at desc limit 1;

  insert into public.service_requests(restaurant_id, table_id, session_id, type)
  values (v_table.restaurant_id, v_table.id, v_sess.id, p_type);

  if p_type = 'bill' and found then
    update public.dining_sessions
    set status = 'bill_pending'
    where id = v_sess.id and restaurant_id = v_table.restaurant_id;
    update public.restaurant_tables
    set state = 'bill_pending'
    where id = v_table.id and restaurant_id = v_table.restaurant_id;
  end if;
end $$;

create or replace function public.touch_customer_for_table(
  p_token uuid, p_phone text, p_name text default null
)
returns table(visits int, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id
  from public.restaurant_tables where token = p_token;
  if v_restaurant_id is null or p_phone is null or p_phone = '' then return; end if;

  select * into v_customer
  from public.customers
  where phone = p_phone and restaurant_id = v_restaurant_id;

  if not found then
    insert into public.customers(restaurant_id, phone, name, visits, last_visit, last_visit_at)
    values (v_restaurant_id, p_phone, p_name, 1, now(), now())
    returning * into v_customer;
    return query select 1::int, p_name::text;
  end if;

  update public.customers
  set visits = visits + 1,
      last_visit = now(),
      last_visit_at = now(),
      name = coalesce(p_name, name)
  where id = v_customer.id;
  return query select (v_customer.visits + 1)::int, coalesce(v_customer.name, p_name)::text;
end $$;

create or replace function public.rate_dish_for_table(
  p_token uuid, p_menu_item_id text, p_rating int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'invalid rating'; end if;
  select restaurant_id into v_restaurant_id
  from public.restaurant_tables where token = p_token;
  if v_restaurant_id is null then raise exception 'invalid table'; end if;
  if not exists (
    select 1 from public.menu_items
    where id = p_menu_item_id and restaurant_id = v_restaurant_id
  ) then raise exception 'unknown menu item'; end if;
  insert into public.dish_ratings(restaurant_id, menu_item_id, rating)
  values (v_restaurant_id, p_menu_item_id, p_rating);
end $$;

create or replace function public.get_dish_ratings_for_table(p_token uuid)
returns table(menu_item_id text, rating int)
language sql
security definer
set search_path = public
as $$
  select r.menu_item_id, r.rating
  from public.dish_ratings r
  where exists (
    select 1 from public.restaurant_tables t
    where t.token = p_token and t.restaurant_id = r.restaurant_id
  );
$$;

create or replace function public.settle_payment_intent_atomic(
  p_intent_id uuid,
  p_provider_payment_id text,
  p_paid_amount numeric,
  p_currency text,
  p_payment_method_type text default 'online',
  p_provider text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.payment_intents;
  v_session public.dining_sessions;
  v_table public.restaurant_tables;
  v_reservation public.reservations;
  v_code text;
  v_payment_id uuid;
begin
  select * into v_intent
  from public.payment_intents where id = p_intent_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Payment intent not found'); end if;

  if v_intent.status = 'succeeded' then
    select receipt_code into v_code from public.payments where intent_id = v_intent.id;
    return jsonb_build_object('ok', true, 'status', 'already_settled', 'receipt_code', v_code);
  end if;

  if p_provider is not null and lower(p_provider) <> lower(v_intent.provider) then
    return jsonb_build_object('ok', false, 'error', 'Provider mismatch');
  end if;
  if p_paid_amount < v_intent.expected_amount then
    update public.payment_intents
    set status = 'failed', failure_reason = 'Underpaid amount'
    where id = v_intent.id;
    return jsonb_build_object('ok', false, 'error', 'Underpaid amount');
  end if;
  if upper(p_currency) <> upper(v_intent.currency) then
    return jsonb_build_object('ok', false, 'error', 'Currency mismatch');
  end if;

  v_code := 'LM-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  if v_intent.purpose = 'dine_in_bill' then
    select * into v_session
    from public.dining_sessions
    where id = v_intent.session_id and restaurant_id = v_intent.restaurant_id
    for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'Payment session tenant mismatch'); end if;

    select * into v_table
    from public.restaurant_tables
    where id = v_session.table_id and restaurant_id = v_intent.restaurant_id
    for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'Payment table tenant mismatch'); end if;

    update public.dining_sessions
    set status = 'paid', payment_status = 'paid', payment_method = p_payment_method_type,
        tip = v_intent.tip_amount, receipt_code = v_code, closed_at = now()
    where id = v_session.id and restaurant_id = v_intent.restaurant_id;
    update public.restaurant_tables
    set state = 'free', current_session_id = null
    where id = v_table.id and restaurant_id = v_intent.restaurant_id;

    insert into public.payments(
      restaurant_id, intent_id, session_id, provider, provider_order_id,
      provider_payment_id, stripe_payment_intent, amount, paid_amount,
      currency, payment_method_type, status, receipt_code
    ) values (
      v_intent.restaurant_id, v_intent.id, v_session.id, v_intent.provider,
      v_intent.provider_order_id, p_provider_payment_id, p_provider_payment_id,
      p_paid_amount, p_paid_amount, v_intent.currency, p_payment_method_type,
      'paid', v_code
    ) returning id into v_payment_id;

  elsif v_intent.purpose = 'reservation_deposit' then
    select * into v_reservation
    from public.reservations
    where id = v_intent.reservation_id and restaurant_id = v_intent.restaurant_id
    for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'Payment reservation tenant mismatch'); end if;

    update public.reservations
    set deposit_status = 'paid', status = 'confirmed'
    where id = v_reservation.id and restaurant_id = v_intent.restaurant_id;

    insert into public.payments(
      restaurant_id, intent_id, reservation_id, provider, provider_order_id,
      provider_payment_id, stripe_payment_intent, amount, paid_amount,
      currency, payment_method_type, status, receipt_code
    ) values (
      v_intent.restaurant_id, v_intent.id, v_reservation.id, v_intent.provider,
      v_intent.provider_order_id, p_provider_payment_id, p_provider_payment_id,
      p_paid_amount, p_paid_amount, v_intent.currency, p_payment_method_type,
      'paid', v_code
    ) returning id into v_payment_id;
  end if;

  update public.payment_intents
  set status = 'succeeded', updated_at = now()
  where id = v_intent.id;
  return jsonb_build_object('ok', true, 'payment_id', v_payment_id, 'receipt_code', v_code);
end $$;

-- Service-role-only settlement; customer RPCs remain available to QR guests.
revoke all on function public.resolve_table(uuid) from public, anon, authenticated;
revoke all on function public.get_session(uuid) from public, anon, authenticated;
revoke all on function public.get_menu_for_table(uuid) from public, anon, authenticated;
revoke all on function public.place_order(uuid, jsonb, text, text, text) from public, anon, authenticated;
revoke all on function public.call_service(uuid, text) from public, anon, authenticated;
revoke all on function public.settle_payment_intent_atomic(uuid, text, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.settle_payment_intent_atomic(uuid, text, numeric, text, text, text) to service_role;

revoke all on function public.touch_customer(text, text) from public, anon, authenticated;
revoke all on function public.touch_customer_for_table(uuid, text, text) from public, anon, authenticated;
grant execute on function public.touch_customer_for_table(uuid, text, text) to anon, authenticated;

revoke all on function public.rate_dish_for_table(uuid, text, int) from public, anon, authenticated;
revoke all on function public.get_dish_ratings_for_table(uuid) from public, anon, authenticated;
grant execute on function public.resolve_table(uuid) to anon, authenticated;
grant execute on function public.get_session(uuid) to anon, authenticated;
grant execute on function public.get_menu_for_table(uuid) to anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.call_service(uuid, text) to anon, authenticated;
grant execute on function public.rate_dish_for_table(uuid, text, int) to anon, authenticated;
grant execute on function public.get_dish_ratings_for_table(uuid) to anon, authenticated;

commit;
