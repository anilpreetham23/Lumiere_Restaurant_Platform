-- Migration: Create restaurant-assets storage bucket and RLS policies

-- 1. Create the public storage bucket for restaurant assets (logos, menu images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-assets',
  'restaurant-assets',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Drop existing RLS policies on storage.objects for restaurant-assets if any
DROP POLICY IF EXISTS "Public Read Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner/Manager Insert Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner/Manager Update Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Owner/Manager Delete Restaurant Assets" ON storage.objects;

-- 3. Public SELECT policy: Anyone can view public restaurant logos & menu images
CREATE POLICY "Public Read Restaurant Assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'restaurant-assets');

-- 4. Authenticated INSERT policy: Active owner/manager can upload only to their restaurant's path {restaurant_id}/*
CREATE POLICY "Tenant Owner/Manager Insert Restaurant Assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-assets' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role IN ('owner', 'manager')
  )
);

-- 5. Authenticated UPDATE policy
CREATE POLICY "Tenant Owner/Manager Update Restaurant Assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-assets' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role IN ('owner', 'manager')
  )
);

-- 6. Authenticated DELETE policy
CREATE POLICY "Tenant Owner/Manager Delete Restaurant Assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-assets' AND
  EXISTS (
    SELECT 1 FROM public.restaurant_memberships rm
    WHERE rm.user_id = auth.uid()
      AND rm.restaurant_id::text = (storage.foldername(name))[1]
      AND rm.status = 'active'
      AND rm.role IN ('owner', 'manager')
  )
);
