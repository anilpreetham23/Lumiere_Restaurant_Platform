-- Preflight check for Inventory Consumption Audit Security Fix
do $$
declare
  v_func_exists boolean;
begin
  select exists (
    select 1 from information_schema.routines
    where routine_schema = 'public'
      and routine_name = 'consume_order_inventory'
  ) into v_func_exists;

  if not v_func_exists then
    raise exception 'Preflight failed: consume_order_inventory function does not exist.';
  end if;

  raise notice 'Preflight passed: consume_order_inventory function is present and ready for audit security update.';
end $$;
