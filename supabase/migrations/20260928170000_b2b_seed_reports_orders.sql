-- ============================================================
-- LUMIÈRE B2B — SEED REALISTIC ORDERS FOR ANALYTICS & REPORTS
-- Populate orders across Today, Yesterday, This Week, This Month, and Past Month
-- ============================================================

BEGIN;

-- 1. Create dummy dining session for seed orders
INSERT INTO public.dining_sessions (id, restaurant_id, customer_name, phone, status, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Rohan Sharma', '+91 98765 43210', 'closed', '2026-09-28T12:00:00Z'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Ananya Deshmukh', '+91 98234 56789', 'closed', '2026-09-27T12:00:00Z'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'August Orders Session', '+91 99123 45678', 'closed', '2026-08-01T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert session orders
INSERT INTO public.session_orders (
  restaurant_id, session_id, order_number, source, status, notes, items, subtotal, tax, total, amount, created_at
)
VALUES
-- Today (Sept 28, 2026)
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 3001, 'dine_in', 'served', 'Customer: Rohan Sharma | Phone: +91 98765 43210', '[{"title":"Rayalaseema chicken curry","price":150,"quantity":4},{"title":"Risotto al Tartufo","price":28,"quantity":2}]'::jsonb, 656, 33, 689, 689, '2026-09-28T12:30:00Z'),
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 3002, 'swiggy', 'served', 'Customer: Ananya Deshmukh | Phone: +91 98234 56789', '[{"title":"Rayalaseema chicken curry","price":150,"quantity":5},{"title":"Tarte Tatin","price":16,"quantity":2}]'::jsonb, 782, 39, 821, 821, '2026-09-28T13:15:00Z'),
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 3003, 'zomato', 'served', 'Customer: Vikramaditya Roy | Phone: +91 99123 45678', '[{"title":"Wagyu A5 Nigiri","price":38,"quantity":3},{"title":"Rayalaseema chicken curry","price":150,"quantity":2}]'::jsonb, 414, 21, 435, 435, '2026-09-28T13:45:00Z'),
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 3004, 'dine_in', 'served', 'Customer: Priya Patel | Phone: +91 98111 22233', '[{"title":"Rayalaseema chicken curry","price":150,"quantity":3},{"title":"Matcha Opera Cake","price":18,"quantity":2}]'::jsonb, 486, 24, 510, 510, '2026-09-28T14:10:00Z'),

-- Yesterday (Sept 27, 2026)
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3005, 'dine_in', 'served', 'Customer: Siddharth Malhotra | Phone: +91 97890 12345', '[{"title":"Risotto al Tartufo","price":28,"quantity":4},{"title":"Foie Gras Poêlé","price":32,"quantity":2}]'::jsonb, 176, 9, 185, 185, '2026-09-27T18:00:00Z'),
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3006, 'takeaway', 'served', 'Customer: Lord Harrington | Phone: +44 20 7946 0912', '[{"title":"Rayalaseema chicken curry","price":150,"quantity":2},{"title":"Risotto al Tartufo","price":28,"quantity":3}]'::jsonb, 384, 19, 403, 403, '2026-09-27T19:30:00Z'),

-- This Week (Sept 22 - Sept 26, 2026)
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3007, 'dine_in', 'served', 'Customer: Elena Rostova | Phone: +44 20 7946 0888', '[{"title":"Wagyu A5 Nigiri","price":38,"quantity":4},{"title":"Matcha Opera Cake","price":18,"quantity":3}]'::jsonb, 206, 10, 216, 216, '2026-09-26T13:00:00Z'),
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3008, 'swiggy', 'served', 'Customer: Rohan Sharma | Phone: +91 98765 43210', '[{"title":"Rayalaseema chicken curry","price":150,"quantity":3},{"title":"Risotto al Tartufo","price":28,"quantity":2}]'::jsonb, 506, 25, 531, 531, '2026-09-25T19:00:00Z'),
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3009, 'zomato', 'served', 'Customer: Ananya Deshmukh | Phone: +91 98234 56789', '[{"title":"Risotto al Tartufo","price":28,"quantity":5},{"title":"Tarte Tatin","price":16,"quantity":3}]'::jsonb, 188, 9, 197, 197, '2026-09-24T20:00:00Z'),

-- Earlier This Month (Sept 02 - Sept 20, 2026)
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3010, 'dine_in', 'served', 'Customer: Vikramaditya Roy | Phone: +91 99123 45678', '[{"title":"Risotto al Tartufo","price":28,"quantity":6},{"title":"Wagyu A5 Nigiri","price":38,"quantity":4}]'::jsonb, 320, 16, 336, 336, '2026-09-18T19:30:00Z'),
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3011, 'delivery', 'served', 'Customer: Priya Patel | Phone: +91 98111 22233', '[{"title":"Rayalaseema chicken curry","price":150,"quantity":4},{"title":"Risotto al Tartufo","price":28,"quantity":4}]'::jsonb, 712, 36, 748, 748, '2026-09-15T20:15:00Z'),
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3012, 'dine_in', 'served', 'Customer: Siddharth Malhotra | Phone: +91 97890 12345', '[{"title":"Soles Meunière","price":34,"quantity":3},{"title":"Matcha Opera Cake","price":18,"quantity":2}]'::jsonb, 138, 7, 145, 145, '2026-09-12T13:30:00Z'),
('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 3013, 'takeaway', 'served', 'Customer: Lord Harrington | Phone: +44 20 7946 0912', '[{"title":"Risotto al Tartufo","price":28,"quantity":8},{"title":"Tarte Tatin","price":16,"quantity":4}]'::jsonb, 288, 14, 302, 302, '2026-09-08T19:00:00Z'),

-- Past Month (August 2026)
('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 3014, 'dine_in', 'served', 'Customer: Elena Rostova | Phone: +44 20 7946 0888', '[{"title":"Risotto al Tartufo","price":28,"quantity":10},{"title":"Rayalaseema chicken curry","price":150,"quantity":2}]'::jsonb, 580, 29, 609, 609, '2026-08-28T19:00:00Z'),
('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 3015, 'swiggy', 'served', 'Customer: Rohan Sharma | Phone: +91 98765 43210', '[{"title":"Rayalaseema chicken curry","price":150,"quantity":3},{"title":"Wagyu A5 Nigiri","price":38,"quantity":5}]'::jsonb, 640, 32, 672, 672, '2026-08-24T20:15:00Z'),
('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 3016, 'zomato', 'served', 'Customer: Ananya Deshmukh | Phone: +91 98234 56789', '[{"title":"Soles Meunière","price":34,"quantity":4},{"title":"Matcha Opera Cake","price":18,"quantity":4}]'::jsonb, 208, 10, 218, 218, '2026-08-20T13:00:00Z'),
('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 3017, 'dine_in', 'served', 'Customer: Vikramaditya Roy | Phone: +91 99123 45678', '[{"title":"Risotto al Tartufo","price":28,"quantity":7},{"title":"Foie Gras Poêlé","price":32,"quantity":3}]'::jsonb, 292, 15, 307, 307, '2026-08-15T19:45:00Z')
ON CONFLICT (restaurant_id, order_number) DO NOTHING;

COMMIT;
