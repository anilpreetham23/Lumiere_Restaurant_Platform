"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Utensils,
  User,
  Phone,
  FileText,
  Clock,
  ShoppingBag,
  ArrowLeft,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/actions/tenant";
import { createStaffOrderAction } from "@/actions/admin";

export type MenuItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  available: boolean;
  prep_minutes: number | null;
};

export type TableInfo = {
  id: string;
  label: string;
  section: string | null;
  seats: number;
  state: string;
  current_session_id?: string | null;
};

export type StaffOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedTable?: TableInfo | null;
  onSuccess?: () => void;
};

export type CartItem = {
  menuItem: MenuItem;
  qty: number;
  notes?: string;
};

const STATE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  free: { bg: "bg-emerald-100 border-emerald-300", text: "text-emerald-800", label: "Available" },
  occupied: { bg: "bg-wine/10 border-wine/30", text: "text-wine", label: "Occupied" },
  reserved: { bg: "bg-amber-100 border-amber-300", text: "text-amber-800", label: "Reserved" },
  bill_pending: { bg: "bg-indigo-100 border-indigo-300", text: "text-indigo-800", label: "Bill Pending" },
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

export function StaffOrderModal({
  isOpen,
  onClose,
  selectedTable,
  onSuccess,
}: StaffOrderModalProps) {
  const supabase = useMemo(() => createClient(), []);

  // Table selection state (if no pre-selected table)
  const [activeTable, setActiveTable] = useState<TableInfo | null>(selectedTable || null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  // Menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cart & Customer details state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Submission & Result state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Sync selectedTable prop when modal opens or prop changes
  useEffect(() => {
    if (selectedTable) {
      setActiveTable(selectedTable);
    } else {
      setActiveTable(null);
    }
  }, [selectedTable, isOpen]);

  // Load tables if table selector is needed
  const loadTables = useCallback(async () => {
    setLoadingTables(true);
    const resId = await getActiveRestaurantId();
    if (!resId) {
      setTables([]);
      setLoadingTables(false);
      return;
    }
    const { data } = await supabase
      .from("restaurant_tables")
      .select("id, label, section, seats, state, current_session_id")
      .eq("restaurant_id", resId)
      .neq("state", "out_of_service")
      .order("section")
      .order("label");
    setTables((data as TableInfo[]) || []);
    setLoadingTables(false);
  }, [supabase]);

  // Load menu items for active tenant
  const loadMenuItems = useCallback(async () => {
    setLoadingMenu(true);
    const resId = await getActiveRestaurantId();
    if (!resId) {
      setMenuItems([]);
      setLoadingMenu(false);
      return;
    }
    const { data } = await supabase
      .from("menu_items")
      .select("id, title, description, price, cuisine, available, prep_minutes")
      .eq("restaurant_id", resId)
      .order("cuisine")
      .order("title");
    const mapped = (data || []).map((item: any) => ({
      ...item,
      category: item.cuisine,
    }));
    setMenuItems((mapped as MenuItem[]) || []);
    setLoadingMenu(false);
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setOrderNotes("");
      setErrorMessage(null);
      setSuccessData(null);
      setSearchQuery("");
      setSelectedCategory("All");

      if (!selectedTable) {
        loadTables();
      }
      loadMenuItems();
    }
  }, [isOpen, selectedTable, loadTables, loadMenuItems]);

  // Categories extracted from loaded menu items
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ["All", ...Array.from(set)];
  }, [menuItems]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === "All" || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Filtered tables for table selector
  const filteredTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        (t.section && t.section.toLowerCase().includes(q))
    );
  }, [tables, tableSearch]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.available) return;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.menuItem.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { menuItem: item, qty: 1 }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.qty + delta;
            return newQty > 0 ? { ...c, qty: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== itemId));
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.menuItem.id === itemId ? { ...c, notes } : c))
    );
  };

  // Informational display subtotal
  const displayedSubtotal = useMemo(() => {
    return cart.reduce((sum, c) => sum + c.menuItem.price * c.qty, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, c) => sum + c.qty, 0);
  }, [cart]);

  // Handle Order Submission
  const handleSubmitOrder = async () => {
    if (!activeTable) {
      setErrorMessage("Please select a table before placing an order.");
      return;
    }
    if (cart.length === 0) {
      setErrorMessage("Cart cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      table_id: activeTable.id,
      items: cart.map((c) => ({
        menu_item_id: c.menuItem.id,
        qty: c.qty,
        notes: c.notes?.trim() || undefined,
      })),
      customer_name: customerName.trim() || undefined,
      phone: customerPhone.trim() || undefined,
      notes: orderNotes.trim() || undefined,
      source: "pos_manual" as const,
    };

    try {
      const res = await createStaffOrderAction(payload);
      if (!res.ok) {
        setErrorMessage(res.error || "Unable to place order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessData(res.result);
      setIsSubmitting(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-stone-800">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {activeTable && !selectedTable && (
              <button
                onClick={() => setActiveTable(null)}
                className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition"
                title="Change Table"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="p-2 rounded-xl bg-wine/10 text-wine">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 leading-tight">
                {successData
                  ? `Order #${successData.order_number} Placed`
                  : activeTable
                  ? `Take Order — Table ${activeTable.label}`
                  : "Select Table for New Order"}
              </h2>
              {activeTable && !successData && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-stone-500 font-medium">
                    {activeTable.section || "Main Floor"} • {activeTable.seats} Seats
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      STATE_STYLE[activeTable.state]?.bg || "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {STATE_STYLE[activeTable.state]?.label || activeTable.state}
                  </span>
                  {activeTable.state === "occupied" && (
                    <span className="text-[11px] text-wine font-semibold bg-wine/5 px-2 py-0.5 rounded-md border border-wine/20">
                      Adding to active session
                    </span>
                  )}
                  {activeTable.state === "bill_pending" && (
                    <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      Will reopen bill-pending session
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUCCESS VIEW */}
        {successData ? (
          <div className="p-8 flex flex-col items-center justify-center text-center max-w-lg mx-auto my-auto space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Order Sent to Kitchen
              </span>
              <h3 className="text-2xl font-extrabold text-stone-900 mt-2">
                Order #{successData.order_number}
              </h3>
              <p className="text-stone-600 text-sm mt-1">
                Table <strong className="text-stone-900">{successData.table_label}</strong> • Total{" "}
                <strong className="text-wine">{formatCurrency(successData.total)}</strong>
              </p>
            </div>

            <div className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal (Items):</span>
                <span className="font-semibold text-stone-900">
                  {formatCurrency(successData.subtotal)}
                </span>
              </div>
              {Number(successData.service_charge) > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Service Charge:</span>
                  <span className="font-semibold text-stone-900">
                    {formatCurrency(successData.service_charge)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Estimated Prep Time:</span>
                <span className="font-semibold text-stone-900">
                  {successData.target_prep_mins} min
                </span>
              </div>
              <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-bold text-stone-900">
                <span>Total Amount:</span>
                <span className="text-wine">{formatCurrency(successData.total)}</span>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setSuccessData(null);
                  setCart([]);
                  setCustomerName("");
                  setCustomerPhone("");
                  setOrderNotes("");
                  if (!selectedTable) setActiveTable(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 font-semibold text-stone-700 text-sm transition"
              >
                + Create Another Order
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-wine hover:bg-wine-dark text-white font-bold text-sm transition shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : !activeTable ? (
          /* TABLE SELECTION VIEW */
          <div className="p-6 overflow-y-auto flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search table or section..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine/20 focus:border-wine"
                />
              </div>
              <span className="text-xs text-stone-500 font-medium">
                Click any table to start taking an order
              </span>
            </div>

            {loadingTables ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-wine" />
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="text-center py-16 text-stone-500">
                <Utensils className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                <p className="font-semibold text-stone-700">No tables found</p>
                <p className="text-xs text-stone-500 mt-0.5">Check search filter or add tables in Floor Map.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredTables.map((tbl) => {
                  const style = STATE_STYLE[tbl.state] || STATE_STYLE.free;
                  return (
                    <button
                      key={tbl.id}
                      onClick={() => setActiveTable(tbl)}
                      className={`p-4 rounded-2xl border text-left transition hover:shadow-md flex flex-col justify-between h-28 ${style.bg} hover:border-wine/50`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-base text-stone-900">
                          {tbl.label}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-white/80">
                          {style.label}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-stone-600 block">
                          {tbl.section || "Main Floor"}
                        </span>
                        <span className="text-[11px] text-stone-500 mt-0.5 block">
                          {tbl.seats} Seats
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* MENU & CART POS INTERFACE */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT COLUMN: CATEGORIES + SEARCH + MENU ITEMS GRID */}
            <div className="flex-1 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-stone-200 bg-stone-50/50">
              {/* SEARCH & CATEGORY BAR */}
              <div className="p-4 border-b border-stone-200 bg-white space-y-3 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search menu items by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine/20 focus:border-wine"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* CATEGORIES PILLS */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                        selectedCategory === cat
                          ? "bg-wine text-white shadow-sm"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* MENU ITEMS GRID */}
              <div className="p-4 overflow-y-auto flex-1">
                {loadingMenu ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-wine" />
                  </div>
                ) : filteredMenuItems.length === 0 ? (
                  <div className="text-center py-16 text-stone-500">
                    <Utensils className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-semibold text-stone-700">No menu items found</p>
                    <p className="text-xs text-stone-500 mt-1">Try another category or search query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredMenuItems.map((item) => {
                      const cartEntry = cart.find((c) => c.menuItem.id === item.id);
                      const isSoldOut = !item.available;

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                            isSoldOut
                              ? "bg-stone-100 border-stone-200 opacity-60"
                              : cartEntry
                              ? "bg-wine/5 border-wine/30 shadow-sm"
                              : "bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-sm text-stone-900 leading-tight">
                                {item.title}
                              </h4>
                              <span className="font-extrabold text-sm text-wine shrink-0">
                                {formatCurrency(item.price)}
                              </span>
                            </div>

                            {item.description && (
                              <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2 text-[11px] text-stone-400 font-medium">
                              <span>{item.category}</span>
                              {item.prep_minutes && (
                                <span className="flex items-center gap-1">
                                  • <Clock className="w-3 h-3 text-stone-400" /> {item.prep_minutes}m
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                            {isSoldOut ? (
                              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                                Sold Out
                              </span>
                            ) : cartEntry ? (
                              <div className="flex items-center gap-2 w-full justify-between">
                                <span className="text-xs font-bold text-wine">
                                  In Cart ({cartEntry.qty})
                                </span>
                                <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-0.5">
                                  <button
                                    onClick={() => updateQty(item.id, -1)}
                                    className="p-1 hover:bg-stone-100 rounded text-stone-700 transition"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center font-bold text-xs">
                                    {cartEntry.qty}
                                  </span>
                                  <button
                                    onClick={() => updateQty(item.id, 1)}
                                    className="p-1 hover:bg-stone-100 rounded text-stone-700 transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="w-full py-1.5 px-3 bg-wine/10 hover:bg-wine hover:text-white text-wine font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add to Order
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: CART & CUSTOMER DETAILS & REVIEW */}
            <div className="w-full lg:w-96 flex flex-col bg-white overflow-hidden shrink-0">
              {/* CART ITEMS HEADER */}
              <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-wine" />
                  <h3 className="font-bold text-sm text-stone-900">Cart Summary</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* CART LIST */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 space-y-2">
                    <ShoppingBag className="w-8 h-8 mx-auto text-stone-300" />
                    <p className="text-xs font-semibold text-stone-500">Cart is empty</p>
                    <p className="text-[11px] text-stone-400">Select items from the menu to add to order.</p>
                  </div>
                ) : (
                  cart.map((c) => (
                    <div
                      key={c.menuItem.id}
                      className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <span className="font-bold text-xs text-stone-900 block leading-tight">
                            {c.menuItem.title}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            {formatCurrency(c.menuItem.price)} each
                          </span>
                        </div>
                        <span className="font-bold text-xs text-wine">
                          {formatCurrency(c.menuItem.price * c.qty)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                        {/* ITEM NOTES INPUT */}
                        <input
                          type="text"
                          placeholder="Item notes (e.g. extra spicy)..."
                          value={c.notes || ""}
                          onChange={(e) => updateItemNotes(c.menuItem.id, e.target.value)}
                          className="text-[11px] px-2 py-1 border border-stone-200 rounded-md w-36 focus:outline-none focus:border-wine bg-white"
                        />

                        {/* QUANTITY CONTROLS */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(c.menuItem.id, -1)}
                            className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-xs">
                            {c.qty}
                          </span>
                          <button
                            onClick={() => updateQty(c.menuItem.id, 1)}
                            className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(c.menuItem.id)}
                            className="p-1 rounded hover:bg-rose-100 text-stone-400 hover:text-rose-600 transition ml-1"
                            title="Remove Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* CUSTOMER & NOTES SECTION */}
              <div className="p-4 border-t border-stone-200 bg-stone-50/50 space-y-2.5 shrink-0">
                <span className="text-[11px] uppercase font-bold tracking-wider text-stone-400 block">
                  Customer & Order Notes (Optional)
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-wine bg-white"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-wine bg-white"
                    />
                  </div>
                </div>

                <div className="relative">
                  <FileText className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Kitchen order notes (e.g. VIP table, no onions)..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-wine bg-white"
                  />
                </div>
              </div>

              {/* ERROR ALERT */}
              {errorMessage && (
                <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shrink-0">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* TOTALS & PLACE ORDER BUTTON */}
              <div className="p-4 border-t border-stone-200 bg-white space-y-3 shrink-0">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600 font-medium">
                    Estimated Subtotal ({totalItemsCount} items):
                  </span>
                  <span className="font-extrabold text-wine text-base">
                    {formatCurrency(displayedSubtotal)}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-tight">
                  * Final subtotal, service charges, and taxes are calculated authoritatively by the server.
                </p>

                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || cart.length === 0}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                    isSubmitting || cart.length === 0
                      ? "bg-stone-300 cursor-not-allowed"
                      : "bg-wine hover:bg-wine-dark active:scale-[0.99]"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Place Staff Order ({totalItemsCount})
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
