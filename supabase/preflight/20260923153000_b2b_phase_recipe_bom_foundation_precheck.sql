-- Preflight verification for Recipe / BOM Foundation
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('recipe_headers', 'recipe_ingredients');

SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('recipe_headers', 'recipe_ingredients');

SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('recipe_headers', 'recipe_ingredients');

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('recipe_headers', 'recipe_ingredients');
