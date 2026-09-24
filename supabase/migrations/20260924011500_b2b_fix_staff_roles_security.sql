-- ============================================================================
-- Lumière B2B — Staff Management Security Fix Migration
-- Migration: 20260924011500_b2b_fix_staff_roles_security.sql
-- ============================================================================

-- 1. Drop outdated un-scoped RPC signatures if present
DROP FUNCTION IF EXISTS public.update_staff_membership_role_atomic(uuid, text);
DROP FUNCTION IF EXISTS public.toggle_staff_membership_status_atomic(uuid, text);

-- 2. Scoped RPC: update_staff_membership_role_atomic
CREATE OR REPLACE FUNCTION public.update_staff_membership_role_atomic(
  p_restaurant_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_caller_mem restaurant_memberships%ROWTYPE;
  v_target_mem restaurant_memberships%ROWTYPE;
  v_active_owners int;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_new_role NOT IN ('owner', 'manager', 'staff') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- Prevent self-role modification
  IF v_caller = p_target_user_id THEN
    RAISE EXCEPTION 'Members cannot modify their own role';
  END IF;

  -- Get target membership scoped to specified restaurant
  SELECT * INTO v_target_mem
  FROM public.restaurant_memberships
  WHERE restaurant_id = p_restaurant_id AND user_id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target staff membership not found in specified restaurant';
  END IF;

  -- Get caller membership in specified restaurant
  SELECT * INTO v_caller_mem
  FROM public.restaurant_memberships
  WHERE restaurant_id = p_restaurant_id AND user_id = v_caller AND status = 'active';

  IF NOT FOUND OR v_caller_mem.role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Caller lacks owner or manager authorization in target restaurant';
  END IF;

  -- Owner privilege checks: only owner can grant or revoke owner role
  IF (v_target_mem.role = 'owner' OR p_new_role = 'owner') AND v_caller_mem.role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can grant or revoke owner permissions';
  END IF;

  -- Last owner protection: cannot demote the last active owner
  IF v_target_mem.role = 'owner' AND p_new_role <> 'owner' THEN
    SELECT count(*) INTO v_active_owners
    FROM public.restaurant_memberships
    WHERE restaurant_id = p_restaurant_id AND role = 'owner' AND status = 'active';

    IF v_active_owners <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last active owner of the restaurant';
    END IF;
  END IF;

  -- Update role
  UPDATE public.restaurant_memberships
  SET role = p_new_role, updated_at = now()
  WHERE id = v_target_mem.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_staff_membership_role_atomic(uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_staff_membership_role_atomic(uuid, uuid, text) TO authenticated, service_role;

-- 3. Scoped RPC: toggle_staff_membership_status_atomic
CREATE OR REPLACE FUNCTION public.toggle_staff_membership_status_atomic(
  p_restaurant_id uuid,
  p_target_user_id uuid,
  p_new_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_caller_mem restaurant_memberships%ROWTYPE;
  v_target_mem restaurant_memberships%ROWTYPE;
  v_active_owners int;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_new_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status specified';
  END IF;

  -- Prevent self status modification
  IF v_caller = p_target_user_id THEN
    RAISE EXCEPTION 'Members cannot deactivate their own membership';
  END IF;

  -- Get target membership scoped to specified restaurant
  SELECT * INTO v_target_mem
  FROM public.restaurant_memberships
  WHERE restaurant_id = p_restaurant_id AND user_id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target staff membership not found in specified restaurant';
  END IF;

  -- Get caller membership in specified restaurant
  SELECT * INTO v_caller_mem
  FROM public.restaurant_memberships
  WHERE restaurant_id = p_restaurant_id AND user_id = v_caller AND status = 'active';

  IF NOT FOUND OR v_caller_mem.role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Caller lacks owner or manager authorization in target restaurant';
  END IF;

  -- Owner privilege check: only owner can deactivate an owner
  IF v_target_mem.role = 'owner' AND v_caller_mem.role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can deactivate an owner membership';
  END IF;

  -- Last owner protection: cannot deactivate the last active owner
  IF v_target_mem.role = 'owner' AND p_new_status = 'inactive' THEN
    SELECT count(*) INTO v_active_owners
    FROM public.restaurant_memberships
    WHERE restaurant_id = p_restaurant_id AND role = 'owner' AND status = 'active';

    IF v_active_owners <= 1 THEN
      RAISE EXCEPTION 'Cannot deactivate the last active owner of the restaurant';
    END IF;
  END IF;

  -- Update status
  UPDATE public.restaurant_memberships
  SET status = p_new_status, updated_at = now()
  WHERE id = v_target_mem.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_staff_membership_status_atomic(uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.toggle_staff_membership_status_atomic(uuid, uuid, text) TO authenticated, service_role;
