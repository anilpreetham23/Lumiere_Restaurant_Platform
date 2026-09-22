-- Phase 2.1B Read-Only Remote Preflight Audit
-- Target: Lumiere (apmwlxbdhfjbrdymvfsp)
-- Migration: 20260922041030_b2b_phase2_atomic_provisioning.sql

do $$
declare
  v_table text;
  v_count bigint;
  v_unique_slug boolean;
  v_default_rest uuid;
begin
  raise notice '=== LUMIERE B2B PHASE 2.1B PREFLIGHT CHECK ===';

  -- A. Verify restaurants.slug UNIQUE constraint exists
  select exists (
    select 1
    from pg_constraint
    where conrelid = 'public.restaurants'::regclass
      and contype = 'u'
      and conname like '%slug%'
  ) into v_unique_slug;

  if not v_unique_slug then
    raise exception 'PREFLIGHT FAILED: UNIQUE constraint on restaurants.slug is missing!';
  end if;
  raise notice '[PASS] UNIQUE constraint on restaurants.slug verified.';

  -- B. Verify required provisioning tables exist
  foreach v_table in array array['restaurants', 'restaurant_memberships', 'restaurant_settings', 'restaurant_branding'] loop
    if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = v_table) then
      raise exception 'PREFLIGHT FAILED: Table public.% is missing!', v_table;
    end if;
  end loop;
  raise notice '[PASS] Required provisioning tables exist.';

  -- C. Verify required columns exist
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'restaurants' and column_name = 'slug') then
    raise exception 'PREFLIGHT FAILED: Column restaurants.slug is missing!';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'restaurant_memberships' and column_name = 'role') then
    raise exception 'PREFLIGHT FAILED: Column restaurant_memberships.role is missing!';
  end if;
  raise notice '[PASS] Required columns verified.';

  -- D. Check existing function signature
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.proname = 'create_restaurant_with_owner'
  ) then
    raise notice '[INFO] create_restaurant_with_owner function already exists and will be updated.';
  else
    raise notice '[PASS] create_restaurant_with_owner function signature is clean.';
  end if;

  -- E. Verify RLS policies on target tables
  foreach v_table in array array['restaurants', 'restaurant_memberships', 'restaurant_settings', 'restaurant_branding'] loop
    if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = v_table and rowsecurity = true) then
      raise exception 'PREFLIGHT FAILED: RLS is disabled on public.%!', v_table;
    end if;
  end loop;
  raise notice '[PASS] RLS is active on all provisioning target tables.';

  -- F. Verify Tenant A baseline health
  select public.default_restaurant_id() into v_default_rest;
  if v_default_rest is null then
    raise exception 'PREFLIGHT FAILED: Default Lumiere restaurant is missing!';
  end if;
  raise notice '[PASS] Tenant A default restaurant resolved: %', v_default_rest;

  -- G - J. Record baseline counts
  select count(*) into v_count from public.restaurants;
  raise notice '[BASELINE] restaurants count: %', v_count;

  select count(*) into v_count from public.restaurant_memberships;
  raise notice '[BASELINE] restaurant_memberships count: %', v_count;

  select count(*) into v_count from public.restaurant_settings;
  raise notice '[BASELINE] restaurant_settings count: %', v_count;

  select count(*) into v_count from public.restaurant_branding;
  raise notice '[BASELINE] restaurant_branding count: %', v_count;

  raise notice '=== PREFLIGHT CHECK COMPLETE — ALL SYSTEMS READY ===';
end $$;
