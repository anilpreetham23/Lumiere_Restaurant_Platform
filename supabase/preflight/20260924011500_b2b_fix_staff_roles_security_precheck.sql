-- Pre-check script for Staff Roles Security Fix
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'restaurant_memberships') THEN
    RAISE EXCEPTION 'Pre-check failed: Table public.restaurant_memberships does not exist.';
  END IF;

  RAISE NOTICE 'Pre-check passed for Staff Roles Security Fix.';
END $$;
