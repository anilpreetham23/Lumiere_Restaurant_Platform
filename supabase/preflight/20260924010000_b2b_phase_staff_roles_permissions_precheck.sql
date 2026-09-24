-- Pre-check script for Phase Staff & Roles/Permissions Migration
DO $$
BEGIN
  -- Verify core tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'restaurant_memberships') THEN
    RAISE EXCEPTION 'Pre-check failed: Table public.restaurant_memberships does not exist.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'restaurants') THEN
    RAISE EXCEPTION 'Pre-check failed: Table public.restaurants does not exist.';
  END IF;

  RAISE NOTICE 'Pre-check passed for Phase Staff & Roles/Permissions Migration.';
END $$;
