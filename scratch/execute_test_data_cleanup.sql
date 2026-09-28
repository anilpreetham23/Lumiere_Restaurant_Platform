BEGIN;

-- Safety assertion: Ensure canonical Lumiere restaurant exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid AND slug = 'lumiere'
  ) THEN
    RAISE EXCEPTION 'Safety check failed: Canonical Lumiere tenant missing!';
  END IF;
END $$;

-- 1. Delete dependent records strictly excluding canonical Lumiere tenant
DELETE FROM public.restaurant_memberships WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.restaurant_settings WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.restaurant_branding WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.employee_records WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.staff_invitations WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.restaurant_tables WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.dining_sessions WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.session_orders WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.orders WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.menu_items WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.inventory_items WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.suppliers WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.purchase_orders WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.reservations WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.payments WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.customers WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
DELETE FROM public.service_requests WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';

-- 2. Delete non-Lumiere test restaurants
DELETE FROM public.restaurants WHERE id <> '00000000-0000-0000-0000-000000000001';

-- 3. Safely remove temporary test auth user created unambiguously by integration script
DELETE FROM auth.users WHERE email LIKE 'b2b_owner_%@lumiere.test';

COMMIT;
