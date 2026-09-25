-- ============================================================================
-- Lumière B2B — Employee Records Foundation Preflight Check
-- Preflight: 20260925100000_b2b_phase_employee_records_precheck.sql
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Preflight Check: Validating database state before creating public.employee_records...';

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'restaurants') THEN
    RAISE EXCEPTION 'Preflight Failure: public.restaurants table does not exist.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'restaurant_memberships') THEN
    RAISE EXCEPTION 'Preflight Failure: public.restaurant_memberships table does not exist.';
  END IF;

  RAISE NOTICE 'Preflight Success: All dependent tables (restaurants, restaurant_memberships) exist.';
END $$;
