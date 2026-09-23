-- Preflight check for Orders Batch C1 (Staff / POS Order Creation)
-- Checks table schemas, constraints, and dependencies before applying migration.

DO $$
BEGIN
  -- 1. Check required tables exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'restaurant_tables') THEN
    RAISE EXCEPTION 'Preflight failed: public.restaurant_tables table does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dining_sessions') THEN
    RAISE EXCEPTION 'Preflight failed: public.dining_sessions table does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_orders') THEN
    RAISE EXCEPTION 'Preflight failed: public.session_orders table does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'menu_items') THEN
    RAISE EXCEPTION 'Preflight failed: public.menu_items table does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'restaurant_memberships') THEN
    RAISE EXCEPTION 'Preflight failed: public.restaurant_memberships table does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'restaurant_order_counters') THEN
    RAISE EXCEPTION 'Preflight failed: public.restaurant_order_counters table does not exist (Batch A dependency)';
  END IF;

  -- 2. Check required columns on session_orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'session_orders' AND column_name = 'order_number'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: session_orders.order_number column missing (Batch A dependency)';
  END IF;

  RAISE NOTICE 'Preflight checks for Orders Batch C1 passed successfully.';
END $$;
