-- Preflight precheck for 20260922160000_b2b_phase2_inventory_foundation
do $$
begin
  -- Precheck: Ensure public.restaurants and is_restaurant_member exist
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'restaurants') then
    raise exception 'Preflight failed: public.restaurants table missing';
  end if;

  if not exists (select 1 from pg_proc where proname = 'is_restaurant_member') then
    raise exception 'Preflight failed: is_restaurant_member function missing';
  end if;

  raise notice 'Preflight check for inventory foundation passed successfully.';
end $$;
