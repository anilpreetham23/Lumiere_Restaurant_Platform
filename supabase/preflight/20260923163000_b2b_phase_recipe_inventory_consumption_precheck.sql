-- Preflight verification for Recipe-Based Inventory Consumption
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'session_orders'
  AND column_name IN ('inventory_consumed_at', 'inventory_consumption_status', 'inventory_consumption_notes');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'stock_movements'
  AND column_name = 'order_id';

SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'consume_order_inventory';
