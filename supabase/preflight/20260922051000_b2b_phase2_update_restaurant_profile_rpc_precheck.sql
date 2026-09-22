begin;

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'restaurants'
  ) then
    raise exception 'PRECHECK FAILED: public.restaurants table missing';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'restaurant_settings'
  ) then
    raise exception 'PRECHECK FAILED: public.restaurant_settings table missing';
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'has_restaurant_role'
  ) then
    raise exception 'PRECHECK FAILED: public.has_restaurant_role function missing';
  end if;

  raise notice 'PRECHECK PASSED: Ready for Phase 2.1C-B update_restaurant_profile RPC migration';
end $$;

rollback;
