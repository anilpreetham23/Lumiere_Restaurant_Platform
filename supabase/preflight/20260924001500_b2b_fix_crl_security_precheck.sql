-- Preflight validation for Customers, Reviews & Loyalty Security Fixes
do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'loyalty_accounts') then
    raise exception 'PRECHECK FAILED: public.loyalty_accounts table does not exist';
  end if;

  if not exists (select 1 from information_schema.tables where table_name = 'loyalty_transactions') then
    raise exception 'PRECHECK FAILED: public.loyalty_transactions table does not exist';
  end if;

  if not exists (select 1 from information_schema.tables where table_name = 'dish_ratings') then
    raise exception 'PRECHECK FAILED: public.dish_ratings table does not exist';
  end if;

  raise notice 'PRECHECK PASSED: CRL security fix prerequisites satisfied.';
end $$;
