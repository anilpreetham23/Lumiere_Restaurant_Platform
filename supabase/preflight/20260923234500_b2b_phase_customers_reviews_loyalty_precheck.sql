-- Preflight validation for Customers, Reviews & Loyalty Module
do $$
begin
  -- Verify core required tables exist
  if not exists (select 1 from information_schema.tables where table_name = 'restaurants') then
    raise exception 'PRECHECK FAILED: public.restaurants table does not exist';
  end if;

  if not exists (select 1 from information_schema.tables where table_name = 'customers') then
    raise exception 'PRECHECK FAILED: public.customers table does not exist';
  end if;

  if not exists (select 1 from information_schema.tables where table_name = 'dish_ratings') then
    raise exception 'PRECHECK FAILED: public.dish_ratings table does not exist';
  end if;

  if not exists (select 1 from information_schema.tables where table_name = 'session_orders') then
    raise exception 'PRECHECK FAILED: public.session_orders table does not exist';
  end if;

  raise notice 'PRECHECK PASSED: Customers, Reviews & Loyalty prerequisites satisfied.';
end $$;
