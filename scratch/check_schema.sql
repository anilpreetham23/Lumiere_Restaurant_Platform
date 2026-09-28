select column_name, is_nullable, data_type 
from information_schema.columns 
where table_name = 'session_orders' and column_name in ('session_id', 'restaurant_id', 'order_number');
