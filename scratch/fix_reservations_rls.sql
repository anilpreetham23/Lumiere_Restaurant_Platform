-- Fix RLS policies for reservations & payment_intents for public booking and deposit payments

-- 1. Allow public guests (anon & authenticated) to insert reservations
drop policy if exists "anon insert reservations" on public.reservations;
create policy "anon insert reservations" on public.reservations
  for insert to anon, authenticated
  with check (true);

-- 2. Allow public guests to select their created reservation
drop policy if exists "anon select reservations" on public.reservations;
create policy "anon select reservations" on public.reservations
  for select to anon, authenticated
  using (true);

-- 3. Ensure payment_intents RLS allows insert, select, and update for deposit checkout
drop policy if exists "anon insert payment_intents" on public.payment_intents;
create policy "anon insert payment_intents" on public.payment_intents
  for insert to anon, authenticated
  with check (true);

drop policy if exists "anon select payment_intents" on public.payment_intents;
create policy "anon select payment_intents" on public.payment_intents
  for select to anon, authenticated
  using (true);

drop policy if exists "anon update payment_intents" on public.payment_intents;
create policy "anon update payment_intents" on public.payment_intents
  for update to anon, authenticated
  using (true);

-- 4. Create SECURITY DEFINER RPC helper for public reservation creation
create or replace function public.create_public_reservation(
  p_restaurant_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_guests text,
  p_date date,
  p_time text,
  p_requests text default null,
  p_pre_order jsonb default null,
  p_deposit_amount numeric default 0,
  p_deposit_status text default 'none'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res_id uuid;
begin
  insert into public.reservations (
    restaurant_id, name, phone, email, guests, date, time, requests, pre_order, deposit_amount, deposit_status, status
  ) values (
    p_restaurant_id, p_name, p_phone, p_email, p_guests, p_date, p_time, nullif(trim(p_requests), ''), p_pre_order, p_deposit_amount, p_deposit_status, 'pending'
  ) returning id into v_res_id;

  return jsonb_build_object('ok', true, 'id', v_res_id);
end $$;

grant execute on function public.create_public_reservation(uuid, text, text, text, text, date, text, text, jsonb, numeric, text) to anon, authenticated, service_role;
