SELECT 'restaurants_count' as metric, count(*)::text as val FROM public.restaurants
UNION ALL SELECT 'restaurants_detail', id || ' | ' || name || ' | ' || slug FROM public.restaurants
UNION ALL SELECT 'lumiere_memberships_count', count(*)::text FROM public.restaurant_memberships WHERE restaurant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'test_memberships_count', count(*)::text FROM public.restaurant_memberships WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'lumiere_settings_count', count(*)::text FROM public.restaurant_settings WHERE restaurant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'lumiere_branding_count', count(*)::text FROM public.restaurant_branding WHERE restaurant_id = '00000000-0000-0000-0000-000000000001';
