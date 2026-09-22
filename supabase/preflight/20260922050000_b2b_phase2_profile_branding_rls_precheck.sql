begin;

do $$
declare
  v_count int;
begin
  -- 1. Verify public.restaurants exists
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'restaurants'
  ) then
    raise exception 'PRECHECK FAILED: public.restaurants table does not exist';
  end if;

  -- 2. Verify RLS is enabled on public.restaurants
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'restaurants' and rowsecurity = true
  ) then
    raise exception 'PRECHECK FAILED: RLS is not enabled on public.restaurants';
  end if;

  -- 3. Verify member read restaurants SELECT policy exists
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restaurants' and policyname = 'member read restaurants'
  ) then
    raise exception 'PRECHECK FAILED: member read restaurants SELECT policy is missing';
  end if;

  -- 4. Verify member manage restaurants does NOT exist before migration
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restaurants' and policyname = 'member manage restaurants'
  ) then
    raise exception 'PRECHECK FAILED: member manage restaurants policy already exists';
  end if;

  -- 5. Verify no authenticated INSERT policy exists on public.restaurants
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restaurants' and cmd = 'INSERT' and 'authenticated' = any(roles)
  ) then
    raise exception 'PRECHECK FAILED: Unexpected INSERT policy found on public.restaurants';
  end if;

  -- 6. Verify no authenticated DELETE policy exists on public.restaurants
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restaurants' and cmd = 'DELETE' and 'authenticated' = any(roles)
  ) then
    raise exception 'PRECHECK FAILED: Unexpected DELETE policy found on public.restaurants';
  end if;

  -- 7. Verify public.has_restaurant_role function exists
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'has_restaurant_role'
  ) then
    raise exception 'PRECHECK FAILED: public.has_restaurant_role function does not exist';
  end if;

  -- 8. Verify Lumiere tenant exists
  if not exists (
    select 1 from public.restaurants
    where id = '00000000-0000-0000-0000-000000000001'::uuid and slug = 'lumiere'
  ) then
    raise exception 'PRECHECK FAILED: Lumiere production tenant not found';
  end if;

  -- 9. Verify production owner membership exists
  if not exists (
    select 1 from public.restaurant_memberships
    where restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid and role = 'owner'
  ) then
    raise exception 'PRECHECK FAILED: Production owner membership not found';
  end if;

  raise notice 'PRECHECK PASSED: Ready for Phase 2.1C-A RLS migration';
end $$;

rollback;
