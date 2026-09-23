BEGIN;

-- Suppliers & Purchasing Module
-- Enables supplier management, purchase order creation, line-item tracking, and atomic stock receiving with weighted average costing.

-- 1. Create Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant ON public.suppliers(restaurant_id);

-- 2. Create Tenant Purchase Order Counter Table
CREATE TABLE IF NOT EXISTS public.restaurant_po_counters (
  restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  last_po_number BIGINT NOT NULL DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create Purchase Orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  po_number BIGINT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expected_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT purchase_orders_unique_po_number UNIQUE (restaurant_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_restaurant ON public.purchase_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);

-- 4. Create Purchase Order Items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  ordered_quantity NUMERIC(12, 3) NOT NULL CHECK (ordered_quantity > 0),
  received_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (received_quantity >= 0 AND received_quantity <= ordered_quantity),
  unit TEXT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT purchase_order_items_unique_item UNIQUE (po_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_inventory ON public.purchase_order_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_po_items_restaurant ON public.purchase_order_items(restaurant_id);

-- 5. Add po_id column to stock_movements
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_po ON public.stock_movements(po_id);

-- 6. Enable RLS on all purchasing tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_po_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers
DROP POLICY IF EXISTS suppliers_member_select ON public.suppliers;
CREATE POLICY suppliers_member_select ON public.suppliers
  FOR SELECT USING (public.is_restaurant_member(restaurant_id));

DROP POLICY IF EXISTS suppliers_member_insert ON public.suppliers;
CREATE POLICY suppliers_member_insert ON public.suppliers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = suppliers.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS suppliers_member_update ON public.suppliers;
CREATE POLICY suppliers_member_update ON public.suppliers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = suppliers.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS suppliers_member_delete ON public.suppliers;
CREATE POLICY suppliers_member_delete ON public.suppliers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = suppliers.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

-- Policies for restaurant_po_counters
DROP POLICY IF EXISTS po_counters_member_all ON public.restaurant_po_counters;
CREATE POLICY po_counters_member_all ON public.restaurant_po_counters
  FOR ALL USING (public.is_restaurant_member(restaurant_id))
  WITH CHECK (public.is_restaurant_member(restaurant_id));

-- Policies for purchase_orders
DROP POLICY IF EXISTS purchase_orders_member_select ON public.purchase_orders;
CREATE POLICY purchase_orders_member_select ON public.purchase_orders
  FOR SELECT USING (public.is_restaurant_member(restaurant_id));

DROP POLICY IF EXISTS purchase_orders_member_insert ON public.purchase_orders;
CREATE POLICY purchase_orders_member_insert ON public.purchase_orders
  FOR INSERT WITH CHECK (public.is_restaurant_member(restaurant_id));

DROP POLICY IF EXISTS purchase_orders_member_update ON public.purchase_orders;
CREATE POLICY purchase_orders_member_update ON public.purchase_orders
  FOR UPDATE USING (public.is_restaurant_member(restaurant_id));

-- Policies for purchase_order_items
DROP POLICY IF EXISTS po_items_member_select ON public.purchase_order_items;
CREATE POLICY po_items_member_select ON public.purchase_order_items
  FOR SELECT USING (public.is_restaurant_member(restaurant_id));

DROP POLICY IF EXISTS po_items_member_insert ON public.purchase_order_items;
CREATE POLICY po_items_member_insert ON public.purchase_order_items
  FOR INSERT WITH CHECK (public.is_restaurant_member(restaurant_id));

DROP POLICY IF EXISTS po_items_member_update ON public.purchase_order_items;
CREATE POLICY po_items_member_update ON public.purchase_order_items
  FOR UPDATE USING (public.is_restaurant_member(restaurant_id));

-- 7. Cross-tenant triggers for purchase_orders & purchase_order_items
CREATE OR REPLACE FUNCTION public.check_purchase_order_tenant()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_tenant UUID;
BEGIN
  SELECT restaurant_id INTO v_supplier_tenant
  FROM public.suppliers
  WHERE id = NEW.supplier_id;

  IF v_supplier_tenant IS NULL OR v_supplier_tenant <> NEW.restaurant_id THEN
    RAISE EXCEPTION 'cross-tenant supplier not permitted in purchase order';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_purchase_order_tenant ON public.purchase_orders;
CREATE TRIGGER trg_check_purchase_order_tenant
  BEFORE INSERT OR UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_purchase_order_tenant();


CREATE OR REPLACE FUNCTION public.check_po_item_tenant()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_tenant UUID;
  v_inv_tenant UUID;
BEGIN
  SELECT restaurant_id INTO v_po_tenant
  FROM public.purchase_orders
  WHERE id = NEW.po_id;

  IF v_po_tenant IS NULL THEN
    RAISE EXCEPTION 'invalid parent purchase order ID';
  END IF;

  -- Force item restaurant_id to match parent PO
  NEW.restaurant_id := v_po_tenant;

  SELECT restaurant_id INTO v_inv_tenant
  FROM public.inventory_items
  WHERE id = NEW.inventory_item_id;

  IF v_inv_tenant IS NULL OR v_inv_tenant <> v_po_tenant THEN
    RAISE EXCEPTION 'cross-tenant inventory item not permitted in purchase order line';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_po_item_tenant ON public.purchase_order_items;
CREATE TRIGGER trg_check_po_item_tenant
  BEFORE INSERT OR UPDATE ON public.purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_po_item_tenant();

-- 8. Stored Procedure for Atomic Stock Receiving with Weighted Average Costing
CREATE OR REPLACE FUNCTION public.receive_purchase_order_stock(
  p_po_id UUID,
  p_items JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po RECORD;
  v_item_input JSONB;
  v_po_item_id UUID;
  v_receive_qty NUMERIC;
  v_po_item RECORD;
  v_inv RECORD;
  v_new_received_qty NUMERIC;
  v_new_stock NUMERIC;
  v_new_cost_per_unit NUMERIC;
  v_total_ordered NUMERIC := 0;
  v_total_received NUMERIC := 0;
  v_po_num_str TEXT;
BEGIN
  -- Lock PO for update
  SELECT id, restaurant_id, po_number, status, supplier_id
  INTO v_po
  FROM public.purchase_orders
  WHERE id = p_po_id
  FOR UPDATE;

  IF v_po.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Purchase order not found');
  END IF;

  IF v_po.status IN ('cancelled', 'draft') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot receive stock for draft or cancelled purchase orders. Order must be placed first.');
  END IF;

  IF v_po.status = 'received' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Purchase order has already been fully received.');
  END IF;

  v_po_num_str := 'PO-' || v_po.po_number::text;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No items specified for receiving.');
  END IF;

  -- Process each receiving line entry
  FOR v_item_input IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_po_item_id := (v_item_input->>'po_item_id')::uuid;
    v_receive_qty := (v_item_input->>'receive_qty')::numeric;

    IF v_po_item_id IS NULL OR v_receive_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Lock PO item row
    SELECT id, inventory_item_id, ordered_quantity, received_quantity, unit_cost, unit
    INTO v_po_item
    FROM public.purchase_order_items
    WHERE id = v_po_item_id AND po_id = p_po_id AND restaurant_id = v_po.restaurant_id
    FOR UPDATE;

    IF v_po_item.id IS NULL THEN
      RAISE EXCEPTION 'invalid PO line item ID % for PO %', v_po_item_id, p_po_id;
    END IF;

    -- Over-receiving check
    IF (v_po_item.received_quantity + v_receive_qty) > v_po_item.ordered_quantity THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'over_receiving',
        'message', 'Cannot receive quantity exceeding ordered amount. Ordered: ' || v_po_item.ordered_quantity || ', Already received: ' || v_po_item.received_quantity || ', Attempted: ' || v_receive_qty
      );
    END IF;

    -- Lock inventory item row
    SELECT id, name, quantity as current_stock, cost_per_unit, unit
    INTO v_inv
    FROM public.inventory_items
    WHERE id = v_po_item.inventory_item_id AND restaurant_id = v_po.restaurant_id
    FOR UPDATE;

    IF v_inv.id IS NULL THEN
      RAISE EXCEPTION 'inventory item for PO line not found';
    END IF;

    v_new_received_qty := v_po_item.received_quantity + v_receive_qty;
    v_new_stock := v_inv.current_stock + v_receive_qty;

    -- Calculate Weighted Average Cost per unit
    IF v_new_stock > 0 THEN
      v_new_cost_per_unit := ((v_inv.current_stock * COALESCE(v_inv.cost_per_unit, 0)) + (v_receive_qty * v_po_item.unit_cost)) / v_new_stock;
    ELSE
      v_new_cost_per_unit := v_po_item.unit_cost;
    END IF;

    -- Update inventory item
    UPDATE public.inventory_items
    SET
      quantity = v_new_stock,
      cost_per_unit = ROUND(v_new_cost_per_unit, 2),
      updated_at = NOW()
    WHERE id = v_inv.id AND restaurant_id = v_po.restaurant_id;

    -- Insert immutable stock movement IN record
    INSERT INTO public.stock_movements (
      restaurant_id,
      inventory_item_id,
      type,
      quantity,
      previous_quantity,
      resulting_quantity,
      reason,
      po_id,
      created_by,
      created_at
    ) VALUES (
      v_po.restaurant_id,
      v_inv.id,
      'IN',
      v_receive_qty,
      v_inv.current_stock,
      v_new_stock,
      'Purchase Order ' || v_po_num_str || ' receipt',
      p_po_id,
      p_user_id,
      NOW()
    );

    -- Update PO line item received quantity
    UPDATE public.purchase_order_items
    SET
      received_quantity = v_new_received_qty,
      updated_at = NOW()
    WHERE id = v_po_item.id;
  END LOOP;

  -- Recalculate overall PO status
  SELECT 
    COALESCE(SUM(ordered_quantity), 0),
    COALESCE(SUM(received_quantity), 0)
  INTO v_total_ordered, v_total_received
  FROM public.purchase_order_items
  WHERE po_id = p_po_id;

  IF v_total_received >= v_total_ordered AND v_total_ordered > 0 THEN
    UPDATE public.purchase_orders
    SET status = 'received', updated_at = NOW()
    WHERE id = p_po_id;
  ELSIF v_total_received > 0 THEN
    UPDATE public.purchase_orders
    SET status = 'partially_received', updated_at = NOW()
    WHERE id = p_po_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', (SELECT status FROM public.purchase_orders WHERE id = p_po_id),
    'total_ordered', v_total_ordered,
    'total_received', v_total_received
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_purchase_order_stock(UUID, JSONB, UUID) TO authenticated;

COMMIT;
