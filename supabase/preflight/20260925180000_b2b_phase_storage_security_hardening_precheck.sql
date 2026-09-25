-- Preflight Check: Verify Storage RLS Hardening Policies
SELECT 
  policyname, 
  cmd, 
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%Restaurant%';
