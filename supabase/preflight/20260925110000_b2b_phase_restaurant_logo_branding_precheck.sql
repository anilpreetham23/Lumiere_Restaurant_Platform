-- Preflight check for logo_url and background_logo columns on public.restaurant_branding

DO $$
DECLARE
  v_col_count integer;
BEGIN
  SELECT count(*)
  INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'restaurant_branding'
    AND column_name IN ('logo_url', 'background_logo_enabled', 'background_logo_opacity', 'banner_url', 'font_family');

  IF v_col_count < 5 THEN
    RAISE EXCEPTION '[PRECHECK FAILED] restaurant_branding table missing required logo/branding columns. Found % of 5.', v_col_count;
  ELSE
    RAISE NOTICE '[PRECHECK PASSED] restaurant_branding logo columns verified successfully (% columns present).', v_col_count;
  END IF;
END $$;
