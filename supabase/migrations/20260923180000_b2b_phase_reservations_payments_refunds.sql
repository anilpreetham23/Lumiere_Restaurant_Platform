-- Migration: Reservations, Payments & Refunds Operations
-- Date: 2026-09-23 18:00:00

-- 1. Ensure status check constraints on payments and reservations allow all operational statuses
do $$
begin
  -- Drop existing constraint on payments status if it restricts partially_refunded
  alter table public.payments drop constraint if exists payments_status_check;
  alter table public.payments add constraint payments_status_check
    check (status in ('pending', 'processing', 'paid', 'partially_refunded', 'refunded', 'failed', 'cancelled'));
exception
  when undefined_object then null;
end $$;

do $$
begin
  alter table public.reservations drop constraint if exists reservations_status_check;
  alter table public.reservations add constraint reservations_status_check
    check (status in ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'));
exception
  when undefined_object then null;
end $$;

do $$
begin
  alter table public.reservations drop constraint if exists reservations_deposit_status_check;
  alter table public.reservations add constraint reservations_deposit_status_check
    check (deposit_status in ('none', 'pending', 'paid', 'partially_refunded', 'refunded', 'applied', 'forfeited'));
exception
  when undefined_object then null;
end $$;

-- 2. Reservation Conflict Checking Helper
create or replace function public.check_reservation_conflict(
  p_restaurant_id uuid,
  p_date date,
  p_time text,
  p_table_id uuid default null,
  p_exclude_reservation_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict_count integer;
begin
  if p_table_id is null then
    return false;
  end if;

  select count(*) into v_conflict_count
  from public.reservations
  where restaurant_id = p_restaurant_id
    and table_id = p_table_id
    and date = p_date
    and time = p_time
    and status in ('pending', 'confirmed', 'seated')
    and (p_exclude_reservation_id is null or id <> p_exclude_reservation_id);

  return v_conflict_count > 0;
end $$;

revoke all on function public.check_reservation_conflict(uuid, date, text, uuid, uuid) from public, anon;
grant execute on function public.check_reservation_conflict(uuid, date, text, uuid, uuid) to service_role, authenticated;

-- 3. Atomic Financial Refund RPC
create or replace function public.process_payment_refund_atomic(
  p_restaurant_id uuid,
  p_payment_id uuid,
  p_refund_amount numeric default null,
  p_reason text default null,
  p_provider_refund_id text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
  v_already_refunded numeric(10,2);
  v_refundable numeric(10,2);
  v_refund_id uuid;
  v_prov_ref_id text;
  v_new_total_refunded numeric(10,2);
  v_new_status text;
  v_actual_refund_amount numeric(10,2);
begin
  -- 1. Lock payment row with tenant check
  select * into v_payment
  from public.payments
  where id = p_payment_id and restaurant_id = p_restaurant_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Payment not found or tenant mismatch');
  end if;

  if v_payment.status not in ('paid', 'partially_refunded') then
    return jsonb_build_object('ok', false, 'error', 'Payment is not eligible for refund (status: ' || v_payment.status || ')');
  end if;

  -- 2. Calculate sum of existing succeeded refunds
  select coalesce(sum(amount), 0) into v_already_refunded
  from public.payment_refunds
  where payment_id = v_payment.id and restaurant_id = p_restaurant_id and status = 'succeeded';

  v_refundable := v_payment.paid_amount - v_already_refunded;

  if v_refundable <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Payment is already fully refunded');
  end if;

  if p_refund_amount is null or p_refund_amount <= 0 then
    v_actual_refund_amount := v_refundable;
  else
    v_actual_refund_amount := p_refund_amount;
  end if;

  if v_actual_refund_amount > v_refundable then
    return jsonb_build_object('ok', false, 'error', 'Refund amount (' || v_actual_refund_amount || ') exceeds remaining refundable balance (' || v_refundable || ')');
  end if;

  v_prov_ref_id := coalesce(p_provider_refund_id, 'rfnd_' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12)));

  -- 3. Insert refund record
  insert into public.payment_refunds (
    restaurant_id, payment_id, session_id, reservation_id,
    provider, provider_refund_id, amount, currency, reason, status, created_by
  ) values (
    p_restaurant_id, v_payment.id, v_payment.session_id, v_payment.reservation_id,
    v_payment.provider, v_prov_ref_id, v_actual_refund_amount, v_payment.currency,
    p_reason, 'succeeded', p_created_by
  ) returning id into v_refund_id;

  v_new_total_refunded := v_already_refunded + v_actual_refund_amount;
  if v_new_total_refunded >= v_payment.paid_amount then
    v_new_status := 'refunded';
  else
    v_new_status := 'partially_refunded';
  end if;

  -- 4. Update payment status
  update public.payments
  set status = v_new_status
  where id = v_payment.id and restaurant_id = p_restaurant_id;

  -- 5. Update reservation deposit status if applicable
  if v_payment.reservation_id is not null then
    update public.reservations
    set deposit_status = case when v_new_status = 'refunded' then 'refunded' else 'partially_refunded' end
    where id = v_payment.reservation_id and restaurant_id = p_restaurant_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'refund_id', v_refund_id,
    'provider_refund_id', v_prov_ref_id,
    'refunded_amount', v_actual_refund_amount,
    'payment_status', v_new_status,
    'remaining_refundable', v_payment.paid_amount - v_new_total_refunded
  );
end $$;

revoke all on function public.process_payment_refund_atomic(uuid, uuid, numeric, text, text, uuid) from public, anon, authenticated;
grant execute on function public.process_payment_refund_atomic(uuid, uuid, numeric, text, text, uuid) to service_role;
