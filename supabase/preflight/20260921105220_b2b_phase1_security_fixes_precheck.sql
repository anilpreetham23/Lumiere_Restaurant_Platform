-- READ-ONLY preflight for Lumière Phase 1B Security Fixes.
-- This file must be reviewed/executed separately before applying the security migration.
-- It performs catalog reads and consistency validation only — contains no DDL or DML.

do $$
declare
  invalid_session_fks bigint;
  mismatched_session_tenants bigint;
  invalid_reservation_fks bigint;
  mismatched_reservation_tenants bigint;
  duplicate_sessions bigint;
  duplicate_reservations bigint;
begin
  -- 1. Check all payment_intents.session_id point to existing sessions
  select count(*) into invalid_session_fks
  from public.payment_intents pi
  where pi.session_id is not null
    and not exists (
      select 1 from public.dining_sessions ds where ds.id = pi.session_id
    );

  if invalid_session_fks > 0 then
    raise exception 'Preflight failed: % payment_intents reference non-existent session_id', invalid_session_fks;
  end if;

  -- 2. Check payment_intents.restaurant_id matches session's restaurant_id
  select count(*) into mismatched_session_tenants
  from public.payment_intents pi
  join public.dining_sessions ds on ds.id = pi.session_id
  where pi.session_id is not null
    and pi.restaurant_id <> ds.restaurant_id;

  if mismatched_session_tenants > 0 then
    raise exception 'Preflight failed: % payment_intents have restaurant_id mismatched with session restaurant_id', mismatched_session_tenants;
  end if;

  -- 3. Check all payment_intents.reservation_id point to existing reservations
  select count(*) into invalid_reservation_fks
  from public.payment_intents pi
  where pi.reservation_id is not null
    and not exists (
      select 1 from public.reservations r where r.id = pi.reservation_id
    );

  if invalid_reservation_fks > 0 then
    raise exception 'Preflight failed: % payment_intents reference non-existent reservation_id', invalid_reservation_fks;
  end if;

  -- 4. Check payment_intents.restaurant_id matches reservation's restaurant_id
  select count(*) into mismatched_reservation_tenants
  from public.payment_intents pi
  join public.reservations r on r.id = pi.reservation_id
  where pi.reservation_id is not null
    and pi.restaurant_id <> r.restaurant_id;

  if mismatched_reservation_tenants > 0 then
    raise exception 'Preflight failed: % payment_intents have restaurant_id mismatched with reservation restaurant_id', mismatched_reservation_tenants;
  end if;

  -- 5. Check no duplicate (restaurant_id, id) in dining_sessions
  select count(*) into duplicate_sessions
  from (
    select restaurant_id, id, count(*)
    from public.dining_sessions
    group by restaurant_id, id
    having count(*) > 1
  ) dup;

  if duplicate_sessions > 0 then
    raise exception 'Preflight failed: % duplicate (restaurant_id, id) pairs found in dining_sessions', duplicate_sessions;
  end if;

  -- 6. Check no duplicate (restaurant_id, id) in reservations
  select count(*) into duplicate_reservations
  from (
    select restaurant_id, id, count(*)
    from public.reservations
    group by restaurant_id, id
    having count(*) > 1
  ) dup;

  if duplicate_reservations > 0 then
    raise exception 'Preflight failed: % duplicate (restaurant_id, id) pairs found in reservations', duplicate_reservations;
  end if;

  raise notice 'Preflight passed: All payment_intents, dining_sessions, and reservations tenant relationships are consistent and ready for composite FK migration.';
end $$;
