-- ============================================================
-- PREFLIGHT VERIFICATION FOR 20260922120000_b2b_phase2_operations_enhancements.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_tables' AND column_name = 'pos_x'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: pos_x column missing from restaurant_tables';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_tables' AND column_name = 'section'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: section column missing from restaurant_tables';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_orders' AND column_name = 'started_at'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: started_at column missing from session_orders';
  END IF;

  RAISE NOTICE 'Precheck passed for 20260922120000_b2b_phase2_operations_enhancements.sql';
END $$;
