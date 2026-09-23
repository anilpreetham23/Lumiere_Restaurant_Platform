-- Preflight check for Reservations, Payments & Refunds migration
do $$
declare
  v_payments_count bigint;
  v_reservations_count bigint;
  v_intents_count bigint;
begin
  select count(*) into v_payments_count from public.payments;
  select count(*) into v_reservations_count from public.reservations;
  select count(*) into v_intents_count from public.payment_intents;

  raise notice 'Preflight passed: found % payments, % reservations, % payment_intents.',
    v_payments_count, v_reservations_count, v_intents_count;
end $$;
