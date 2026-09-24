-- ============================================================
-- LUMIÈRE B2B — MARKETPLACE ORDERS PREFLIGHT CHECK
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'session_orders'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: public.session_orders table does not exist';
  END IF;

  RAISE NOTICE 'Preflight passed: ready for marketplace orders migration';
END $$;
