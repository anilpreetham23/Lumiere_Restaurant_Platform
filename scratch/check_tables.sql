select id, label, section, state, restaurant_id 
from public.restaurant_tables 
where restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid;
