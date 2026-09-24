-- ============================================================
-- LUMIÈRE B2B — SWIGGY / ZOMATO MARKETPLACE ORDERS MIGRATION
-- Add marketplace metadata columns and unique constraint
-- ============================================================

BEGIN;

-- 1. Add marketplace metadata columns to session_orders
ALTER TABLE public.session_orders
  ADD COLUMN IF NOT EXISTS external_order_id TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Create unique partial index for provider-order identity per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_orders_marketplace_external_id
ON public.session_orders (restaurant_id, source, external_order_id)
WHERE external_order_id IS NOT NULL;

COMMIT;
