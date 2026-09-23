-- Preflight verification for Suppliers & Purchasing Module
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('suppliers', 'restaurant_po_counters', 'purchase_orders', 'purchase_order_items');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'stock_movements'
  AND column_name = 'po_id';

SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('suppliers', 'restaurant_po_counters', 'purchase_orders', 'purchase_order_items');

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('purchase_orders', 'purchase_order_items');

SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'receive_purchase_order_stock';
