-- Migration: Harden restaurant-assets Storage RLS Policies
-- Logo assets ({restaurant_id}/logo/*) -> OWNER ONLY
-- Menu assets ({restaurant_id}/menu/*) -> OWNER and MANAGER

-- 1. Drop existing generic write policies on storage.objects for restaurant-assets
DROP POLICY IF EXISTS "Tenant Owner/Manager Insert Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner/Manager Update Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner/Manager Delete Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner Insert Restaurant Logo Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner Update Restaurant Logo Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner Delete Restaurant Logo Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner/Manager Insert Restaurant Menu Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner/Manager Update Restaurant Menu Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner/Manager Delete Restaurant Menu Assets" ON storage.objects;

-- 2. Ensure Public SELECT policy remains intact
DROP POLICY IF EXISTS "Public Read Restaurant Assets" ON storage.objects;
CREATE POLICY "Public Read Restaurant Assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'restaurant-assets');

-- ----------------------------------------------------
-- LOGO ASSETS: {restaurant_id}/logo/* (OWNER ONLY)
-- ----------------------------------------------------

-- Logo INSERT
CREATE POLICY "Tenant Owner Insert Restaurant Logo Assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[2] = 'logo' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role = 'owner'
  )
);

-- Logo UPDATE
CREATE POLICY "Tenant Owner Update Restaurant Logo Assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[2] = 'logo' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role = 'owner'
  )
);

-- Logo DELETE
CREATE POLICY "Tenant Owner Delete Restaurant Logo Assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[2] = 'logo' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role = 'owner'
  )
);

-- ----------------------------------------------------
-- MENU ASSETS: {restaurant_id}/menu/* (OWNER + MANAGER)
-- ----------------------------------------------------

-- Menu INSERT
CREATE POLICY "Tenant Owner/Manager Insert Restaurant Menu Assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[2] = 'menu' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role IN ('owner', 'manager')
  )
);

-- Menu UPDATE
CREATE POLICY "Tenant Owner/Manager Update Restaurant Menu Assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[2] = 'menu' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role IN ('owner', 'manager')
  )
);

-- Menu DELETE
CREATE POLICY "Tenant Owner/Manager Delete Restaurant Menu Assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[2] = 'menu' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role IN ('owner', 'manager')
  )
);
