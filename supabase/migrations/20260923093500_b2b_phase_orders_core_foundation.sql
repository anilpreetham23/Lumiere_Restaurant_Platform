-- ============================================================
-- LUMIÈRE B2B — ORDERS CORE FOUNDATION MIGRATION (BATCH A)
-- Add tenant order numbering, order source, cancellation, and financial breakdown
-- ============================================================

BEGIN;

-- 1. Create tenant order counter table for atomic, thread-safe order numbers
CREATE TABLE IF NOT EXISTS public.restaurant_order_counters (
  restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  last_order_number BIGINT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.restaurant_order_counters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_order_counters' AND policyname = 'tenant_isolation_restaurant_order_counters'
  ) THEN
    CREATE POLICY tenant_isolation_restaurant_order_counters ON public.restaurant_order_counters
      FOR ALL TO authenticated
      USING (public.is_restaurant_member(restaurant_id))
      WITH CHECK (public.is_restaurant_member(restaurant_id));
  END IF;
END $$;

-- 2. Add new columns to session_orders
ALTER TABLE public.session_orders
  ADD COLUMN IF NOT EXISTS order_number BIGINT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'dine_in',
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add CHECK constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_orders_source_check'
  ) THEN
    ALTER TABLE public.session_orders
      ADD CONSTRAINT session_orders_source_check
      CHECK (source IN ('dine_in', 'takeaway', 'delivery', 'pos_manual', 'swiggy', 'zomato'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_orders_status_check'
  ) THEN
    ALTER TABLE public.session_orders
      ADD CONSTRAINT session_orders_status_check
      CHECK (status IN ('placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'));
  END IF;
END $$;

-- 4. Backfill existing session_orders safely
WITH numbered_orders AS (
  SELECT id, restaurant_id,
         1000 + ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY created_at ASC, id ASC) AS new_order_number
  FROM public.session_orders
  WHERE order_number IS NULL
)
UPDATE public.session_orders o
SET order_number = n.new_order_number,
    subtotal = CASE WHEN o.subtotal = 0 THEN o.amount ELSE o.subtotal END,
    total = CASE WHEN o.total = 0 THEN o.amount ELSE o.total END
FROM numbered_orders n
WHERE o.id = n.id;

UPDATE public.session_orders
SET subtotal = amount
WHERE subtotal = 0 AND amount > 0;

UPDATE public.session_orders
SET total = amount
WHERE total = 0 AND amount > 0;

-- Populate counter table for all existing restaurants
INSERT INTO public.restaurant_order_counters (restaurant_id, last_order_number)
SELECT r.id, COALESCE(MAX(so.order_number), 1000)
FROM public.restaurants r
LEFT JOIN public.session_orders so ON so.restaurant_id = r.id
GROUP BY r.id
ON CONFLICT (restaurant_id) DO UPDATE
SET last_order_number = EXCLUDED.last_order_number;

-- Make order_number NOT NULL
ALTER TABLE public.session_orders ALTER COLUMN order_number SET NOT NULL;

-- Unique constraint per tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_session_orders_restaurant_order_number'
  ) THEN
    ALTER TABLE public.session_orders
      ADD CONSTRAINT uq_session_orders_restaurant_order_number
      UNIQUE (restaurant_id, order_number);
  END IF;
END $$;

-- 5. Update place_order RPC for server-side order_number & financial calculation
CREATE OR REPLACE FUNCTION public.place_order(
  p_token UUID,
  p_items JSONB,
  p_customer TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table public.restaurant_tables;
  v_sess public.dining_sessions;
  v_item JSONB;
  v_mi public.menu_items;
  v_qty INT;
  v_line JSONB;
  v_lines JSONB := '[]'::jsonb;
  v_subtotal NUMERIC(10,2) := 0;
  v_max_prep INT := 0;
  v_item_prep INT;
  v_order_number BIGINT;
BEGIN
  SELECT * INTO v_table FROM public.restaurant_tables WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid table'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'empty order'; END IF;

  SELECT * INTO v_sess
  FROM public.dining_sessions
  WHERE table_id = v_table.id
    AND restaurant_id = v_table.restaurant_id
    AND status IN ('open', 'bill_pending')
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.dining_sessions(restaurant_id, table_id, customer_name, phone)
    VALUES (v_table.restaurant_id, v_table.id, p_customer, p_phone)
    RETURNING * INTO v_sess;

    UPDATE public.restaurant_tables
    SET state = 'occupied', current_session_id = v_sess.id
    WHERE id = v_table.id AND restaurant_id = v_table.restaurant_id;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_mi
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')
      AND restaurant_id = v_table.restaurant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown item %', v_item->>'menu_item_id'; END IF;
    IF NOT v_mi.available THEN RAISE EXCEPTION '% is sold out', v_mi.title; END IF;

    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::int, 1));
    v_subtotal := v_subtotal + v_mi.price * v_qty;
    v_item_prep := COALESCE(v_mi.prep_minutes, 15);
    IF v_item_prep > v_max_prep THEN
      v_max_prep := v_item_prep;
    END IF;

    v_line := jsonb_build_object(
      'menu_item_id', v_mi.id,
      'title', v_mi.title,
      'price', v_mi.price,
      'qty', v_qty,
      'notes', v_item->>'notes'
    );
    v_lines := v_lines || v_line;
  END LOOP;

  IF v_max_prep = 0 THEN
    v_max_prep := 15;
  END IF;

  -- Atomic order number generation for the tenant
  INSERT INTO public.restaurant_order_counters (restaurant_id, last_order_number)
  VALUES (v_table.restaurant_id, 1001)
  ON CONFLICT (restaurant_id)
  DO UPDATE SET last_order_number = public.restaurant_order_counters.last_order_number + 1,
                updated_at = NOW()
  RETURNING last_order_number INTO v_order_number;

  INSERT INTO public.session_orders(
    restaurant_id, session_id, items, amount, subtotal, discount, tax, service_charge, total,
    notes, kind, source, status, target_prep_mins, order_number
  )
  VALUES (
    v_table.restaurant_id, v_sess.id, v_lines, v_subtotal, v_subtotal, 0, 0, 0, v_subtotal,
    p_notes, 'dine_in', 'dine_in', 'placed', v_max_prep, v_order_number
  );

  RETURN public.get_session(p_token);
END $$;

COMMIT;
