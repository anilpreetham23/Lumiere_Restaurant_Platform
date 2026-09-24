-- ============================================================================
-- Lumière B2B — Staff Management & Roles/Permissions Migration
-- Migration: 20260924010000_b2b_phase_staff_roles_permissions.sql
-- ============================================================================

-- 1. Add status to restaurant_memberships if not already present
ALTER TABLE public.restaurant_memberships
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_restaurant_memberships_status
  ON public.restaurant_memberships(status);

-- 2. Staff Invitations table
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_restaurant
  ON public.staff_invitations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token
  ON public.staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email
  ON public.staff_invitations(email);

-- 3. Row Level Security for staff_invitations
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manager_read_invitations" ON public.staff_invitations;
CREATE POLICY "owner_manager_read_invitations" ON public.staff_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = staff_invitations.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
        AND rm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "owner_manager_insert_invitations" ON public.staff_invitations;
CREATE POLICY "owner_manager_insert_invitations" ON public.staff_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = staff_invitations.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
        AND rm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "owner_manager_update_invitations" ON public.staff_invitations;
CREATE POLICY "owner_manager_update_invitations" ON public.staff_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = staff_invitations.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
        AND rm.status = 'active'
    )
  );

-- 4. RPC: accept_staff_invitation_atomic
CREATE OR REPLACE FUNCTION public.accept_staff_invitation_atomic(
  p_token text,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_inv staff_invitations%ROWTYPE;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Authentication context mismatch';
  END IF;

  SELECT * INTO v_inv
  FROM public.staff_invitations
  WHERE token = p_token AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.staff_invitations SET status = 'expired', updated_at = now() WHERE id = v_inv.id;
    RAISE EXCEPTION 'Invitation token has expired';
  END IF;

  -- Add or activate membership
  INSERT INTO public.restaurant_memberships (restaurant_id, user_id, role, status)
  VALUES (v_inv.restaurant_id, p_user_id, v_inv.role, 'active')
  ON CONFLICT (restaurant_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now();

  -- Mark invitation as accepted
  UPDATE public.staff_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_inv.id;

  RETURN v_inv.restaurant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_staff_invitation_atomic(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation_atomic(text, uuid) TO authenticated, service_role;

-- 5. RPC: update_staff_membership_role_atomic
CREATE OR REPLACE FUNCTION public.update_staff_membership_role_atomic(
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

  -- Get target membership
  SELECT * INTO v_target_mem
  FROM public.restaurant_memberships
  WHERE user_id = p_target_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target staff membership not found';
  END IF;

  -- Get caller membership in target restaurant
  SELECT * INTO v_caller_mem
  FROM public.restaurant_memberships
  WHERE restaurant_id = v_target_mem.restaurant_id AND user_id = v_caller AND status = 'active';

  IF NOT FOUND OR v_caller_mem.role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Caller lacks authorization in target restaurant';
  END IF;

  -- Owner privilege checks
  IF (v_target_mem.role = 'owner' OR p_new_role = 'owner') AND v_caller_mem.role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can grant or revoke owner permissions';
  END IF;

  -- Last owner protection
  IF v_target_mem.role = 'owner' AND p_new_role <> 'owner' THEN
    SELECT count(*) INTO v_active_owners
    FROM public.restaurant_memberships
    WHERE restaurant_id = v_target_mem.restaurant_id AND role = 'owner' AND status = 'active';

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

REVOKE ALL ON FUNCTION public.update_staff_membership_role_atomic(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_staff_membership_role_atomic(uuid, text) TO authenticated, service_role;

-- 6. RPC: toggle_staff_membership_status_atomic
CREATE OR REPLACE FUNCTION public.toggle_staff_membership_status_atomic(
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

  -- Get target membership
  SELECT * INTO v_target_mem
  FROM public.restaurant_memberships
  WHERE user_id = p_target_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target staff membership not found';
  END IF;

  -- Get caller membership in target restaurant
  SELECT * INTO v_caller_mem
  FROM public.restaurant_memberships
  WHERE restaurant_id = v_target_mem.restaurant_id AND user_id = v_caller AND status = 'active';

  IF NOT FOUND OR v_caller_mem.role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Caller lacks authorization in target restaurant';
  END IF;

  -- Owner privilege check
  IF v_target_mem.role = 'owner' AND v_caller_mem.role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can deactivate an owner membership';
  END IF;

  -- Last owner protection
  IF v_target_mem.role = 'owner' AND p_new_status = 'inactive' THEN
    SELECT count(*) INTO v_active_owners
    FROM public.restaurant_memberships
    WHERE restaurant_id = v_target_mem.restaurant_id AND role = 'owner' AND status = 'active';

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

REVOKE ALL ON FUNCTION public.toggle_staff_membership_status_atomic(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.toggle_staff_membership_status_atomic(uuid, text) TO authenticated, service_role;
