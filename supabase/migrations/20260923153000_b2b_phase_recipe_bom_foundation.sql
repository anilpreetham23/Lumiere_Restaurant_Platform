BEGIN;

-- Recipe / BOM (Bill of Materials) Foundation
-- Enables tenant-scoped recipes linking menu items to inventory ingredients for cost calculation and future consumption.

-- 1. Create Recipe Headers table
CREATE TABLE IF NOT EXISTS public.recipe_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  yield_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.0 CHECK (yield_quantity > 0),
  yield_unit TEXT NOT NULL DEFAULT 'portion',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Partial Unique Index: Only ONE ACTIVE recipe allowed per menu item per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_recipe_per_item
  ON public.recipe_headers(restaurant_id, menu_item_id)
  WHERE is_active = true;

-- Indexes for performant filtering
CREATE INDEX IF NOT EXISTS idx_recipe_headers_restaurant ON public.recipe_headers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_recipe_headers_menu_item ON public.recipe_headers(menu_item_id);

-- 2. Create Recipe Ingredients table
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipe_headers(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT recipe_ingredients_unique_item UNIQUE (recipe_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory ON public.recipe_ingredients(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_restaurant ON public.recipe_ingredients(restaurant_id);

-- 3. Enable RLS
ALTER TABLE public.recipe_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Policies for recipe_headers
DROP POLICY IF EXISTS recipe_headers_member_select ON public.recipe_headers;
CREATE POLICY recipe_headers_member_select ON public.recipe_headers
  FOR SELECT USING (public.is_restaurant_member(restaurant_id));

DROP POLICY IF EXISTS recipe_headers_member_insert ON public.recipe_headers;
CREATE POLICY recipe_headers_member_insert ON public.recipe_headers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = recipe_headers.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS recipe_headers_member_update ON public.recipe_headers;
CREATE POLICY recipe_headers_member_update ON public.recipe_headers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = recipe_headers.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS recipe_headers_member_delete ON public.recipe_headers;
CREATE POLICY recipe_headers_member_delete ON public.recipe_headers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = recipe_headers.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

-- Policies for recipe_ingredients
DROP POLICY IF EXISTS recipe_ingredients_member_select ON public.recipe_ingredients;
CREATE POLICY recipe_ingredients_member_select ON public.recipe_ingredients
  FOR SELECT USING (public.is_restaurant_member(restaurant_id));

DROP POLICY IF EXISTS recipe_ingredients_member_insert ON public.recipe_ingredients;
CREATE POLICY recipe_ingredients_member_insert ON public.recipe_ingredients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = recipe_ingredients.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS recipe_ingredients_member_update ON public.recipe_ingredients;
CREATE POLICY recipe_ingredients_member_update ON public.recipe_ingredients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = recipe_ingredients.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS recipe_ingredients_member_delete ON public.recipe_ingredients;
CREATE POLICY recipe_ingredients_member_delete ON public.recipe_ingredients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = recipe_ingredients.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'manager')
    )
  );

-- 4. Cross-tenant integrity check trigger for recipe_ingredients
CREATE OR REPLACE FUNCTION public.check_recipe_ingredient_tenant()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe_tenant UUID;
  v_inv_tenant UUID;
BEGIN
  -- Get restaurant_id of parent recipe
  SELECT restaurant_id INTO v_recipe_tenant
  FROM public.recipe_headers
  WHERE id = NEW.recipe_id;

  IF v_recipe_tenant IS NULL THEN
    RAISE EXCEPTION 'invalid parent recipe ID';
  END IF;

  -- Force ingredient restaurant_id to match parent recipe
  NEW.restaurant_id := v_recipe_tenant;

  -- Verify inventory_item belongs to same tenant
  SELECT restaurant_id INTO v_inv_tenant
  FROM public.inventory_items
  WHERE id = NEW.inventory_item_id;

  IF v_inv_tenant IS NULL OR v_inv_tenant <> v_recipe_tenant THEN
    RAISE EXCEPTION 'cross-tenant inventory item not permitted in recipe';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_recipe_ingredient_tenant ON public.recipe_ingredients;
CREATE TRIGGER trg_check_recipe_ingredient_tenant
  BEFORE INSERT OR UPDATE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.check_recipe_ingredient_tenant();

-- 5. Cross-tenant integrity check trigger for recipe_headers (menu_item tenant verification)
CREATE OR REPLACE FUNCTION public.check_recipe_header_tenant()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_menu_tenant UUID;
BEGIN
  SELECT restaurant_id INTO v_menu_tenant
  FROM public.menu_items
  WHERE id = NEW.menu_item_id;

  IF v_menu_tenant IS NULL OR v_menu_tenant <> NEW.restaurant_id THEN
    RAISE EXCEPTION 'cross-tenant menu item not permitted in recipe';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_recipe_header_tenant ON public.recipe_headers;
CREATE TRIGGER trg_check_recipe_header_tenant
  BEFORE INSERT OR UPDATE ON public.recipe_headers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_recipe_header_tenant();

COMMIT;
