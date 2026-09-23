BEGIN;

-- Orders Module Batch C1 — Staff / POS Order Creation RPC
-- Enables authenticated restaurant staff (owner, manager, staff) to create orders directly for a table.

CREATE OR REPLACE FUNCTION public.create_staff_order(
  p_table_id UUID,
  p_items JSONB,
  p_customer_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'pos_manual'
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_table public.restaurant_tables;
  v_membership public.restaurant_memberships;
  v_sess public.dining_sessions;
  v_source TEXT;
  v_item JSONB;
  v_mi public.menu_items;
  v_qty_str TEXT;
  v_qty INT;
  v_line JSONB;
  v_lines JSONB := '[]'::jsonb;
  v_subtotal NUMERIC(10,2) := 0;
  v_sc_pct NUMERIC(5,2) := 0;
  v_service_charge NUMERIC(10,2) := 0;
  v_discount NUMERIC(10,2) := 0;
  v_tax NUMERIC(10,2) := 0;
  v_total NUMERIC(10,2) := 0;
  v_max_prep INT := 0;
  v_item_prep INT;
  v_order_number BIGINT;
  v_order public.session_orders;
BEGIN
  -- 1. Verify caller authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated caller';
  END IF;

  -- 2. Resolve target table with row lock
  SELECT * INTO v_table
  FROM public.restaurant_tables
  WHERE id = p_table_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid table';
  END IF;

  -- 3. Verify authenticated caller's restaurant membership and role
  SELECT * INTO v_membership
  FROM public.restaurant_memberships
  WHERE restaurant_id = v_table.restaurant_id
    AND user_id = v_user_id
    AND role IN ('owner', 'manager', 'staff');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unauthorized table access for caller';
  END IF;

  -- 4. Source validation & normalization
  IF p_source IS NULL OR p_source NOT IN ('pos_manual', 'dine_in', 'takeaway') THEN
    v_source := 'pos_manual';
  ELSE
    v_source := p_source;
  END IF;

  -- 5. Cart items validation
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty order cart';
  END IF;

  -- 6. Resolve or create dining session atomically
  SELECT * INTO v_sess
  FROM public.dining_sessions
  WHERE table_id = v_table.id
    AND restaurant_id = v_table.restaurant_id
    AND status IN ('open', 'bill_pending')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.dining_sessions(
      restaurant_id, table_id, customer_name, phone, status
    )
    VALUES (
      v_table.restaurant_id,
      v_table.id,
      NULLIF(TRIM(p_customer_name), ''),
      NULLIF(TRIM(p_phone), ''),
      'open'
    )
    RETURNING * INTO v_sess;

    UPDATE public.restaurant_tables
    SET state = 'occupied', current_session_id = v_sess.id
    WHERE id = v_table.id AND restaurant_id = v_table.restaurant_id;
  ELSE
    -- Reopen session if it was bill_pending
    IF v_sess.status = 'bill_pending' THEN
      UPDATE public.dining_sessions
      SET status = 'open'
      WHERE id = v_sess.id;
      v_sess.status := 'open';
    END IF;

    -- Update session customer details if missing
    IF (v_sess.customer_name IS NULL OR v_sess.customer_name = '') AND NULLIF(TRIM(p_customer_name), '') IS NOT NULL THEN
      UPDATE public.dining_sessions SET customer_name = TRIM(p_customer_name) WHERE id = v_sess.id;
      v_sess.customer_name := TRIM(p_customer_name);
    END IF;
    IF (v_sess.phone IS NULL OR v_sess.phone = '') AND NULLIF(TRIM(p_phone), '') IS NOT NULL THEN
      UPDATE public.dining_sessions SET phone = TRIM(p_phone) WHERE id = v_sess.id;
      v_sess.phone := TRIM(p_phone);
    END IF;
  END IF;

  -- 7. Validate items and calculate subtotal & prep time (100% server-side calculation)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty_str := v_item->>'qty';
    IF v_qty_str IS NULL OR NOT (v_qty_str ~ '^[0-9]+$') THEN
      RAISE EXCEPTION 'invalid item quantity';
    END IF;

    v_qty := v_qty_str::int;
    IF v_qty <= 0 OR v_qty > 500 THEN
      RAISE EXCEPTION 'quantity out of bounds (must be 1-500)';
    END IF;

    SELECT * INTO v_mi
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')
      AND restaurant_id = v_table.restaurant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'unknown menu item %', (v_item->>'menu_item_id');
    END IF;

    IF NOT v_mi.available THEN
      RAISE EXCEPTION '% is sold out', v_mi.title;
    END IF;

    v_subtotal := v_subtotal + (v_mi.price * v_qty);
    v_item_prep := COALESCE(v_mi.prep_minutes, 15);
    IF v_item_prep > v_max_prep THEN
      v_max_prep := v_item_prep;
    END IF;

    v_line := jsonb_build_object(
      'menu_item_id', v_mi.id,
      'title', v_mi.title,
      'price', v_mi.price,
      'qty', v_qty,
      'notes', NULLIF(TRIM(v_item->>'notes'), '')
    );
    v_lines := v_lines || v_line;
  END LOOP;

  IF v_max_prep = 0 THEN
    v_max_prep := 15;
  END IF;

  -- 8. Check service charge settings from restaurant_settings
  SELECT COALESCE(service_charge_pct, 0) INTO v_sc_pct
  FROM public.restaurant_settings
  WHERE restaurant_id = v_table.restaurant_id;

  IF v_sc_pct > 0 THEN
    v_service_charge := ROUND((v_subtotal * v_sc_pct / 100.0)::numeric, 2);
  ELSE
    v_service_charge := 0;
  END IF;

  v_discount := 0;
  v_tax := 0;
  v_total := v_subtotal + v_service_charge;

  -- 9. Atomic order number generation per tenant
  INSERT INTO public.restaurant_order_counters (restaurant_id, last_order_number)
  VALUES (v_table.restaurant_id, 1001)
  ON CONFLICT (restaurant_id)
  DO UPDATE SET last_order_number = public.restaurant_order_counters.last_order_number + 1,
                updated_at = NOW()
  RETURNING last_order_number INTO v_order_number;

  -- 10. Insert session order
  INSERT INTO public.session_orders(
    restaurant_id, session_id, items, amount, subtotal, discount, tax, service_charge, total,
    notes, kind, source, status, target_prep_mins, order_number
  )
  VALUES (
    v_table.restaurant_id, v_sess.id, v_lines, v_total, v_subtotal, v_discount, v_tax, v_service_charge, v_total,
    NULLIF(TRIM(p_notes), ''), v_source, v_source, 'placed', v_max_prep, v_order_number
  )
  RETURNING * INTO v_order;

  -- 11. Return sanitized order payload
  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'session_id', v_sess.id,
    'restaurant_id', v_table.restaurant_id,
    'table_id', v_table.id,
    'table_label', v_table.label,
    'status', v_order.status,
    'source', v_order.source,
    'subtotal', v_order.subtotal,
    'discount', v_order.discount,
    'tax', v_order.tax,
    'service_charge', v_order.service_charge,
    'total', v_order.total,
    'target_prep_mins', v_order.target_prep_mins,
    'created_at', v_order.created_at
  );
END $$;

-- Revoke execute from public/anon, grant to authenticated only
REVOKE ALL ON FUNCTION public.create_staff_order(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_staff_order(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
