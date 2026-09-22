begin;

create or replace function public.create_restaurant_with_owner(
  p_name text,
  p_slug text,
  p_phone text default null,
  p_email text default null,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_restaurant_id uuid;
  v_clean_name text;
  v_clean_slug text;
begin
  -- 1. Identify authenticated caller server-side
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Normalize and validate restaurant name
  v_clean_name := trim(p_name);
  if v_clean_name is null or v_clean_name = '' then
    raise exception 'Restaurant name is required';
  end if;

  -- 3. Normalize and validate restaurant slug
  v_clean_slug := lower(trim(p_slug));
  if v_clean_slug is null or v_clean_slug = '' then
    raise exception 'Restaurant slug is required';
  end if;

  if length(v_clean_slug) < 3 or length(v_clean_slug) > 50 then
    raise exception 'Restaurant slug must be between 3 and 50 characters';
  end if;

  if v_clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid slug format. Use lowercase letters, numbers, and hyphens';
  end if;

  if v_clean_slug in ('admin', 'api', 'system', 'auth', 'public', 'lumiere') then
    raise exception 'Restaurant slug "%" is reserved', v_clean_slug;
  end if;

  if exists (select 1 from public.restaurants where slug = v_clean_slug) then
    raise exception 'Restaurant slug "%" is already taken', v_clean_slug;
  end if;

  -- 4. Generate UUID and insert into restaurants
  v_restaurant_id := gen_random_uuid();
  insert into public.restaurants (
    id, name, slug, status, phone, email, address
  ) values (
    v_restaurant_id,
    v_clean_name,
    v_clean_slug,
    'active',
    nullif(trim(p_phone), ''),
    nullif(trim(p_email), ''),
    nullif(trim(p_address), '')
  );

  -- 5. Create owner membership for authenticated caller
  insert into public.restaurant_memberships (
    restaurant_id, user_id, role
  ) values (
    v_restaurant_id,
    v_user_id,
    'owner'
  );

  -- 6. Create default restaurant_settings
  insert into public.restaurant_settings (
    restaurant_id, restaurant_name, tagline, phone, email, address,
    hours, currency, deposit_amount, service_charge_pct, payment_gateway, accepting_orders
  ) values (
    v_restaurant_id,
    v_clean_name,
    'International Fine Dining',
    coalesce(nullif(trim(p_phone), ''), ''),
    coalesce(nullif(trim(p_email), ''), ''),
    coalesce(nullif(trim(p_address), ''), ''),
    'Mon-Sun: 11:00 AM - 11:00 PM',
    'INR',
    500,
    0,
    'razorpay',
    true
  );

  -- 7. Create default restaurant_branding
  insert into public.restaurant_branding (
    restaurant_id, primary_color, secondary_color, accent_color, background_color, assets
  ) values (
    v_restaurant_id,
    '#7a2e35',
    '#16130f',
    '#c9a45c',
    '#f6f0e7',
    '{}'::jsonb
  );

  -- 8. Return new restaurant ID
  return v_restaurant_id;
end $$;

-- Explicit privilege configuration
revoke all on function public.create_restaurant_with_owner(text, text, text, text, text) from public, anon;
grant execute on function public.create_restaurant_with_owner(text, text, text, text, text) to authenticated;

commit;
