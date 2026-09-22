"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
  X,
  Edit2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  History,
  TrendingDown,
  PackageCheck,
  Scale
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addInventoryItem,
  updateInventoryItem,
  recordStockMovementAction,
  type AddInventoryItemInput,
  type UpdateInventoryItemInput
} from "@/actions/admin";
import { getActiveRestaurantId } from "@/actions/tenant";

type InventoryItem = {
  id: string;
  restaurant_id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: "kg" | "g" | "l" | "ml" | "piece" | "dozen" | "packet" | "box";
  quantity: number;
  reorder_level: number;
  cost_per_unit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type StockMovement = {
  id: string;
  inventory_item_id: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  previous_quantity: number;
  resulting_quantity: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

const UNITS = ["kg", "g", "l", "ml", "piece", "dozen", "packet", "box"] as const;
const UNIT_OPTIONS: { value: InventoryItem["unit"]; label: string }[] = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Litre (l)" },
  { value: "ml", label: "Millilitre (ml)" },
  { value: "piece", label: "Piece" },
  { value: "dozen", label: "Dozen" },
  { value: "packet", label: "Packet" },
  { value: "box", label: "Box" },
];
const CATEGORIES = ["General", "Produce", "Dairy", "Meat & Seafood", "Pantry & Spices", "Beverages", "Packaging"];

export default function InventoryAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Sub-Navigation Tabs: "overview" | "stock" | "low_stock" | "movements"
  const [viewTab, setViewTab] = useState<"overview" | "stock" | "low_stock" | "movements">("overview");

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "low_stock" | "out_of_stock">("all");

  // Add / Edit Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    category: "General",
    unit: "kg" as InventoryItem["unit"],
    opening_quantity: "0",
    reorder_level: "5",
    cost_per_unit: "0",
    is_active: true,
  });
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // Stock Movement Modal State (Add / Remove / Adjust Stock)
  const [movementModalItem, setMovementModalItem] = useState<{
    item: InventoryItem;
    type: "IN" | "OUT" | "ADJUSTMENT";
  } | null>(null);
  const [movementForm, setMovementForm] = useState({
    quantity: "",
    reason: "",
  });
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const restaurantId = await getActiveRestaurantId();
    if (!restaurantId) {
      setItems([]);
      setMovements([]);
      setLoading(false);
      return;
    }

    const [resItems, resMovements] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true }),
      supabase
        .from("stock_movements")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    setItems((resItems.data ?? []) as InventoryItem[]);
    setMovements((resMovements.data ?? []) as StockMovement[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("inventory-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, load]);

  // Derived Item Categories
  const categoryList = useMemo(() => {
    const set = new Set(CATEGORIES);
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ["All", ...Array.from(set)];
  }, [items]);

  // Derived Helper Maps & Stock Calculations
  const itemMap = useMemo(() => {
    return Object.fromEntries(items.map((it) => [it.id, it]));
  }, [items]);

  const lowStockItems = useMemo(() => {
    return items.filter((it) => it.is_active && Number(it.quantity) <= Number(it.reorder_level) && Number(it.quantity) > 0);
  }, [items]);

  const outOfStockItems = useMemo(() => {
    return items.filter((it) => it.is_active && Number(it.quantity) <= 0);
  }, [items]);

  const availableItems = useMemo(() => {
    return items.filter((it) => it.is_active && Number(it.quantity) > Number(it.reorder_level));
  }, [items]);

  // Filtered Stock Items Table
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchCat = activeCategory === "All" || it.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        it.name.toLowerCase().includes(q) ||
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        it.category.toLowerCase().includes(q);

      const qty = Number(it.quantity);
      const reorder = Number(it.reorder_level);

      let matchStatus = true;
      if (statusFilter === "available") matchStatus = qty > reorder;
      if (statusFilter === "low_stock") matchStatus = qty <= reorder && qty > 0;
      if (statusFilter === "out_of_stock") matchStatus = qty <= 0;

      return matchCat && matchSearch && matchStatus;
    });
  }, [items, activeCategory, searchQuery, statusFilter]);

  // Open Add / Edit Item Modal
  function openAddItemModal() {
    setEditingItem(null);
    setItemForm({
      name: "",
      sku: "",
      category: activeCategory !== "All" ? activeCategory : "General",
      unit: "kg",
      opening_quantity: "0",
      reorder_level: "5",
      cost_per_unit: "0",
      is_active: true,
    });
    setItemError(null);
    setShowItemModal(true);
  }

  function openEditItemModal(it: InventoryItem) {
    setEditingItem(it);
    setItemForm({
      name: it.name,
      sku: it.sku || "",
      category: it.category || "General",
      unit: it.unit,
      opening_quantity: String(it.quantity),
      reorder_level: String(it.reorder_level),
      cost_per_unit: String(it.cost_per_unit),
      is_active: it.is_active,
    });
    setItemError(null);
    setShowItemModal(true);
  }

  // Handle Add / Edit Item Submit
  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (savingItem) return;

    setItemError(null);
    const name = itemForm.name.trim();
    if (!name) {
      setItemError("Ingredient name is required.");
      return;
    }

    const reorderLevel = Number(itemForm.reorder_level);
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      setItemError("Please enter a valid reorder threshold level.");
      return;
    }

    const cost = Number(itemForm.cost_per_unit);
    if (!Number.isFinite(cost) || cost < 0) {
      setItemError("Please enter a valid cost per unit.");
      return;
    }

    setSavingItem(true);

    if (editingItem) {
      const res = await updateInventoryItem({
        id: editingItem.id,
        name,
        sku: itemForm.sku,
        category: itemForm.category,
        unit: itemForm.unit,
        reorder_level: reorderLevel,
        cost_per_unit: cost,
        is_active: itemForm.is_active,
      });
      setSavingItem(false);
      if (res.ok) {
        setShowItemModal(false);
        load();
      } else {
        setItemError(res.error);
      }
    } else {
      const openingQty = Number(itemForm.opening_quantity);
      if (!Number.isFinite(openingQty) || openingQty < 0) {
        setSavingItem(false);
        setItemError("Please enter a valid non-negative opening quantity.");
        return;
      }
      const res = await addInventoryItem({
        name,
        sku: itemForm.sku,
        category: itemForm.category,
        unit: itemForm.unit,
        opening_quantity: openingQty,
        reorder_level: reorderLevel,
        cost_per_unit: cost,
      });
      setSavingItem(false);
      if (res.ok) {
        setShowItemModal(false);
        load();
      } else {
        setItemError(res.error);
      }
    }
  }

  // Open Stock Movement Modal
  function openMovementModal(item: InventoryItem, type: "IN" | "OUT" | "ADJUSTMENT") {
    setMovementModalItem({ item, type });
    setMovementForm({
      quantity: type === "ADJUSTMENT" ? String(item.quantity) : "",
      reason: "",
    });
    setMovementError(null);
  }

  // Handle Stock Movement Submit
  async function handleMovementSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!movementModalItem || savingMovement) return;

    setMovementError(null);
    const qty = Number(movementForm.quantity);
    if (!Number.isFinite(qty)) {
      setMovementError("Please enter a valid numeric quantity.");
      return;
    }

    if ((movementModalItem.type === "IN" || movementModalItem.type === "OUT") && qty <= 0) {
      setMovementError("Quantity must be greater than zero.");
      return;
    }

    if (movementModalItem.type === "ADJUSTMENT" && qty < 0) {
      setMovementError("Adjustment quantity cannot be negative.");
      return;
    }

    setSavingMovement(true);
    const res = await recordStockMovementAction({
      inventory_item_id: movementModalItem.item.id,
      type: movementModalItem.type,
      quantity: qty,
      reason: movementForm.reason,
    });
    setSavingMovement(false);

    if (res.ok) {
      setMovementModalItem(null);
      load();
    } else {
      setMovementError(res.error);
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink flex items-center gap-2.5">
            <Boxes className="text-wine" size={28} /> Inventory & Stock
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Manage ingredients, track stock levels, and audit stock movements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={openAddItemModal} className="btn-wine text-xs py-2 px-4 shadow-xs flex items-center gap-1.5">
            <Plus size={16} /> Add Ingredient
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-cream2 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setViewTab("overview")}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              viewTab === "overview" ? "bg-wine text-white shadow-xs" : "text-neutral-600 hover:bg-cream"
            }`}
          >
            <PackageCheck size={14} /> Overview
          </button>
          <button
            onClick={() => setViewTab("stock")}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              viewTab === "stock" ? "bg-wine text-white shadow-xs" : "text-neutral-600 hover:bg-cream"
            }`}
          >
            <Boxes size={14} /> Stock List ({items.length})
          </button>
          <button
            onClick={() => setViewTab("low_stock")}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              viewTab === "low_stock" ? "bg-wine text-white shadow-xs" : "text-neutral-600 hover:bg-cream"
            }`}
          >
            <AlertTriangle size={14} className={lowStockItems.length + outOfStockItems.length > 0 ? "text-gold animate-bounce" : ""} />
            Low Stock Alerts ({lowStockItems.length + outOfStockItems.length})
          </button>
          <button
            onClick={() => setViewTab("movements")}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              viewTab === "movements" ? "bg-wine text-white shadow-xs" : "text-neutral-600 hover:bg-cream"
            }`}
          >
            <History size={14} /> Movement Audit
          </button>
        </div>
      </div>

      {/* VIEW TAB 1: OVERVIEW */}
      {viewTab === "overview" && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">Total Ingredients</div>
              <div className="font-serif text-3xl font-bold text-ink">{items.length}</div>
              <div className="text-[11px] text-neutral-500 font-mono">Active items in catalog</div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 flex items-center justify-between">
                <span>In Stock</span>
                <CheckCircle2 size={15} className="text-emerald-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-emerald-900">{availableItems.length}</div>
              <div className="text-[11px] text-emerald-700 font-mono">Sufficient inventory level</div>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 flex items-center justify-between">
                <span>Low Stock</span>
                <AlertTriangle size={15} className="text-amber-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-amber-900">{lowStockItems.length}</div>
              <div className="text-[11px] text-amber-700 font-mono">Below reorder threshold</div>
            </div>

            <div className="bg-red-50/60 border border-red-200 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-red-800 flex items-center justify-between">
                <span>Out of Stock</span>
                <XCircle size={15} className="text-red-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-red-900">{outOfStockItems.length}</div>
              <div className="text-[11px] text-red-700 font-mono">Critical replenishment required</div>
            </div>
          </div>

          {/* Critical Alerts Banner */}
          {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-serif font-bold text-amber-900 text-base">
                    Inventory Replenishment Alert
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {outOfStockItems.length} items out of stock and {lowStockItems.length} items below reorder threshold.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewTab("low_stock")}
                className="btn-wine text-xs py-2 px-4 shrink-0 shadow-xs"
              >
                View Low Stock
              </button>
            </div>
          )}

          {/* Recent Stock Movements Stream */}
          <div className="bg-white rounded-2xl border border-cream2 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
                <History size={18} className="text-wine" /> Recent Movement Stream
              </h3>
              <button
                onClick={() => setViewTab("movements")}
                className="text-xs font-semibold text-wine hover:underline"
              >
                View Full Movement Audit →
              </button>
            </div>

            {movements.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">No stock movements recorded yet.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {movements.slice(0, 5).map((m) => {
                  const targetItem = itemMap[m.inventory_item_id];
                  const isAdd = m.type === "IN";
                  const isRemove = m.type === "OUT";

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-cream2 bg-cream/20 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl font-bold ${
                            isAdd
                              ? "bg-emerald-100 text-emerald-800"
                              : isRemove
                              ? "bg-red-100 text-red-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {isAdd ? <ArrowDownLeft size={16} /> : isRemove ? <ArrowUpRight size={16} /> : <Sliders size={16} />}
                        </div>
                        <div>
                          <span className="font-bold text-ink text-sm block">
                            {targetItem?.name || "Ingredient"}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-mono">
                            {new Date(m.created_at).toLocaleString()} · {m.reason || "Stock update"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span
                          className={`font-bold text-sm block ${
                            isAdd ? "text-emerald-700" : isRemove ? "text-red-700" : "text-indigo-700"
                          }`}
                        >
                          {isAdd ? "+" : isRemove ? "-" : ""}{m.quantity} {targetItem?.unit || ""}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          {m.previous_quantity} {targetItem?.unit || ""} → {m.resulting_quantity} {targetItem?.unit || ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW TAB 2: STOCK LIST */}
      {viewTab === "stock" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-neutral-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ingredient, SKU, category…"
                  className="field text-xs pl-9 pr-8 py-2"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-500 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="field py-1.5 text-xs w-36"
                >
                  <option value="all">All Items</option>
                  <option value="available">Available</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none border-t border-cream2/60">
              {categoryList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-wine text-white shadow-xs"
                      : "bg-cream text-neutral-600 hover:bg-cream2"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Items Table */}
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
              <Loader2 className="animate-spin text-gold" size={28} />
              <span className="text-sm font-medium">Loading inventory stock…</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-cream2 space-y-3">
              <Boxes size={36} className="mx-auto text-neutral-300" />
              <h3 className="font-serif text-lg font-semibold text-ink">No ingredients found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {searchQuery || activeCategory !== "All" || statusFilter !== "all"
                  ? "Try clearing your search or status filter."
                  : "Add ingredients to start tracking inventory levels."}
              </p>
              <button onClick={openAddItemModal} className="btn-wine text-xs py-2 px-4 mx-auto">
                <Plus size={14} /> Add Ingredient
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-cream2 shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-cream/40 text-neutral-500 border-b border-cream2 uppercase font-semibold">
                    <th className="py-3 px-4">Ingredient</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Reorder Level</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Cost / Unit</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream2">
                  {filteredItems.map((it) => {
                    const qty = Number(it.quantity);
                    const reorder = Number(it.reorder_level);
                    const isOut = qty <= 0;
                    const isLow = qty <= reorder && qty > 0;

                    let statusBadge = {
                      label: "Available",
                      bg: "bg-emerald-50 text-emerald-800 border-emerald-300",
                      icon: <CheckCircle2 size={12} className="text-emerald-600" />,
                    };
                    if (isOut) {
                      statusBadge = {
                        label: "Out of Stock",
                        bg: "bg-red-50 text-red-800 border-red-300 font-bold",
                        icon: <XCircle size={12} className="text-red-600" />,
                      };
                    } else if (isLow) {
                      statusBadge = {
                        label: "Low Stock",
                        bg: "bg-amber-50 text-amber-800 border-amber-300 font-semibold",
                        icon: <AlertTriangle size={12} className="text-amber-600" />,
                      };
                    }

                    return (
                      <tr key={it.id} className="hover:bg-cream/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-ink">
                          <div>{it.name}</div>
                          {it.sku && <div className="text-[10px] text-neutral-400 font-mono">SKU: {it.sku}</div>}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">{it.category}</td>
                        <td className="py-3 px-4 font-mono font-bold text-sm text-ink">
                          {qty} <span className="text-xs font-normal text-neutral-500">{it.unit}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-500">
                          {reorder} {it.unit}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
                          >
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-wine">
                          ₹{Number(it.cost_per_unit).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openMovementModal(it, "IN")}
                              className="px-2.5 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-300 transition-colors whitespace-nowrap"
                              title="Add Stock"
                            >
                              + Add Stock
                            </button>
                            <button
                              onClick={() => openMovementModal(it, "OUT")}
                              className="px-2.5 py-1 text-[11px] bg-red-50 hover:bg-red-100 text-red-800 font-semibold rounded-lg border border-red-300 transition-colors whitespace-nowrap"
                              title="Remove Stock"
                            >
                              - Remove Stock
                            </button>
                            <button
                              onClick={() => openMovementModal(it, "ADJUSTMENT")}
                              className="px-2.5 py-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold rounded-lg border border-indigo-300 transition-colors whitespace-nowrap"
                              title="Adjust Stock Quantity"
                            >
                              Adjust Qty
                            </button>
                            <button
                              onClick={() => openEditItemModal(it)}
                              className="px-2 py-1 text-[11px] text-neutral-600 hover:text-wine bg-cream/50 hover:bg-cream rounded-lg border border-cream2 transition-colors flex items-center gap-1 whitespace-nowrap"
                              title="Edit Ingredient"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW TAB 3: LOW STOCK VIEW */}
      {viewTab === "low_stock" && (
        <div className="space-y-6">
          {/* Out of Stock Section */}
          <div className="bg-white rounded-2xl border border-cream2 p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-red-900 flex items-center gap-2">
              <XCircle className="text-red-600" size={20} /> Out of Stock ({outOfStockItems.length})
            </h3>

            {outOfStockItems.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                Great! No ingredients are currently out of stock.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {outOfStockItems.map((it) => (
                  <div key={it.id} className="p-4 rounded-xl border border-red-300 bg-red-50/40 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-serif font-bold text-base text-ink">{it.name}</div>
                        <div className="text-[11px] text-neutral-500">{it.category}</div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                        Out of stock
                      </span>
                    </div>

                    <div className="text-xs font-mono text-neutral-600">
                      Reorder Threshold: <b>{it.reorder_level} {it.unit}</b>
                    </div>

                    <button
                      onClick={() => openMovementModal(it, "IN")}
                      className="w-full btn-wine py-2 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Replenish Stock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Section */}
          <div className="bg-white rounded-2xl border border-cream2 p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-amber-900 flex items-center gap-2">
              <AlertTriangle className="text-amber-600" size={20} /> Below Reorder Threshold ({lowStockItems.length})
            </h3>

            {lowStockItems.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4">No low stock warnings right now.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {lowStockItems.map((it) => (
                  <div key={it.id} className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-serif font-bold text-base text-ink">{it.name}</div>
                        <div className="text-[11px] text-neutral-500">{it.category}</div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        Low stock
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Current: <b className="text-amber-900 text-sm">{it.quantity} {it.unit}</b></span>
                      <span className="text-neutral-500">Reorder at: {it.reorder_level} {it.unit}</span>
                    </div>

                    <button
                      onClick={() => openMovementModal(it, "IN")}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Add Stock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW TAB 4: STOCK MOVEMENTS AUDIT */}
      {viewTab === "movements" && (
        <div className="bg-white rounded-2xl border border-cream2 p-5 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
            <History size={20} className="text-wine" /> Immutable Movement Audit Log
          </h3>

          {movements.length === 0 ? (
            <p className="text-xs text-neutral-400 py-10 text-center">No movements recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-cream/40 text-neutral-500 border-b border-cream2 uppercase font-semibold">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Ingredient</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Before → After</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream2 font-mono">
                  {movements.map((m) => {
                    const targetItem = itemMap[m.inventory_item_id];
                    const isAdd = m.type === "IN";
                    const isRemove = m.type === "OUT";

                    return (
                      <tr key={m.id} className="hover:bg-cream/30 transition-colors">
                        <td className="py-3 px-4 text-neutral-500">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-ink">
                          {targetItem?.name || "Ingredient"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isAdd
                                ? "bg-emerald-100 text-emerald-800"
                                : isRemove
                                ? "bg-red-100 text-red-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-sm">
                          {isAdd ? "+" : isRemove ? "-" : ""}{m.quantity} {targetItem?.unit || ""}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">
                          {m.previous_quantity} {targetItem?.unit || ""} → <b className="text-ink">{m.resulting_quantity} {targetItem?.unit || ""}</b>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 font-sans">
                          {m.reason || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT INGREDIENT MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-lg border border-cream2 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <h3 className="font-serif font-bold text-xl text-ink">
                {editingItem ? "Edit Ingredient" : "Add New Ingredient"}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-neutral-400 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1 text-neutral-700">Ingredient Name *</label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g. Basmati Rice, Olive Oil, Chicken Breast"
                    className="field text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">SKU / Code (optional)</label>
                  <input
                    type="text"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    placeholder="ING-101"
                    className="field font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="field"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">Unit of Measurement *</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value as InventoryItem["unit"] })}
                    className="field"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingItem && (
                  <div>
                    <label className="block font-medium mb-1 text-neutral-700">Opening Stock Quantity *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={itemForm.opening_quantity}
                      onChange={(e) => setItemForm({ ...itemForm, opening_quantity: e.target.value })}
                      placeholder="10"
                      className="field font-mono"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">Reorder Threshold Level *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={itemForm.reorder_level}
                    onChange={(e) => setItemForm({ ...itemForm, reorder_level: e.target.value })}
                    placeholder="5"
                    className="field font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">Cost per Unit (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={itemForm.cost_per_unit}
                    onChange={(e) => setItemForm({ ...itemForm, cost_per_unit: e.target.value })}
                    placeholder="150"
                    className="field font-mono"
                    required
                  />
                </div>

                {editingItem && (
                  <>
                    <div className="sm:col-span-2 bg-cream/40 p-3.5 rounded-xl border border-cream2 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">Current Stock</span>
                        <span className="text-base font-bold font-mono text-ink">
                          {editingItem.quantity} {editingItem.unit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowItemModal(false);
                          openMovementModal(editingItem, "ADJUSTMENT");
                        }}
                        className="text-xs font-semibold text-wine hover:text-wine/80 flex items-center gap-1 hover:underline"
                      >
                        Adjust Stock <ArrowUpRight size={14} />
                      </button>
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="item-active-check"
                        checked={itemForm.is_active}
                        onChange={(e) => setItemForm({ ...itemForm, is_active: e.target.checked })}
                        className="w-4 h-4 text-wine rounded"
                      />
                      <label htmlFor="item-active-check" className="font-medium text-neutral-700 cursor-pointer">
                        Item is active in inventory catalog
                      </label>
                    </div>
                  </>
                )}
              </div>

              {itemError && <p className="text-wine font-medium text-xs">{itemError}</p>}

              <div className="pt-3 border-t border-cream2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="btn-outline py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="btn-wine py-2 px-5 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingItem ? <Loader2 className="animate-spin" size={14} /> : editingItem ? "Update Ingredient" : "Save Ingredient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK MOVEMENT MODAL (ADD / REMOVE / ADJUST STOCK) */}
      {movementModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lg border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-ink">
                  {movementModalItem.type === "IN"
                    ? "Add Stock Quantity (+)"
                    : movementModalItem.type === "OUT"
                    ? "Remove Stock Quantity (-)"
                    : "Adjust Stock Quantity"}
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  {movementModalItem.item.name} · Current Stock:{" "}
                  <b className="text-ink font-mono">{movementModalItem.item.quantity} {movementModalItem.item.unit}</b>
                </p>
              </div>
              <button onClick={() => setMovementModalItem(null)} className="text-neutral-400 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-4 text-xs">
              {movementModalItem.type === "ADJUSTMENT" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-cream/40 p-3 rounded-xl border border-cream2">
                      <span className="text-[10px] font-medium text-neutral-500 uppercase block">Current Quantity</span>
                      <span className="text-sm font-bold font-mono text-ink">
                        {movementModalItem.item.quantity} {movementModalItem.item.unit}
                      </span>
                    </div>

                    <div>
                      <label className="block font-medium mb-1 text-neutral-700">
                        New Quantity * ({movementModalItem.item.unit})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={movementForm.quantity}
                        onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                        placeholder="e.g. 15"
                        className="field text-sm font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-medium mb-1 text-neutral-700">
                    {movementModalItem.type === "IN" ? "Quantity to Add *" : "Quantity to Remove *"} ({movementModalItem.item.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                    placeholder="e.g. 5"
                    className="field text-sm font-mono font-bold"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-medium mb-1 text-neutral-700">Reason / Reference Note *</label>
                <textarea
                  rows={2}
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                  placeholder={
                    movementModalItem.type === "ADJUSTMENT"
                      ? "e.g. Weekly physical stock count audit"
                      : movementModalItem.type === "IN"
                      ? "e.g. Restock shipment received"
                      : "e.g. Kitchen prep consumption"
                  }
                  className="field resize-none"
                  required
                />
              </div>

              {/* Dynamic Preview & Difference Breakdown */}
              {movementForm.quantity !== "" && !isNaN(Number(movementForm.quantity)) && (
                <div className="bg-cream/60 p-3.5 rounded-xl border border-cream2 space-y-1.5 text-xs font-mono">
                  {movementModalItem.type === "ADJUSTMENT" ? (
                    <>
                      <div className="flex justify-between text-neutral-600">
                        <span>Current Quantity:</span>
                        <b>{movementModalItem.item.quantity} {movementModalItem.item.unit}</b>
                      </div>
                      <div className="flex justify-between text-ink">
                        <span>New Quantity:</span>
                        <b className="font-bold">{Number(movementForm.quantity)} {movementModalItem.item.unit}</b>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-cream2 text-wine font-bold">
                        <span>Difference:</span>
                        <span>
                          {Number(movementForm.quantity) - Number(movementModalItem.item.quantity) >= 0 ? "+" : ""}
                          {(Number(movementForm.quantity) - Number(movementModalItem.item.quantity)).toFixed(2)}{" "}
                          {movementModalItem.item.unit}
                        </span>
                      </div>
                    </>
                  ) : movementModalItem.type === "IN" ? (
                    <div className="flex justify-between text-emerald-800">
                      <span>Resulting Total:</span>
                      <b className="font-bold">
                        {(Number(movementModalItem.item.quantity) + Number(movementForm.quantity)).toFixed(2)}{" "}
                        {movementModalItem.item.unit}
                      </b>
                    </div>
                  ) : (
                    <div className="flex justify-between text-red-800">
                      <span>Resulting Total:</span>
                      <b className="font-bold">
                        {Math.max(0, Number(movementModalItem.item.quantity) - Number(movementForm.quantity)).toFixed(2)}{" "}
                        {movementModalItem.item.unit}
                      </b>
                    </div>
                  )}
                </div>
              )}

              {movementError && <p className="text-wine font-medium text-xs">{movementError}</p>}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMovementModalItem(null)}
                  className="btn-outline py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMovement}
                  className="btn-wine py-2 px-5 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingMovement ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : movementModalItem.type === "ADJUSTMENT" ? (
                    "Record Adjustment"
                  ) : (
                    "Record Movement"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
