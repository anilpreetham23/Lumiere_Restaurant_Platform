export type RecipeIngredientInput = {
  inventory_item_id: string;
  quantity: number;
  unit: string;
};

export type SaveRecipeInput = {
  id?: string; // Optional: provided when updating existing recipe
  menu_item_id: string;
  name: string;
  yield_quantity: number;
  yield_unit: string;
  is_active?: boolean;
  ingredients: RecipeIngredientInput[];
};

export type RecipeIngredientDetail = {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
  inventory_items?: {
    id: string;
    name: string;
    sku: string | null;
    category: string;
    unit: string;
    quantity: number;
    cost_per_unit: number;
    is_active: boolean;
  } | null;
};

export type RecipeHeaderDetail = {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  yield_quantity: number;
  yield_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  menu_items?: {
    id: string;
    title: string;
    category: string;
    price: number;
    available: boolean;
  } | null;
  recipe_ingredients?: RecipeIngredientDetail[];
  total_cost?: number;
  cost_per_yield?: number;
  food_cost_percentage?: number;
};
