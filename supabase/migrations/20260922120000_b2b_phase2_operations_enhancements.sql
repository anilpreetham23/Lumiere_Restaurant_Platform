-- ============================================================
-- LUMIÈRE B2B — PHASE 2 OPERATIONS ENHANCEMENTS
-- Add table positioning (pos_x, pos_y, section) & session order prep timestamps
-- ============================================================

-- 1. Add table positioning & section to restaurant_tables
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS pos_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'Main Dining';

-- 2. Add preparation tracking timestamps & target prep mins to session_orders
ALTER TABLE public.session_orders
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS target_prep_mins integer NOT NULL DEFAULT 15;

-- 3. Ensure service_requests status column supports 'pending', 'accepted', 'done'
-- Existing RLS policies already cover restaurant_tables, session_orders, service_requests.
