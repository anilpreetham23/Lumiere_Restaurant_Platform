-- ============================================================
-- PREFLIGHT VERIFICATION FOR 20260923093500_b2b_phase_orders_core_foundation.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'restaurant_order_counters'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: restaurant_order_counters table missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_orders' AND column_name = 'order_number'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: order_number column missing from session_orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_orders' AND column_name = 'source'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: source column missing from session_orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_orders' AND column_name = 'subtotal'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: subtotal column missing from session_orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_orders' AND column_name = 'cancellation_reason'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: cancellation_reason column missing from session_orders';
  END IF;

  RAISE NOTICE 'Precheck passed for 20260923093500_b2b_phase_orders_core_foundation.sql';
END $$;
