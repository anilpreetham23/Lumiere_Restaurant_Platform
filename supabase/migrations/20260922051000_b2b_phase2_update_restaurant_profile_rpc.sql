begin;

-- Phase 2.1C-B: Create atomic restaurant profile update RPC function
create or replace function public.update_restaurant_profile(
  p_restaurant_id uuid,
  p_name text,
  p_logo text default null,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_city text default null,
  p_state text default null,
  p_country text default null,
  p_postal_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_name text;
begin
  -- 1. Authorization check: caller must be member with owner or manager role
  if not public.has_restaurant_role(p_restaurant_id, array['owner', 'manager']) then
    raise exception 'Insufficient permissions';
  end if;

  -- 2. Validate required name
  v_clean_name := trim(p_name);
  if v_clean_name is null or v_clean_name = '' then
    raise exception 'Restaurant name is required';
  end if;

  -- 3. Update public.restaurants
  update public.restaurants
  set name = v_clean_name,
      logo = nullif(trim(p_logo), ''),
      phone = nullif(trim(p_phone), ''),
      email = nullif(trim(p_email), ''),
      address = nullif(trim(p_address), ''),
      city = nullif(trim(p_city), ''),
      state = nullif(trim(p_state), ''),
      country = nullif(trim(p_country), ''),
      postal_code = nullif(trim(p_postal_code), ''),
      updated_at = now()
  where id = p_restaurant_id;

  -- 4. Update public.restaurant_settings (synchronize duplicated fields)
  update public.restaurant_settings
  set restaurant_name = v_clean_name,
      phone = coalesce(nullif(trim(p_phone), ''), ''),
      email = coalesce(nullif(trim(p_email), ''), ''),
      address = coalesce(nullif(trim(p_address), ''), ''),
      updated_at = now()
  where restaurant_id = p_restaurant_id;
end $$;

-- Explicit privilege configuration
revoke all on function public.update_restaurant_profile(uuid, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.update_restaurant_profile(uuid, text, text, text, text, text, text, text, text, text) to authenticated;

commit;
