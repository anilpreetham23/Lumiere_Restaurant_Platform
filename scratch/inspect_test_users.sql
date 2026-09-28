SELECT DISTINCT rm.user_id, u.email, rm.restaurant_id
FROM public.restaurant_memberships rm
LEFT JOIN auth.users u ON u.id = rm.user_id
WHERE rm.restaurant_id <> '00000000-0000-0000-0000-000000000001';
