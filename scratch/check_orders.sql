select id, order_number, source, status, total, created_at
from public.session_orders 
where restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid 
order by created_at desc limit 5;
