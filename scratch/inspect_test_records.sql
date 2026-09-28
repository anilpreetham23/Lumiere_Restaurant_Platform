SELECT 'restaurant_memberships' as tbl, count(*) FROM public.restaurant_memberships WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'restaurant_settings', count(*) FROM public.restaurant_settings WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'restaurant_branding', count(*) FROM public.restaurant_branding WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'staff_members', count(*) FROM public.staff_members WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'employee_records', count(*) FROM public.employee_records WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'staff_invitations', count(*) FROM public.staff_invitations WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'restaurant_tables', count(*) FROM public.restaurant_tables WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'table_sessions', count(*) FROM public.table_sessions WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'session_orders', count(*) FROM public.session_orders WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'menu_categories', count(*) FROM public.menu_categories WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'menu_items', count(*) FROM public.menu_items WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'menu_recipes', count(*) FROM public.menu_recipes WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'inventory_items', count(*) FROM public.inventory_items WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'inventory_audit_log', count(*) FROM public.inventory_audit_log WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'suppliers', count(*) FROM public.suppliers WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'purchase_orders', count(*) FROM public.purchase_orders WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'reservations', count(*) FROM public.reservations WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'session_payments', count(*) FROM public.session_payments WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'session_refunds', count(*) FROM public.session_refunds WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'customers', count(*) FROM public.customers WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'customer_reviews', count(*) FROM public.customer_reviews WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'service_requests', count(*) FROM public.service_requests WHERE restaurant_id <> '00000000-0000-0000-0000-000000000001';
