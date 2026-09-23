-- Migration: Fix Inventory Consumption Audit Identity Security Defect
-- Date: 2026-09-23 21:15:00

CREATE OR REPLACE FUNCTION public.consume_order_inventory(
  p_order_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_menu_item_id TEXT;
  v_item_title TEXT;
  v_ordered_qty NUMERIC;
  v_recipe RECORD;
  v_ing RECORD;
  v_req_qty NUMERIC;
  v_inv RECORD;
  v_order_num_str TEXT;
  v_effective_user_id UUID;
  
  v_missing_recipes TEXT[] := ARRAY[]::TEXT[];
  v_insufficient_stock TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1. Lock session order for update & check idempotency
  SELECT id, restaurant_id, order_number, status, items, inventory_consumed_at, inventory_consumption_status
  INTO v_order
  FROM public.session_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
  END IF;

  -- 2. Tenant Authorization: If caller is an authenticated user session, enforce tenant membership check
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.restaurant_memberships
      WHERE restaurant_id = v_order.restaurant_id
        AND user_id = auth.uid()
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: Tenant access denied');
    END IF;
  END IF;

  -- 3. Audit Identity Determination: auth.uid() strictly overrides any caller-supplied p_user_id
  v_effective_user_id := COALESCE(auth.uid(), p_user_id);

  -- Exactly-Once Check: If already consumed cleanly, return idempotent success
  IF v_order.inventory_consumed_at IS NOT NULL AND v_order.inventory_consumption_status IN ('consumed', 'consumed_with_missing_recipes', 'no_active_recipes') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'already_consumed',
      'consumed_at', v_order.inventory_consumed_at,
      'consumption_status', v_order.inventory_consumption_status
    );
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot consume inventory for a cancelled order');
  END IF;

  v_order_num_str := COALESCE(v_order.order_number::text, SUBSTRING(v_order.id::text FROM 1 FOR 8));

  -- Temporary table to aggregate required inventory quantities across all items in the order
  CREATE TEMP TABLE IF NOT EXISTS temp_order_req_ingredients (
    inventory_item_id UUID PRIMARY KEY,
    required_quantity NUMERIC(12, 3)
  ) ON COMMIT DROP;

  TRUNCATE temp_order_req_ingredients;

  -- 4. Process each item in session_orders.items
  IF v_order.items IS NOT NULL AND jsonb_array_length(v_order.items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
      v_menu_item_id := v_item->>'menu_item_id';
      v_item_title := COALESCE(v_item->>'title', v_menu_item_id);
      v_ordered_qty := COALESCE((v_item->>'qty')::numeric, (v_item->>'quantity')::numeric, 1);

      IF v_menu_item_id IS NULL OR v_ordered_qty <= 0 THEN
        CONTINUE;
      END IF;

      -- Query active recipe for this menu item in this restaurant
      SELECT id, yield_quantity
      INTO v_recipe
      FROM public.recipe_headers
      WHERE restaurant_id = v_order.restaurant_id
        AND menu_item_id = v_menu_item_id
        AND is_active = true
      LIMIT 1;

      IF v_recipe.id IS NULL THEN
        -- Record missing recipe menu item
        IF NOT (v_item_title = ANY(v_missing_recipes)) THEN
          v_missing_recipes := array_append(v_missing_recipes, v_item_title);
        END IF;
      ELSE
        -- Aggregate required quantity for each recipe ingredient
        FOR v_ing IN 
          SELECT inventory_item_id, quantity 
          FROM public.recipe_ingredients 
          WHERE recipe_id = v_recipe.id AND restaurant_id = v_order.restaurant_id
        LOOP
          v_req_qty := (v_ordered_qty / COALESCE(v_recipe.yield_quantity, 1.0)) * v_ing.quantity;

          INSERT INTO temp_order_req_ingredients (inventory_item_id, required_quantity)
          VALUES (v_ing.inventory_item_id, v_req_qty)
          ON CONFLICT (inventory_item_id) 
          DO UPDATE SET required_quantity = temp_order_req_ingredients.required_quantity + EXCLUDED.required_quantity;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- 5. Case: No ingredients required (all items missing recipes or empty)
  IF (SELECT COUNT(*) FROM temp_order_req_ingredients) = 0 THEN
    UPDATE public.session_orders
    SET 
      inventory_consumed_at = NOW(),
      inventory_consumption_status = CASE 
        WHEN array_length(v_missing_recipes, 1) > 0 THEN 'missing_recipes_only'
        ELSE 'no_active_recipes'
      END,
      inventory_consumption_notes = CASE 
        WHEN array_length(v_missing_recipes, 1) > 0 THEN 'Missing recipes for: ' || array_to_string(v_missing_recipes, ', ')
        ELSE 'No active recipes configured for ordered items'
      END
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'ok', true,
      'status', 'skipped_no_recipes',
      'missing_recipes', v_missing_recipes
    );
  END IF;

  -- 6. Check stock availability (lock inventory rows in sorted ID order to prevent deadlocks)
  FOR v_inv IN 
    SELECT i.id, i.name, i.unit, i.quantity as current_stock, r.required_quantity
    FROM temp_order_req_ingredients r
    JOIN public.inventory_items i ON i.id = r.inventory_item_id
    WHERE i.restaurant_id = v_order.restaurant_id
    ORDER BY i.id
    FOR UPDATE
  LOOP
    IF v_inv.current_stock < v_inv.required_quantity THEN
      v_insufficient_stock := array_append(
        v_insufficient_stock, 
        v_inv.name || ' (Need ' || v_inv.required_quantity || ' ' || v_inv.unit || ', Available ' || v_inv.current_stock || ' ' || v_inv.unit || ')'
      );
    END IF;
  END LOOP;

  -- Atomic Rejection: If ANY stock is insufficient, do NOT deduct stock, do NOT create partial stock movements
  IF array_length(v_insufficient_stock, 1) > 0 THEN
    UPDATE public.session_orders
    SET 
      inventory_consumption_status = 'insufficient_stock',
      inventory_consumption_notes = 'Insufficient stock: ' || array_to_string(v_insufficient_stock, '; ')
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_stock',
      'insufficient_stock_items', v_insufficient_stock,
      'missing_recipes', v_missing_recipes
    );
  END IF;

  -- 7. Atomic Stock Deduction & Immutable Stock Movement Creation
  FOR v_inv IN 
    SELECT i.id, i.quantity as current_stock, r.required_quantity
    FROM temp_order_req_ingredients r
    JOIN public.inventory_items i ON i.id = r.inventory_item_id
    WHERE i.restaurant_id = v_order.restaurant_id
    ORDER BY i.id
  LOOP
    -- Update inventory item quantity
    UPDATE public.inventory_items
    SET 
      quantity = quantity - v_inv.required_quantity,
      updated_at = NOW()
    WHERE id = v_inv.id AND restaurant_id = v_order.restaurant_id;

    -- Create immutable stock_movements OUT record
    INSERT INTO public.stock_movements (
      restaurant_id,
      inventory_item_id,
      type,
      quantity,
      previous_quantity,
      resulting_quantity,
      reason,
      order_id,
      created_by,
      created_at
    ) VALUES (
      v_order.restaurant_id,
      v_inv.id,
      'OUT',
      v_inv.required_quantity,
      v_inv.current_stock,
      v_inv.current_stock - v_inv.required_quantity,
      'Order #' || v_order_num_str || ' consumption',
      p_order_id,
      v_effective_user_id,
      NOW()
    );
  END LOOP;

  -- 8. Mark session order as successfully consumed
  UPDATE public.session_orders
  SET 
    inventory_consumed_at = NOW(),
    inventory_consumption_status = CASE 
      WHEN array_length(v_missing_recipes, 1) > 0 THEN 'consumed_with_missing_recipes'
      ELSE 'consumed'
    END,
    inventory_consumption_notes = CASE 
      WHEN array_length(v_missing_recipes, 1) > 0 THEN 'Stock consumed. Missing recipes for: ' || array_to_string(v_missing_recipes, ', ')
      ELSE 'All stock consumed successfully'
    END
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', CASE WHEN array_length(v_missing_recipes, 1) > 0 THEN 'consumed_with_missing_recipes' ELSE 'consumed' END,
    'missing_recipes', v_missing_recipes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_order_inventory(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_order_inventory(UUID, UUID) TO service_role;
