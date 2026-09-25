"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChefHat,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit3,
  Eye,
  X,
  Scale,
  Utensils,
  DollarSign,
  Layers,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/actions/tenant";
import {
  getRecipes,
  saveRecipeAction,
  toggleRecipeActiveAction,
  deleteRecipeAction,
} from "@/actions/admin";
import type { RecipeHeaderDetail, RecipeIngredientInput } from "@/lib/recipe";

type MenuItemSimple = {
  id: string;
  title: string;
  category: string;
  price: number;
  available: boolean;
};

type InventoryItemSimple = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  quantity: number;
  cost_per_unit: number;
  is_active: boolean;
};

function formatMoney(val: number | null | undefined): string {
  const amount = Number(val ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function AdminRecipesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [recipes, setRecipes] = useState<RecipeHeaderDetail[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemSimple[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemSimple[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Recipe Modal State (Create / Edit)
  const [showEditorModal, setShowEditorModal] = useState<boolean>(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeHeaderDetail | null>(null);
  
  // Editor Form Fields
  const [formMenuItemId, setFormMenuItemId] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formYieldQty, setFormYieldQty] = useState<number>(1);
  const [formYieldUnit, setFormYieldUnit] = useState<string>("portion");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formIngredients, setFormIngredients] = useState<RecipeIngredientInput[]>([]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Detail Drawer State
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<RecipeHeaderDetail | null>(null);

  // Load recipes, menu items, and inventory items
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const resId = await getActiveRestaurantId();
    if (!resId) {
      setRecipes([]);
      setMenuItems([]);
      setInventoryItems([]);
      setLoading(false);
      return;
    }

    const [recipesRes, menuRes, invRes] = await Promise.all([
      getRecipes(),
      supabase
        .from("menu_items")
        .select("id, title, cuisine, price, available")
        .eq("restaurant_id", resId)
        .order("cuisine")
        .order("title"),
      supabase
        .from("inventory_items")
        .select("id, name, sku, category, unit, quantity, cost_per_unit, is_active")
        .eq("restaurant_id", resId)
        .eq("is_active", true)
        .order("name"),
    ]);

    if (!recipesRes.ok) {
      setError(recipesRes.error || "Failed to load recipes.");
      setRecipes([]);
    } else {
      setRecipes(recipesRes.recipes || []);
    }

    const mappedMenuItems = (menuRes.data || []).map((item: any) => ({
      ...item,
      category: item.cuisine,
    }));
    setMenuItems((mappedMenuItems as MenuItemSimple[]) || []);
    setInventoryItems((invRes.data as InventoryItemSimple[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Categories list extracted from menu items
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ["all", ...Array.from(set)];
  }, [menuItems]);

  // Metrics
  const metrics = useMemo(() => {
    const total = recipes.length;
    const active = recipes.filter((r) => r.is_active).length;
    const noIngredients = recipes.filter(
      (r) => !r.recipe_ingredients || r.recipe_ingredients.length === 0
    ).length;

    const activeRecipesWithCost = recipes.filter(
      (r) => r.is_active && (r.food_cost_percentage ?? 0) > 0
    );
    const avgFoodCost =
      activeRecipesWithCost.length > 0
        ? activeRecipesWithCost.reduce((sum, r) => sum + (r.food_cost_percentage ?? 0), 0) /
          activeRecipesWithCost.length
        : 0;

    return {
      total,
      active,
      noIngredients,
      avgFoodCost: Math.round(avgFoodCost * 10) / 10,
    };
  }, [recipes]);

  // Filtered Recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.menu_items && r.menu_items.title.toLowerCase().includes(q)) ||
        (r.menu_items && r.menu_items.category.toLowerCase().includes(q));

      const matchCat =
        categoryFilter === "all" ||
        (r.menu_items && r.menu_items.category === categoryFilter);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && r.is_active) ||
        (statusFilter === "inactive" && !r.is_active);

      return matchSearch && matchCat && matchStatus;
    });
  }, [recipes, searchQuery, categoryFilter, statusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRecipe(null);
    setFormMenuItemId("");
    setFormName("");
    setFormYieldQty(1);
    setFormYieldUnit("portion");
    setFormIsActive(true);
    setFormIngredients([
      { inventory_item_id: inventoryItems[0]?.id || "", quantity: 1, unit: inventoryItems[0]?.unit || "kg" },
    ]);
    setModalError(null);
    setShowEditorModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (recipe: RecipeHeaderDetail) => {
    setEditingRecipe(recipe);
    setFormMenuItemId(recipe.menu_item_id);
    setFormName(recipe.name);
    setFormYieldQty(Number(recipe.yield_quantity || 1));
    setFormYieldUnit(recipe.yield_unit || "portion");
    setFormIsActive(recipe.is_active);

    const initialIngs = (recipe.recipe_ingredients || []).map((ing) => ({
      inventory_item_id: ing.inventory_item_id,
      quantity: Number(ing.quantity),
      unit: ing.unit,
    }));

    setFormIngredients(
      initialIngs.length > 0
        ? initialIngs
        : [{ inventory_item_id: inventoryItems[0]?.id || "", quantity: 1, unit: inventoryItems[0]?.unit || "kg" }]
    );
    setModalError(null);
    setShowEditorModal(true);
  };

  // Auto-fill recipe name when menu item changes in creation mode
  const handleMenuItemChange = (menuItemId: string) => {
    setFormMenuItemId(menuItemId);
    if (!editingRecipe) {
      const selected = menuItems.find((m) => m.id === menuItemId);
      if (selected) {
        setFormName(`${selected.title} Recipe`);
      }
    }
  };

  // Ingredient Form Helpers
  const addIngredientRow = () => {
    const firstInv = inventoryItems[0];
    setFormIngredients((prev) => [
      ...prev,
      { inventory_item_id: firstInv?.id || "", quantity: 1, unit: firstInv?.unit || "kg" },
    ]);
  };

  const updateIngredientRow = (index: number, field: keyof RecipeIngredientInput, value: any) => {
    setFormIngredients((prev) => {
      const next = [...prev];
      if (field === "inventory_item_id") {
        const inv = inventoryItems.find((i) => i.id === value);
        next[index] = {
          ...next[index],
          inventory_item_id: value,
          unit: inv?.unit || next[index].unit,
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const removeIngredientRow = (index: number) => {
    setFormIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate Live Cost in Form
  const liveFormCost = useMemo(() => {
    let total = 0;
    formIngredients.forEach((ing) => {
      const inv = inventoryItems.find((i) => i.id === ing.inventory_item_id);
      const cost = Number(inv?.cost_per_unit || 0);
      const qty = Number(ing.quantity || 0);
      total += cost * qty;
    });
    const yieldQty = Number(formYieldQty || 1);
    const costPerYield = yieldQty > 0 ? total / yieldQty : total;
    return { total, costPerYield };
  }, [formIngredients, inventoryItems, formYieldQty]);

  // Handle Save Recipe Submit
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formMenuItemId) {
      setModalError("Please select a menu item.");
      return;
    }
    if (!formName.trim()) {
      setModalError("Recipe name is required.");
      return;
    }
    if (formIngredients.length === 0) {
      setModalError("At least one ingredient is required.");
      return;
    }

    setIsSaving(true);
    setModalError(null);

    const payload = {
      id: editingRecipe?.id,
      menu_item_id: formMenuItemId,
      name: formName.trim(),
      yield_quantity: Number(formYieldQty),
      yield_unit: formYieldUnit.trim() || "portion",
      is_active: formIsActive,
      ingredients: formIngredients.map((ing) => ({
        inventory_item_id: ing.inventory_item_id,
        quantity: Number(ing.quantity),
        unit: ing.unit.trim(),
      })),
    };

    const res = await saveRecipeAction(payload);
    setIsSaving(false);

    if (!res.ok) {
      setModalError(res.error || "Failed to save recipe.");
    } else {
      setShowEditorModal(false);
      loadData();
    }
  };

  // Toggle Active State
  const handleToggleActive = async (recipe: RecipeHeaderDetail) => {
    const newActive = !recipe.is_active;
    const res = await toggleRecipeActiveAction(recipe.id, newActive);
    if (!res.ok) {
      alert(res.error || "Unable to update recipe status.");
    } else {
      loadData();
    }
  };

  // Delete Recipe
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    const res = await deleteRecipeAction(recipeId);
    if (!res.ok) {
      alert(res.error || "Failed to delete recipe.");
    } else {
      if (selectedRecipeDetail?.id === recipeId) {
        setSelectedRecipeDetail(null);
      }
      loadData();
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-wine" /> Recipe & BOM Management
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Define portion recipes, link menu items to inventory ingredients, and analyze food cost ratios.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn-wine text-xs py-2 px-4 shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> + New Recipe
        </button>
      </div>

      {/* METRICS SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Total Recipes</span>
            <ChefHat className="w-4 h-4 text-wine" />
          </div>
          <p className="font-serif text-2xl font-bold text-ink mt-2">{metrics.total}</p>
          <span className="text-[11px] text-neutral-400">Configured BOMs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>Active Recipes</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-emerald-800 mt-2">{metrics.active}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Live for portion cost</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
            <span>Missing Ingredients</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-amber-800 mt-2">{metrics.noIngredients}</p>
          <span className="text-[11px] text-amber-600 font-medium">Empty ingredient list</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-medium">
            <span>Avg. Food Cost %</span>
            <Scale className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-indigo-900 mt-2">
            {metrics.avgFoodCost > 0 ? `${metrics.avgFoodCost}%` : "—"}
          </p>
          <span className="text-[11px] text-indigo-600 font-medium">Portion Cost / Price</span>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search recipe or menu item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-cream/40 border border-cream2 rounded-xl focus:outline-none focus:ring-1 focus:ring-wine focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-cream/40 border border-cream2 rounded-xl focus:outline-none focus:ring-1 focus:ring-wine text-neutral-700 font-medium"
          >
            <option value="all">All Categories</option>
            {categories
              .filter((c) => c !== "all")
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-cream/40 border border-cream2 rounded-xl focus:outline-none focus:ring-1 focus:ring-wine text-neutral-700 font-medium"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RECIPES LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
          <span className="text-sm font-medium">Loading recipes & BOMs…</span>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-cream2 space-y-3">
          <ChefHat className="w-10 h-10 mx-auto text-neutral-300" />
          <h3 className="font-serif text-lg font-semibold text-ink">No recipes found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
              ? "No recipes match your filter parameters."
              : "Get started by creating your first portion recipe for a menu item."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="btn-wine text-xs py-2 px-4 mx-auto"
          >
            + Create First Recipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((r) => {
            const ingCount = r.recipe_ingredients?.length || 0;
            const fcPct = r.food_cost_percentage ?? 0;
            const fcColor =
              fcPct <= 0
                ? "bg-stone-100 text-stone-600 border-stone-200"
                : fcPct <= 30
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : fcPct <= 40
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-rose-50 text-rose-800 border-rose-200";

            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                  !r.is_active ? "border-stone-200 bg-stone-50/50 opacity-75" : "border-cream2 hover:border-gold/50"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        {r.menu_items?.category || "Menu Item"}
                      </span>
                      <h3 className="font-serif font-bold text-lg text-ink leading-tight">
                        {r.name}
                      </h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        r.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-stone-100 text-stone-600 border-stone-200"
                      }`}
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-600 space-y-1 mt-3 bg-cream/30 p-3 rounded-xl border border-cream2/60">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Menu Dish:</span>
                      <span className="font-semibold text-ink">{r.menu_items?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Menu Price:</span>
                      <span className="font-semibold text-ink">{formatMoney(r.menu_items?.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Yield Portion:</span>
                      <span className="font-semibold text-ink">
                        {r.yield_quantity} {r.yield_unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Ingredients:</span>
                      <span className="font-semibold text-ink">{ingCount} items</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-cream2">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">Cost / Portion</span>
                      <span className="font-bold text-base text-wine">
                        {formatMoney(r.cost_per_yield)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-neutral-400 block">Food Cost %</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${fcColor}`}>
                        {fcPct > 0 ? `${fcPct}%` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-cream2 flex items-center justify-between text-xs gap-1">
                  <button
                    onClick={() => setSelectedRecipeDetail(r)}
                    className="p-1.5 rounded-lg bg-cream hover:bg-cream2 text-neutral-700 transition flex items-center gap-1 font-medium"
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5 text-neutral-600" /> Details
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(r)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition ${
                        r.is_active
                          ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {r.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1.5 rounded-lg bg-cream hover:bg-cream2 text-neutral-700 transition"
                      title="Edit Recipe"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRecipe(r.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 text-neutral-400 hover:text-rose-600 transition"
                      title="Delete Recipe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RECIPE EDITOR MODAL (CREATE / EDIT) */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-cream2 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-neutral-800">
            {/* MODAL HEADER */}
            <div className="px-6 py-4 border-b border-cream2 bg-cream/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-wine/10 text-wine">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink leading-tight">
                    {editingRecipe ? `Edit Recipe — ${editingRecipe.name}` : "Create New Recipe / BOM"}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Link menu dish to inventory raw materials for exact portion cost calculations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditorModal(false)}
                className="p-2 rounded-full hover:bg-cream2 text-neutral-400 hover:text-ink transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL BODY FORM */}
            <form onSubmit={handleSaveRecipe} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* MENU ITEM SELECTION */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Target Menu Dish *
                  </label>
                  <select
                    value={formMenuItemId}
                    onChange={(e) => handleMenuItemChange(e.target.value)}
                    disabled={!!editingRecipe}
                    className="w-full p-2.5 text-xs bg-cream/30 border border-cream2 rounded-xl focus:outline-none focus:border-wine font-medium"
                    required
                  >
                    <option value="">-- Select Menu Item --</option>
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.category}) — {formatMoney(m.price)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* RECIPE NAME */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Recipe Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chicken Biryani Recipe"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 text-xs border border-cream2 rounded-xl focus:outline-none focus:border-wine font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* YIELD QUANTITY */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Yield Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formYieldQty}
                    onChange={(e) => setFormYieldQty(Number(e.target.value))}
                    className="w-full p-2.5 text-xs border border-cream2 rounded-xl focus:outline-none focus:border-wine font-medium"
                    required
                  />
                </div>

                {/* YIELD UNIT */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Yield Unit *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. portion, plate, kg"
                    value={formYieldUnit}
                    onChange={(e) => setFormYieldUnit(e.target.value)}
                    className="w-full p-2.5 text-xs border border-cream2 rounded-xl focus:outline-none focus:border-wine font-medium"
                    required
                  />
                </div>

                {/* IS ACTIVE TOGGLE */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Recipe Status
                  </label>
                  <select
                    value={formIsActive ? "active" : "inactive"}
                    onChange={(e) => setFormIsActive(e.target.value === "active")}
                    className="w-full p-2.5 text-xs bg-cream/30 border border-cream2 rounded-xl focus:outline-none focus:border-wine font-medium"
                  >
                    <option value="active">Active (Primary BOM)</option>
                    <option value="inactive">Inactive / Draft</option>
                  </select>
                </div>
              </div>

              {/* INGREDIENTS SECTION */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                    Recipe Ingredients ({formIngredients.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="text-xs text-wine font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Ingredient Row
                  </button>
                </div>

                {formIngredients.length === 0 ? (
                  <div className="p-6 border border-dashed border-neutral-300 rounded-xl text-center text-xs text-neutral-400">
                    No ingredients added yet. Click &quot;+ Add Ingredient Row&quot; above.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formIngredients.map((ing, idx) => {
                      const selectedInv = inventoryItems.find(
                        (i) => i.id === ing.inventory_item_id
                      );
                      const unitCost = Number(selectedInv?.cost_per_unit || 0);
                      const lineCost = unitCost * Number(ing.quantity || 0);

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-cream2 bg-cream/20 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                        >
                          {/* INVENTORY ITEM SELECT */}
                          <div className="sm:col-span-5">
                            <select
                              value={ing.inventory_item_id}
                              onChange={(e) =>
                                updateIngredientRow(idx, "inventory_item_id", e.target.value)
                              }
                              className="w-full p-2 text-xs border border-cream2 rounded-lg bg-white focus:outline-none focus:border-wine font-medium"
                              required
                            >
                              <option value="">-- Select Ingredient --</option>
                              {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name} ({inv.unit}) — {formatMoney(inv.cost_per_unit)}/{inv.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* QUANTITY INPUT */}
                          <div className="sm:col-span-3">
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              placeholder="Qty"
                              value={ing.quantity}
                              onChange={(e) =>
                                updateIngredientRow(idx, "quantity", Number(e.target.value))
                              }
                              className="w-full p-2 text-xs border border-cream2 rounded-lg bg-white focus:outline-none focus:border-wine font-medium"
                              required
                            />
                          </div>

                          {/* UNIT DISPLAY */}
                          <div className="sm:col-span-2 text-neutral-500 font-medium truncate px-1">
                            {ing.unit || selectedInv?.unit || "unit"}
                          </div>

                          {/* LINE COST DISPLAY & REMOVE */}
                          <div className="sm:col-span-2 flex items-center justify-between">
                            <span className="font-bold text-wine">
                              {formatMoney(lineCost)}
                            </span>
                            {formIngredients.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeIngredientRow(idx)}
                                className="p-1 text-neutral-400 hover:text-rose-600 rounded transition"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIVE COST ESTIMATE SUMMARY */}
              <div className="p-4 rounded-xl bg-wine/5 border border-wine/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-neutral-600 block">
                    Calculated Total Recipe Cost:
                  </span>
                  <span className="font-extrabold text-wine text-base">
                    {formatMoney(liveFormCost.total)}
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-neutral-600 block">
                    Cost per Yield ({formYieldQty} {formYieldUnit}):
                  </span>
                  <span className="font-bold text-ink text-sm">
                    {formatMoney(liveFormCost.costPerYield)} / {formYieldUnit}
                  </span>
                </div>
              </div>

              {/* MODAL ERROR ALERT */}
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* MODAL ACTIONS */}
              <div className="pt-3 border-t border-cream2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-4 py-2 rounded-xl border border-cream2 text-xs font-semibold text-neutral-600 hover:bg-cream transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-wine text-xs py-2 px-5 shadow-sm flex items-center gap-2 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Recipe...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Save Recipe
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECIPE DETAIL DRAWER */}
      {selectedRecipeDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-cream2 flex flex-col overflow-hidden text-neutral-800">
            {/* DRAWER HEADER */}
            <div className="p-5 border-b border-cream2 bg-cream/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ChefHat className="w-5 h-5 text-wine" />
                <h3 className="font-serif font-bold text-lg text-ink">Recipe Breakdown</h3>
              </div>
              <button
                onClick={() => setSelectedRecipeDetail(null)}
                className="p-1.5 rounded-full hover:bg-cream2 text-neutral-400 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DRAWER BODY */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  {selectedRecipeDetail.menu_items?.category || "Category"}
                </span>
                <h2 className="font-serif font-extrabold text-xl text-ink mt-0.5">
                  {selectedRecipeDetail.name}
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Dish: <strong className="text-neutral-800">{selectedRecipeDetail.menu_items?.title}</strong> • Selling Price:{" "}
                  <strong className="text-wine">{formatMoney(selectedRecipeDetail.menu_items?.price)}</strong>
                </p>
              </div>

              {/* FINANCIAL BREAKDOWN CARD */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between text-neutral-600">
                  <span>Recipe Yield:</span>
                  <span className="font-semibold text-neutral-900">
                    {selectedRecipeDetail.yield_quantity} {selectedRecipeDetail.yield_unit}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Total Ingredient Cost:</span>
                  <span className="font-semibold text-neutral-900">
                    {formatMoney(selectedRecipeDetail.total_cost)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Cost per Yield/Portion:</span>
                  <span className="font-bold text-wine">
                    {formatMoney(selectedRecipeDetail.cost_per_yield)}
                  </span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-neutral-900">
                  <span>Food Cost Percentage:</span>
                  <span className="text-indigo-700">
                    {selectedRecipeDetail.food_cost_percentage}%
                  </span>
                </div>
              </div>

              {/* INGREDIENTS TABLE */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                  Ingredients Breakdown ({selectedRecipeDetail.recipe_ingredients?.length || 0})
                </h4>

                {!selectedRecipeDetail.recipe_ingredients || selectedRecipeDetail.recipe_ingredients.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No ingredients listed.</p>
                ) : (
                  <div className="border border-cream2 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-cream/40 text-neutral-500 font-semibold border-b border-cream2">
                          <th className="p-2.5">Item</th>
                          <th className="p-2.5 text-right">Qty</th>
                          <th className="p-2.5 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream2">
                        {selectedRecipeDetail.recipe_ingredients.map((ing) => {
                          const unitCost = Number(ing.inventory_items?.cost_per_unit || 0);
                          const lineCost = unitCost * Number(ing.quantity || 0);
                          return (
                            <tr key={ing.id} className="hover:bg-cream/10">
                              <td className="p-2.5 font-medium text-neutral-800">
                                {ing.inventory_items?.name || "Inventory Item"}
                                <span className="block text-[10px] text-neutral-400">
                                  {formatMoney(unitCost)}/{ing.unit}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-medium text-neutral-700 whitespace-nowrap">
                                {ing.quantity} {ing.unit}
                              </td>
                              <td className="p-2.5 text-right font-bold text-wine whitespace-nowrap">
                                {formatMoney(lineCost)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* DRAWER FOOTER */}
            <div className="p-4 border-t border-cream2 bg-white flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const target = selectedRecipeDetail;
                  setSelectedRecipeDetail(null);
                  handleOpenEdit(target);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-wine hover:bg-wine-dark text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Recipe
              </button>
              <button
                onClick={() => setSelectedRecipeDetail(null)}
                className="py-2 px-4 rounded-xl border border-cream2 font-semibold text-xs text-neutral-600 hover:bg-cream transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
