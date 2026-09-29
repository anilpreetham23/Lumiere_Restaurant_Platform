-- Migration: 20260929100000_b2b_seed_staff_memberships.sql
-- Seed staff user memberships for all active restaurants in Supabase

DO $$
DECLARE
  v_rest1_id UUID := '00000000-0000-0000-0000-000000000001';
  v_rest2_id UUID := '2d708951-bb5f-4bbc-92f6-f4ac6dc7fcb3';
  v_user_record RECORD;
BEGIN
  FOR v_user_record IN 
    SELECT id, email FROM auth.users WHERE email IN (
      'owner@lumiere.com',
      'manager@lumiere.com',
      'chef@lumiere.com',
      'waiter@lumiere.com',
      'store@lumiere.com'
    )
  LOOP
    -- Assign role based on staff email
    INSERT INTO public.restaurant_memberships (restaurant_id, user_id, role, status)
    VALUES (
      v_rest1_id,
      v_user_record.id,
      CASE 
        WHEN v_user_record.email = 'owner@lumiere.com' THEN 'owner'
        WHEN v_user_record.email IN ('manager@lumiere.com', 'chef@lumiere.com', 'store@lumiere.com') THEN 'manager'
        ELSE 'staff'
      END,
      'active'
    )
    ON CONFLICT (restaurant_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role, status = 'active';

    INSERT INTO public.restaurant_memberships (restaurant_id, user_id, role, status)
    VALUES (
      v_rest2_id,
      v_user_record.id,
      CASE 
        WHEN v_user_record.email = 'owner@lumiere.com' THEN 'owner'
        WHEN v_user_record.email IN ('manager@lumiere.com', 'chef@lumiere.com', 'store@lumiere.com') THEN 'manager'
        ELSE 'staff'
      END,
      'active'
    )
    ON CONFLICT (restaurant_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role, status = 'active';
  END LOOP;
END $$;
