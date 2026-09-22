"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Utensils,
  Plus,
  Search,
  Trash2,
  Edit2,
  Clock,
  Loader2,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Flame
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/data/menu";
import {
  setMenuAvailability,
  setMenuPrice,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  type UpdateMenuItemInput
} from "@/actions/admin";
import { getActiveRestaurantId } from "@/actions/tenant";
import type { MenuItem } from "@/lib/order";

const DEFAULT_CUISINES = ["France", "Italy", "Japan", "India", "Spain", "Patisserie", "Beverages", "Desserts"];

export default function MenuAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Add / Edit Item Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    cuisine: "France",
    price: "",
    prep_minutes: "15",
    short: "",
    image: "",
    dietary: "",
    spice: "0",
    available: true,
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const restaurantId = await getActiveRestaurantId();
    if (!restaurantId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort", { ascending: true });

    setItems((data ?? []) as MenuItem[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived Categories List
  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CUISINES);
    items.forEach((it) => {
      if (it.cuisine) set.add(it.cuisine);
    });
    return ["All", ...Array.from(set)];
  }, [items]);

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchCat = activeCategory === "All" || it.cuisine === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        it.title.toLowerCase().includes(q) ||
        (it.short && it.short.toLowerCase().includes(q)) ||
        (it.dietary && it.dietary.some((d) => d.toLowerCase().includes(q)));
      return matchCat && matchSearch;
    });
  }, [items, activeCategory, searchQuery]);

  // Toggle Availability Action
  async function handleToggleAvailability(it: MenuItem) {
    setBusy(it.id);
    const nextVal = !it.available;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, available: nextVal } : x)));
    await setMenuAvailability(it.id, nextVal);
    setBusy(null);
  }

  // Quick Inline Price Edit
  async function handlePriceBlur(it: MenuItem, newPriceStr: string) {
    const price = Number(newPriceStr);
    if (!Number.isFinite(price) || price < 0 || price === it.price) return;
    setBusy(it.id);
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, price } : x)));
    await setMenuPrice(it.id, price);
    setBusy(null);
  }

  // Delete Action
  async function handleDelete(it: MenuItem) {
    if (!confirm(`Are you sure you want to delete "${it.title}"? This action cannot be undone.`)) return;
    setBusy(it.id);
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    await deleteMenuItem(it.id);
    setBusy(null);
  }

  // Open Modal (Add Mode or Edit Mode)
  function openAddModal() {
    setEditingItem(null);
    setForm({
      title: "",
      cuisine: activeCategory !== "All" ? activeCategory : "France",
      price: "",
      prep_minutes: "15",
      short: "",
      image: "",
      dietary: "",
      spice: "0",
      available: true,
    });
    setErrorMsg(null);
    setShowModal(true);
  }

  function openEditModal(it: MenuItem) {
    setEditingItem(it);
    setForm({
      title: it.title,
      cuisine: it.cuisine || "France",
      price: String(it.price),
      prep_minutes: String(it.prep_minutes || 15),
      short: it.short || "",
      image: it.image || "",
      dietary: it.dietary ? it.dietary.join(", ") : "",
      spice: String(it.spice || 0),
      available: it.available,
    });
    setErrorMsg(null);
    setShowModal(true);
  }

  // Handle Form Submit
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setErrorMsg(null);
    const title = form.title.trim();
    if (!title) {
      setErrorMsg("Dish name is required.");
      return;
    }

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setErrorMsg("Please enter a valid price.");
      return;
    }

    const prepMins = Number(form.prep_minutes);
    if (!Number.isInteger(prepMins) || prepMins < 1) {
      setErrorMsg("Preparation time must be at least 1 minute.");
      return;
    }

    setSaving(true);
    const dietaryList = form.dietary
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingItem) {
      // Edit mode
      const input: UpdateMenuItemInput = {
        id: editingItem.id,
        title,
        cuisine: form.cuisine,
        price,
        prep_minutes: prepMins,
        short: form.short,
        image: form.image,
        dietary: dietaryList,
        spice: Number(form.spice),
        available: form.available,
      };
      const res = await updateMenuItem(input);
      setSaving(false);
      if (res.ok) {
        setShowModal(false);
        load();
      } else {
        setErrorMsg(res.error || "Failed to update item.");
      }
    } else {
      // Add mode
      const res = await addMenuItem({
        title,
        cuisine: form.cuisine,
        price,
        prep_minutes: prepMins,
        short: form.short,
        image: form.image,
        dietary: dietaryList,
        spice: Number(form.spice),
      });
      setSaving(false);
      if (res.ok) {
        setShowModal(false);
        load();
      } else {
        setErrorMsg(res.error || "Failed to add item.");
      }
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink flex items-center gap-2.5">
            <Utensils className="text-wine" size={28} /> Menu Management
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Manage dishes, pricing, preparation times, and availability live
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={openAddModal} className="btn-wine text-xs py-2 px-4 shadow-xs flex items-center gap-1.5">
            <Plus size={16} /> Add Item
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

      {/* Toolbar: Search & Category Filter Pills */}
      <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-neutral-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by dish name, description, tags…"
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

          <div className="text-xs text-neutral-500 font-mono">
            Showing {filteredItems.length} of {items.length} dishes
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none border-t border-cream2/60">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
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

      {/* Main Grid Content */}
      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
          <Loader2 className="animate-spin text-gold" size={28} />
          <span className="text-sm font-medium">Loading restaurant menu…</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-cream2 space-y-3">
          <Utensils size={36} className="mx-auto text-neutral-300" />
          <h3 className="font-serif text-lg font-semibold text-ink">No menu items found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery || activeCategory !== "All"
              ? "Try adjusting your search query or category filter."
              : "Get started by adding your first dish to the menu."}
          </p>
          <button onClick={openAddModal} className="btn-wine text-xs py-2 px-4 mx-auto">
            <Plus size={14} /> Add Item
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((it) => (
            <div
              key={it.id}
              className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                it.available ? "border-cream2" : "border-neutral-200 bg-neutral-50/50"
              }`}
            >
              <div>
                {/* Header Row: Cuisine & Prep Time */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cream text-neutral-700">
                    {it.cuisine}
                  </span>

                  <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1 bg-cream/60 px-2 py-0.5 rounded-md">
                    <Clock size={12} className="text-gold" />
                    {it.prep_minutes || 15}m prep
                  </span>
                </div>

                {/* Dish Title & Image */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-ink leading-snug">{it.title}</h3>
                    {it.short && <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{it.short}</p>}
                  </div>
                </div>

                {/* Dietary Tags & Spice */}
                <div className="flex flex-wrap items-center gap-1 mt-2.5">
                  {it.spice ? (
                    <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-mono font-semibold border border-red-200">
                      {"🌶".repeat(it.spice)}
                    </span>
                  ) : null}

                  {it.dietary &&
                    it.dietary.map((d, k) => (
                      <span
                        key={k}
                        className="text-[10px] font-medium bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200"
                      >
                        {d}
                      </span>
                    ))}
                </div>
              </div>

              {/* Price, Availability & Actions Footer */}
              <div className="mt-4 pt-3 border-t border-cream2 space-y-3">
                <div className="flex items-center justify-between">
                  {/* Price Field */}
                  <div className="flex items-center gap-1 font-serif font-bold text-lg text-wine">
                    <span>₹</span>
                    <input
                      type="number"
                      defaultValue={it.price}
                      onBlur={(e) => handlePriceBlur(it, e.target.value)}
                      className="w-20 font-serif font-bold text-lg text-wine bg-transparent focus:bg-white border-b border-transparent focus:border-wine px-1 py-0.5 transition-all outline-none"
                    />
                  </div>

                  {/* Availability Badge & Toggle */}
                  <button
                    onClick={() => handleToggleAvailability(it)}
                    disabled={busy === it.id}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      it.available
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200"
                    }`}
                  >
                    {it.available ? (
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : (
                      <XCircle size={13} className="text-neutral-400" />
                    )}
                    <span>{it.available ? "Available" : "Sold Out"}</span>
                  </button>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-cream2/60 text-xs">
                  <button
                    onClick={() => openEditModal(it)}
                    className="p-1.5 rounded-lg text-neutral-600 hover:text-wine hover:bg-cream transition-colors flex items-center gap-1 font-medium"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(it)}
                    disabled={busy === it.id}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 font-medium"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT MENU ITEM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-lg border border-cream2 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <h3 className="font-serif font-bold text-xl text-ink">
                {editingItem ? "Edit Dish" : "Add New Dish"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1 text-neutral-700">Dish Name *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Chicken Biryani, Truffle Pasta"
                    className="field text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">Cuisine / Category *</label>
                  <select
                    value={form.cuisine}
                    onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
                    className="field"
                  >
                    {categories
                      .filter((c) => c !== "All")
                      .map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="350"
                    className="field font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">Preparation Time (Minutes) *</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={form.prep_minutes}
                    onChange={(e) => setForm({ ...form, prep_minutes: e.target.value })}
                    placeholder="15"
                    className="field font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1 text-neutral-700">Spice Level</label>
                  <select
                    value={form.spice}
                    onChange={(e) => setForm({ ...form, spice: e.target.value })}
                    className="field"
                  >
                    <option value="0">No spice</option>
                    <option value="1">Mild 🌶</option>
                    <option value="2">Medium 🌶🌶</option>
                    <option value="3">Hot 🌶🌶🌶</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1 text-neutral-700">Dietary Tags (comma separated)</label>
                  <input
                    type="text"
                    value={form.dietary}
                    onChange={(e) => setForm({ ...form, dietary: e.target.value })}
                    placeholder="e.g. Veg, Vegan, GF, Chef Special"
                    className="field"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1 text-neutral-700">Short Description</label>
                  <textarea
                    rows={2}
                    value={form.short}
                    onChange={(e) => setForm({ ...form, short: e.target.value })}
                    placeholder="Brief description of ingredients or preparation style…"
                    className="field resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1 text-neutral-700">Image Path / URL (optional)</label>
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    placeholder="/img/menu/biryani.jpg"
                    className="field font-mono text-[11px]"
                  />
                </div>

                {editingItem && (
                  <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="menu-avail-check"
                      checked={form.available}
                      onChange={(e) => setForm({ ...form, available: e.target.checked })}
                      className="w-4 h-4 text-wine rounded"
                    />
                    <label htmlFor="menu-avail-check" className="font-medium text-neutral-700 cursor-pointer">
                      Dish is currently available on menu
                    </label>
                  </div>
                )}
              </div>

              {errorMsg && <p className="text-wine font-medium text-xs">{errorMsg}</p>}

              <div className="pt-3 border-t border-cream2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-wine py-2 px-5 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : editingItem ? "Update Dish" : "Save Dish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
