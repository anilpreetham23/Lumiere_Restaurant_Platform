-- READ-ONLY preflight for the inspected legacy Lumiere database.
-- This file must be reviewed/executed separately before the migration.
-- It performs catalog reads only and contains no DDL or DML.

do $$
declare
  missing text;
  pk_columns text;
  object_name text;
begin
  foreach object_name in array array[
    'customers', 'payments', 'restaurant_tables', 'dining_sessions',
    'reservations', 'menu_items'
  ] loop
    if to_regclass('public.' || object_name) is null then
      raise exception 'Preflight failed: required table public.% is missing', object_name;
    end if;
  end loop;

  select string_agg(kcu.column_name, ',' order by kcu.ordinal_position)
    into pk_columns
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_schema = tc.constraint_schema
   and kcu.constraint_name = tc.constraint_name
   and kcu.table_name = tc.table_name
  where tc.table_schema = 'public'
    and tc.table_name = 'customers'
    and tc.constraint_type = 'PRIMARY KEY';

  if pk_columns is distinct from 'phone' then
    raise exception 'Preflight failed: public.customers primary key must be phone, found %', coalesce(pk_columns, '<none>');
  end if;

  select string_agg(column_name, ',' order by column_name)
    into missing
  from (
    values
      ('customers', 'birthday'),
      ('customers', 'last_visit'),
      ('payments', 'session_id'),
      ('payments', 'reservation_id'),
      ('payments', 'provider'),
      ('payments', 'amount'),
      ('payments', 'currency'),
      ('payments', 'stripe_payment_intent'),
      ('payments', 'status'),
      ('payments', 'receipt_code'),
      ('restaurant_tables', 'id'),
      ('restaurant_tables', 'token'),
      ('dining_sessions', 'table_id'),
      ('reservations', 'id'),
      ('menu_items', 'id')
  ) required(table_name, column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = required.table_name
      and c.column_name = required.column_name
  );

  if missing is not null then
    raise exception 'Preflight failed: missing required legacy columns: %', missing;
  end if;

  foreach object_name in array array[
    'restaurants', 'restaurant_memberships', 'restaurant_branding',
    'restaurant_settings', 'payment_intents', 'payment_refunds',
    'webhook_events'
  ] loop
    if to_regclass('public.' || object_name) is not null then
      raise exception 'Preflight requires manual review: migration target public.% already exists', object_name;
    end if;
  end loop;

  raise notice 'Preflight passed: legacy tables and columns match the inspected migration prerequisites; B2B target tables are absent.';
end $$;