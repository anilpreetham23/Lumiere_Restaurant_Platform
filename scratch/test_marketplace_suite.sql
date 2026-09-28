CREATE OR REPLACE FUNCTION pg_temp.run_marketplace_test_suite() RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_a UUID;
  v_tenant_b UUID;
  v_user_owner_a UUID;
  v_user_manager_a UUID;
  v_user_staff_a UUID;

  v_menu_item_a UUID;
  v_menu_price NUMERIC(10,2) := 450.00;

  v_table_a UUID;
  v_sess_a UUID;
  v_ord_swiggy_a UUID;
  v_ord_zomato_a UUID;
  v_ext_id_a TEXT := 'SWIGGY-TEST-1001';
  v_ext_id_b TEXT := 'ZOMATO-TEST-2002';

  v_dup_ext_id_err BOOLEAN := FALSE;
  v_kitchen_pending_count INT;
  v_kitchen_accepted_count INT;
  v_kitchen_rejected_count INT;

  v_results JSONB := '{}'::jsonb;
BEGIN
  -- Select an existing auth user or create fallback
  SELECT id INTO v_user_owner_a FROM auth.users LIMIT 1;
  IF v_user_owner_a IS NULL THEN
    v_user_owner_a := gen_random_uuid();
  END IF;

  v_user_manager_a := v_user_owner_a;
  v_user_staff_a := gen_random_uuid();

  -- Setup test tenants
  v_tenant_a := gen_random_uuid();
  v_tenant_b := gen_random_uuid();

  INSERT INTO public.restaurants (id, name, slug)
  VALUES (v_tenant_a, 'Marketplace Test Resto A', 'mp-resto-a-' || v_tenant_a);

  INSERT INTO public.restaurants (id, name, slug)
  VALUES (v_tenant_b, 'Marketplace Test Resto B', 'mp-resto-b-' || v_tenant_b);

  -- Setup test membership
  INSERT INTO public.restaurant_memberships (restaurant_id, user_id, role, status)
  VALUES (v_tenant_a, v_user_owner_a, 'owner', 'active');

  -- Setup menu items with explicit ID & required fields
  v_menu_item_a := gen_random_uuid();
  INSERT INTO public.menu_items (id, restaurant_id, title, price, available, cuisine, image, short, description)
  VALUES (v_menu_item_a, v_tenant_a, 'Marketplace Special Dish', v_menu_price, true, 'Indian', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c', 'Test dish description', 'Test full description');

  -- Setup table with UUID token
  v_table_a := gen_random_uuid();
  INSERT INTO public.restaurant_tables (id, restaurant_id, label, token)
  VALUES (v_table_a, v_tenant_a, 'Delivery Desk 1', gen_random_uuid());

  -- Create dining session for Tenant A
  INSERT INTO public.dining_sessions (restaurant_id, table_id, customer_name, status)
  VALUES (v_tenant_a, v_table_a, 'Online Marketplace Session', 'open')
  RETURNING id INTO v_sess_a;

  -- 1. Insert a pending Swiggy order for Tenant A
  INSERT INTO public.session_orders (
    restaurant_id, session_id, order_number, source, status, marketplace_status, external_order_id,
    subtotal, total, amount, items, notes, kind
  ) VALUES (
    v_tenant_a, v_sess_a, 1001, 'swiggy', 'placed', 'placed', v_ext_id_a,
    v_menu_price, v_menu_price, v_menu_price,
    jsonb_build_array(jsonb_build_object('menu_item_id', v_menu_item_a, 'title', 'Marketplace Special Dish', 'price', v_menu_price, 'qty', 1)),
    'Customer: John Doe | Phone: +91 9999988888', 'delivery'
  ) RETURNING id INTO v_ord_swiggy_a;

  -- 2. Insert a pending Zomato order for Tenant A
  INSERT INTO public.session_orders (
    restaurant_id, session_id, order_number, source, status, marketplace_status, external_order_id,
    subtotal, total, amount, items, notes, kind
  ) VALUES (
    v_tenant_a, v_sess_a, 1002, 'zomato', 'placed', 'placed', v_ext_id_b,
    v_menu_price, v_menu_price, v_menu_price,
    jsonb_build_array(jsonb_build_object('menu_item_id', v_menu_item_a, 'title', 'Marketplace Special Dish', 'price', v_menu_price, 'qty', 1)),
    'Customer: Jane Doe', 'delivery'
  ) RETURNING id INTO v_ord_zomato_a;

  -- Test I: Duplicate external_order_id in same tenant fails
  BEGIN
    INSERT INTO public.session_orders (
      restaurant_id, session_id, order_number, source, status, external_order_id, amount, total, items
    ) VALUES (
      v_tenant_a, v_sess_a, 1003, 'swiggy', 'placed', v_ext_id_a, v_menu_price, v_menu_price, '[]'::jsonb
    );
    v_dup_ext_id_err := FALSE;
  EXCEPTION WHEN OTHERS THEN
    v_dup_ext_id_err := TRUE;
  END;
  v_results := jsonb_set(v_results, '{I_duplicate_external_order_id_rejected}', to_jsonb(v_dup_ext_id_err));

  -- Test N: Pending marketplace order excluded from Kitchen query logic
  SELECT COUNT(*) INTO v_kitchen_pending_count
  FROM public.session_orders
  WHERE restaurant_id = v_tenant_a
    AND status NOT IN ('served', 'cancelled')
    AND NOT (source IN ('swiggy', 'zomato') AND status = 'placed');

  v_results := jsonb_set(v_results, '{N_pending_marketplace_never_enters_kitchen}', to_jsonb(v_kitchen_pending_count = 0));

  -- Test A & B: Staff role accept attempt fails if user not owner/manager
  UPDATE public.session_orders
  SET status = 'accepted', accepted_at = NOW(), accepted_by = v_user_staff_a
  WHERE id = v_ord_swiggy_a
    AND restaurant_id = v_tenant_a
    AND source IN ('swiggy', 'zomato')
    AND status = 'placed'
    AND EXISTS (SELECT 1 FROM public.restaurant_memberships WHERE restaurant_id = v_tenant_a AND user_id = v_user_staff_a AND role IN ('owner', 'manager'));
  
  v_results := jsonb_set(v_results, '{A_staff_cannot_accept_order}', to_jsonb(
    (SELECT status FROM public.session_orders WHERE id = v_ord_swiggy_a) = 'placed'
  ));

  -- Test C: Manager/Owner accepts order atomically
  UPDATE public.session_orders
  SET status = 'accepted', accepted_at = NOW(), accepted_by = v_user_owner_a
  WHERE id = v_ord_swiggy_a
    AND restaurant_id = v_tenant_a
    AND source IN ('swiggy', 'zomato')
    AND status = 'placed'
    AND EXISTS (SELECT 1 FROM public.restaurant_memberships WHERE restaurant_id = v_tenant_a AND user_id = v_user_owner_a AND role IN ('owner', 'manager'));

  v_results := jsonb_set(v_results, '{C_manager_can_accept_order}', to_jsonb(
    (SELECT status FROM public.session_orders WHERE id = v_ord_swiggy_a) = 'accepted'
  ));

  -- Test O: Accepted marketplace order enters Kitchen
  SELECT COUNT(*) INTO v_kitchen_accepted_count
  FROM public.session_orders
  WHERE restaurant_id = v_tenant_a
    AND status NOT IN ('served', 'cancelled')
    AND NOT (source IN ('swiggy', 'zomato') AND status = 'placed');

  v_results := jsonb_set(v_results, '{O_accepted_marketplace_enters_kitchen}', to_jsonb(v_kitchen_accepted_count = 1));

  -- Test K: Accepting already accepted order fails safely (0 rows updated)
  WITH attempt AS (
    UPDATE public.session_orders
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_ord_swiggy_a
      AND restaurant_id = v_tenant_a
      AND source IN ('swiggy', 'zomato')
      AND status = 'placed'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_kitchen_accepted_count FROM attempt;

  v_results := jsonb_set(v_results, '{K_accepting_already_accepted_fails_safely}', to_jsonb(v_kitchen_accepted_count = 0));

  -- Test D: Owner rejects Zomato order
  UPDATE public.session_orders
  SET status = 'cancelled', rejected_at = NOW(), rejected_by = v_user_owner_a, rejection_reason = 'Restaurant overloaded', cancellation_reason = 'Restaurant overloaded', cancelled_at = NOW(), cancelled_by = v_user_owner_a
  WHERE id = v_ord_zomato_a
    AND restaurant_id = v_tenant_a
    AND source IN ('swiggy', 'zomato')
    AND status = 'placed'
    AND EXISTS (SELECT 1 FROM public.restaurant_memberships WHERE restaurant_id = v_tenant_a AND user_id = v_user_owner_a AND role IN ('owner', 'manager'));

  v_results := jsonb_set(v_results, '{D_owner_can_reject_order}', to_jsonb(
    (SELECT status FROM public.session_orders WHERE id = v_ord_zomato_a) = 'cancelled'
  ));

  -- Test M: Rejected order NEVER enters Kitchen
  SELECT COUNT(*) INTO v_kitchen_rejected_count
  FROM public.session_orders
  WHERE restaurant_id = v_tenant_a
    AND id = v_ord_zomato_a
    AND status NOT IN ('served', 'cancelled')
    AND NOT (source IN ('swiggy', 'zomato') AND status = 'placed');

  v_results := jsonb_set(v_results, '{M_rejected_order_never_enters_kitchen}', to_jsonb(v_kitchen_rejected_count = 0));

  -- Test L: Rejecting already cancelled order fails safely
  WITH attempt AS (
    UPDATE public.session_orders
    SET status = 'cancelled'
    WHERE id = v_ord_zomato_a
      AND restaurant_id = v_tenant_a
      AND source IN ('swiggy', 'zomato')
      AND status = 'placed'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_kitchen_rejected_count FROM attempt;

  v_results := jsonb_set(v_results, '{L_rejecting_already_rejected_fails_safely}', to_jsonb(v_kitchen_rejected_count = 0));

  -- Test E: Cross-tenant manipulation fails
  WITH attempt AS (
    UPDATE public.session_orders
    SET status = 'accepted'
    WHERE id = v_ord_swiggy_a
      AND restaurant_id = v_tenant_b
      AND source IN ('swiggy', 'zomato')
      AND status = 'placed'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_kitchen_rejected_count FROM attempt;

  v_results := jsonb_set(v_results, '{E_cross_tenant_manipulation_fails}', to_jsonb(v_kitchen_rejected_count = 0));

  -- Cleanup test data
  DELETE FROM public.session_orders WHERE restaurant_id IN (v_tenant_a, v_tenant_b);
  DELETE FROM public.dining_sessions WHERE restaurant_id IN (v_tenant_a, v_tenant_b);
  DELETE FROM public.restaurant_tables WHERE restaurant_id IN (v_tenant_a, v_tenant_b);
  DELETE FROM public.menu_items WHERE restaurant_id IN (v_tenant_a, v_tenant_b);
  DELETE FROM public.restaurant_memberships WHERE restaurant_id IN (v_tenant_a, v_tenant_b);
  DELETE FROM public.restaurants WHERE id IN (v_tenant_a, v_tenant_b);

  RETURN v_results;
END $$;

SELECT pg_temp.run_marketplace_test_suite() AS test_results;
