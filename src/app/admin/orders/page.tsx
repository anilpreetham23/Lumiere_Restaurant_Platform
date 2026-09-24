"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Utensils,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  ReceiptText,
  AlertTriangle,
  User,
  Hash,
  ArrowUpDown,
  Flame,
  Phone,
  Store,
  DollarSign,
  Info,
  Plus,
  Layers,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminOrders, cancelSessionOrder, retryOrderInventoryConsumptionAction, type GetAdminOrdersParams } from "@/actions/admin";
import { getActiveRestaurantId } from "@/actions/tenant";
import { StaffOrderModal } from "@/components/admin/StaffOrderModal";

type AdminOrder = {
  id: string;
  restaurant_id: string;
  session_id: string;
  order_number: number | null;
  source: string;
  status: string;
  items: any;
  notes: string | null;
  amount: number;
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  service_charge: number | null;
  total: number | null;
  created_at: string;
  updated_at?: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  prep_started_at?: string | null;
  prep_completed_at?: string | null;
  target_prep_minutes?: number | null;
  inventory_consumed_at?: string | null;
  inventory_consumption_status?: string | null;
  inventory_consumption_notes?: string | null;
  external_order_id?: string | null;
  accepted_at?: string | null;
  accepted_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
  dining_sessions?: {
    customer_name?: string | null;
    phone?: string | null;
    guests?: number | null;
    status?: string | null;
    restaurant_tables?: {
      label?: string | null;
      section?: string | null;
    } | null;
  } | null;
};

type OrderMetrics = {
  totalOrders: number;
  activeOrders: number;
  todaySales: number;
  cancelledOrders: number;
};

const SOURCE_LABELS: Record<string, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
  pos_manual: "POS",
  swiggy: "Swiggy",
  zomato: "Zomato",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dotBg: string }> = {
  placed: { label: "Placed", bg: "bg-blue-50/80", text: "text-blue-700", border: "border-blue-200", dotBg: "bg-blue-500" },
  accepted: { label: "Accepted", bg: "bg-purple-50/80", text: "text-purple-700", border: "border-purple-200", dotBg: "bg-purple-500" },
  preparing: { label: "Preparing", bg: "bg-amber-50/80", text: "text-amber-800", border: "border-amber-300", dotBg: "bg-amber-500" },
  ready: { label: "Ready", bg: "bg-emerald-50/80", text: "text-emerald-800", border: "border-emerald-300", dotBg: "bg-emerald-500" },
  served: { label: "Served", bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-200", dotBg: "bg-stone-400" },
  cancelled: { label: "Cancelled", bg: "bg-rose-50/80", text: "text-rose-700", border: "border-rose-200", dotBg: "bg-rose-500" },
};

const PRESET_REASONS = [
  "Customer requested cancellation",
  "Item out of stock",
  "Kitchen overburdened",
  "Duplicate order",
  "Customer left table",
];

function formatMoney(amount: number | null | undefined): string {
  const val = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

function formatDate(isoString: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatFullDateTime(isoString: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatElapsed(isoString: string): string {
  if (!isoString) return "";
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function AdminOrdersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics>({
    totalOrders: 0,
    activeOrders: 0,
    todaySales: 0,
    cancelledOrders: 0,
  });
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  // Detail Drawer state
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  // Staff POS Order Modal state
  const [showPosModal, setShowPosModal] = useState<boolean>(false);

  // Cancel Order Modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<AdminOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Inventory Retry State
  const [retryingInventory, setRetryingInventory] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on new search query
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load orders from server action
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: GetAdminOrdersParams = {
      status: statusFilter,
      source: sourceFilter,
      dateRange: dateRangeFilter,
      search: debouncedSearch,
      page,
      pageSize: 25,
    };
    const res = await getAdminOrders(params);
    if (!res.ok) {
      setError(res.error || "Failed to load orders");
      setOrders([]);
    } else {
      setOrders((res.orders || []) as AdminOrder[]);
      setTotalCount(res.totalCount ?? 0);
      setTotalPages(res.totalPages ?? 1);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    }
    setLoading(false);
  }, [statusFilter, sourceFilter, dateRangeFilter, debouncedSearch, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    getActiveRestaurantId().then((id) => setRestaurantId(id));
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`admin-orders-realtime-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId, loadOrders]);

  // Keep selected order in drawer up to date if orders refresh
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
  }, [orders, selectedOrder]);

  // Reset filters
  const resetFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setDateRangeFilter("all");
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter !== "all" || sourceFilter !== "all" || dateRangeFilter !== "all" || searchQuery !== "";

  // Handle Cancel Order Submission
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    if (!cancelReason.trim()) {
      setCancelError("Cancellation reason is required");
      return;
    }
    setCancelLoading(true);
    setCancelError(null);

    const res = await cancelSessionOrder(cancelModalOrder.id, cancelReason.trim());
    if (!res.ok) {
      setCancelError(res.error || "Failed to cancel order");
      setCancelLoading(false);
    } else {
      setCancelLoading(false);
      setCancelModalOrder(null);
      setCancelReason("");
      if (selectedOrder?.id === cancelModalOrder.id) {
        setSelectedOrder(null);
      }
      await loadOrders();
    }
  };

  // Safe item parse helper
  const parseItems = (rawItems: any): Array<{ name: string; price: number; quantity: number; notes?: string }> => {
    if (!rawItems) return [];
    let itemsArr: any[] = [];
    if (typeof rawItems === "string") {
      try {
        itemsArr = JSON.parse(rawItems);
      } catch {
        return [];
      }
    } else if (Array.isArray(rawItems)) {
      itemsArr = rawItems;
    }

    if (!Array.isArray(itemsArr)) return [];

    return itemsArr.map((it) => ({
      name: it.title || it.name || it.item_name || "Item",
      price: Number(it.price || 0),
      quantity: Number(it.quantity || it.qty || 1),
      notes: it.notes || it.item_notes || undefined,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-ink">Orders Management</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Monitor active orders, inspect detailed financials, and manage customer fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPosModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-wine hover:bg-wine-dark rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            + New Order
          </button>
          <button
            onClick={loadOrders}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-cream2 rounded-lg shadow-sm hover:bg-neutral-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Header Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-cream2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-gold" />
          </div>
          <p className="font-serif text-2xl font-bold text-ink mt-2">{metrics.totalOrders}</p>
          <span className="text-[11px] text-neutral-400">Current view filter</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream2 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
            <span>Active Orders</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-amber-800 mt-2">{metrics.activeOrders}</p>
          <span className="text-[11px] text-amber-600 font-medium">In kitchen / service</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream2 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>Today&apos;s Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-emerald-800 mt-2">{formatMoney(metrics.todaySales)}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Completed orders today</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream2 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
            <span>Cancelled Orders</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-rose-800 mt-2">{metrics.cancelledOrders}</p>
          <span className="text-[11px] text-rose-600 font-medium">Total cancelled</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-cream2 shadow-sm space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-neutral-100">
          {[
            { id: "all", label: "All Orders" },
            { id: "active", label: "Active" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-4 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive ? "bg-wine text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search #order, customer, table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-cream2 rounded-lg focus:outline-none focus:ring-1 focus:ring-wine focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Source Dropdown */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-neutral-50 border border-cream2 rounded-lg focus:outline-none focus:ring-1 focus:ring-wine focus:bg-white text-neutral-700"
            >
              <option value="all">All Sources</option>
              <option value="dine_in">Dine-in</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
              <option value="pos_manual">POS (Manual)</option>
              <option value="swiggy">Swiggy</option>
              <option value="zomato">Zomato</option>
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div>
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-neutral-50 border border-cream2 rounded-lg focus:outline-none focus:ring-1 focus:ring-wine focus:bg-white text-neutral-700"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
            </select>
          </div>

          {/* Reset Action */}
          <div className="flex items-center">
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="w-full py-2 px-3 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            ) : (
              <div className="text-xs text-neutral-400 flex items-center gap-1.5 px-2">
                <Filter className="w-3.5 h-3.5" />
                <span>Showing filtered results</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadOrders} className="underline font-medium hover:text-rose-800">
            Retry
          </button>
        </div>
      )}

      {/* Main Order List Table */}
      <div className="bg-white rounded-xl border border-cream2 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-wine border-t-transparent"></div>
            <p className="text-xs">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-neutral-300 stroke-1" />
            <p className="font-serif text-lg text-ink">No orders found</p>
            <p className="text-xs max-w-sm mx-auto">
              {hasActiveFilters
                ? "No orders match the selected filters or search terms. Try clearing filters."
                : "No orders have been placed yet."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-wine underline hover:text-wine/80"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50/80 border-b border-cream2 text-[11px] uppercase tracking-wider font-medium text-neutral-500">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream2">
                {orders.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.status] || {
                    label: order.status,
                    bg: "bg-neutral-100",
                    text: "text-neutral-700",
                    border: "border-neutral-200",
                    dotBg: "bg-neutral-400",
                  };
                  const itemsList = parseItems(order.items);
                  const itemCount = itemsList.reduce((acc, it) => acc + it.quantity, 0);
                  const tableName = order.dining_sessions?.restaurant_tables?.label || "No table";
                  const customerName = order.dining_sessions?.customer_name || "Guest";
                  const phone = order.dining_sessions?.phone;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-amber-50/30 transition-colors cursor-pointer"
                    >
                      {/* Order Number */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-ink">
                        <div>#{order.order_number ?? "---"}</div>
                        {order.external_order_id && (
                          <div className="text-[10px] text-neutral-400 font-normal">{order.external_order_id}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`} />
                            {statusCfg.label}
                          </span>
                          {order.status === "served" && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                order.inventory_consumption_status === "consumed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : order.inventory_consumption_status === "insufficient_stock"
                                  ? "bg-rose-50 text-rose-700 border-rose-300"
                                  : "bg-amber-50 text-amber-700 border-amber-300"
                              }`}
                            >
                              {order.inventory_consumption_status === "consumed"
                                ? "Stock Consumed"
                                : order.inventory_consumption_status === "insufficient_stock"
                                ? "Low Stock"
                                : "Missing Recipe"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        {order.source === "swiggy" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-orange-100 text-orange-800 border border-orange-200 text-[11px]">
                            🟠 Swiggy
                          </span>
                        ) : order.source === "zomato" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-200 text-[11px]">
                            🔴 Zomato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[11px]">
                            {SOURCE_LABELS[order.source] || order.source}
                          </span>
                        )}
                      </td>

                      {/* Table */}
                      <td className="py-3.5 px-4 font-medium text-neutral-800">
                        {tableName}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-800">{customerName}</div>
                        {phone && <div className="text-[10px] text-neutral-400">{phone}</div>}
                      </td>

                      {/* Item Count */}
                      <td className="py-3.5 px-4 font-medium text-neutral-700">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-serif font-semibold text-ink">
                        {formatMoney(order.total ?? order.amount)}
                      </td>

                      {/* Created Time & Relative */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-neutral-800">{formatDate(order.created_at)}</div>
                        <div className="text-[10px] text-neutral-400">{formatElapsed(order.created_at)}</div>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:text-wine bg-neutral-100 hover:bg-neutral-200 rounded transition"
                          >
                            Details
                          </button>
                          {(order.status === "placed" || order.status === "accepted") && (
                            <button
                              onClick={() => {
                                setCancelModalOrder(order);
                                setCancelReason("");
                                setCancelError(null);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls Footer */}
        {orders.length > 0 && (
          <div className="px-4 py-3 bg-neutral-50/80 border-t border-cream2 flex items-center justify-between text-xs text-neutral-500">
            <div>
              Showing <span className="font-medium text-ink">{(page - 1) * 25 + 1}</span> to{" "}
              <span className="font-medium text-ink">{Math.min(page * 25, totalCount)}</span> of{" "}
              <span className="font-medium text-ink">{totalCount}</span> orders
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-cream2 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-ink">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-cream2 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-cream2 flex items-center justify-between bg-neutral-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/10 text-gold grid place-items-center font-mono font-bold text-sm">
                  #{selectedOrder.order_number ?? "---"}
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                    Order #{selectedOrder.order_number ?? "---"}
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Placed at {formatFullDateTime(selectedOrder.created_at)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Status & Source Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 rounded-lg border border-cream2">
                  <div className="text-[10px] uppercase font-medium text-neutral-400">Order Status</div>
                  <div className="mt-1">
                    {(() => {
                      const cfg = STATUS_CONFIG[selectedOrder.status] || {
                        label: selectedOrder.status,
                        bg: "bg-neutral-100",
                        text: "text-neutral-700",
                        border: "border-neutral-200",
                        dotBg: "bg-neutral-400",
                      };
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotBg}`} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg border border-cream2">
                  <div className="text-[10px] uppercase font-medium text-neutral-400">Order Source</div>
                  <div className="mt-1 font-medium text-xs text-neutral-800">
                    {SOURCE_LABELS[selectedOrder.source] || selectedOrder.source}
                  </div>
                </div>
              </div>

              {/* Cancellation Notice Banner (If cancelled) */}
              {selectedOrder.status === "cancelled" && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-rose-800">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Order Cancelled</span>
                  </div>
                  {selectedOrder.cancellation_reason && (
                    <div>
                      <span className="font-medium text-rose-900">Reason:</span>{" "}
                      <span className="text-rose-700">{selectedOrder.cancellation_reason}</span>
                    </div>
                  )}
                  {selectedOrder.cancelled_at && (
                    <div className="text-[11px] text-rose-500">
                      Cancelled on {formatFullDateTime(selectedOrder.cancelled_at)}
                    </div>
                  )}
                </div>
              )}

              {/* Restaurant & Customer Context */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-cream2 space-y-3">
                <h3 className="text-xs uppercase font-semibold text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gold" />
                  Customer & Table Context
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Table</span>
                    <span className="font-medium text-neutral-800">
                      {selectedOrder.dining_sessions?.restaurant_tables?.label || "No table"}
                      {selectedOrder.dining_sessions?.restaurant_tables?.section &&
                        ` (${selectedOrder.dining_sessions.restaurant_tables.section})`}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[10px]">Customer Name</span>
                    <span className="font-medium text-neutral-800">
                      {selectedOrder.dining_sessions?.customer_name || "Guest"}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[10px]">Phone Number</span>
                    <span className="font-medium text-neutral-800">
                      {selectedOrder.dining_sessions?.phone || "Not provided"}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[10px]">Guests</span>
                    <span className="font-medium text-neutral-800">
                      {selectedOrder.dining_sessions?.guests ? `${selectedOrder.dining_sessions.guests} guests` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inventory Consumption Status Card */}
              {selectedOrder.status === "served" && (
                <div className="p-4 bg-neutral-50 rounded-xl border border-cream2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase font-semibold text-neutral-500 tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-gold" />
                      Inventory Consumption
                    </h3>
                    {selectedOrder.inventory_consumption_status === "consumed" && (
                      <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                        Stock Consumed
                      </span>
                    )}
                    {selectedOrder.inventory_consumption_status === "consumed_with_missing_recipes" && (
                      <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                        Partial (Missing Recipes)
                      </span>
                    )}
                    {selectedOrder.inventory_consumption_status === "insufficient_stock" && (
                      <span className="text-[10px] uppercase font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
                        Insufficient Stock
                      </span>
                    )}
                    {(selectedOrder.inventory_consumption_status === "no_active_recipes" || selectedOrder.inventory_consumption_status === "missing_recipes_only") && (
                      <span className="text-[10px] uppercase font-bold bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-300">
                        No Recipe Configured
                      </span>
                    )}
                  </div>

                  {selectedOrder.inventory_consumption_notes && (
                    <p className="text-xs text-neutral-600 bg-white p-2.5 rounded-lg border border-cream2 font-mono">
                      {selectedOrder.inventory_consumption_notes}
                    </p>
                  )}

                  {(selectedOrder.inventory_consumption_status === "insufficient_stock" ||
                    selectedOrder.inventory_consumption_status === "missing_recipes_only" ||
                    selectedOrder.inventory_consumption_status === "no_active_recipes") && (
                    <button
                      onClick={async () => {
                        setRetryingInventory(true);
                        const res = await retryOrderInventoryConsumptionAction(selectedOrder.id);
                        setRetryingInventory(false);
                        if (res.ok) {
                          await loadOrders();
                        } else {
                          alert(res.error || "Inventory consumption failed.");
                        }
                      }}
                      disabled={retryingInventory}
                      className="w-full bg-wine hover:bg-wine-dark text-white rounded-lg py-2 px-3 text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {retryingInventory ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Process / Retry Inventory Consumption
                    </button>
                  )}
                </div>
              )}

              {/* Order Items Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-semibold text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-gold" />
                  Order Items
                </h3>

                {(() => {
                  const itemsList = parseItems(selectedOrder.items);
                  if (itemsList.length === 0) {
                    return (
                      <div className="p-4 bg-neutral-50 rounded-lg text-center text-xs text-neutral-400 border border-cream2">
                        Item details unavailable
                      </div>
                    );
                  }
                  return (
                    <div className="divide-y divide-cream2 border border-cream2 rounded-xl overflow-hidden bg-white">
                      {itemsList.map((item, idx) => (
                        <div key={idx} className="p-3 text-xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-medium text-neutral-800">
                              <span className="font-bold text-wine mr-2">{item.quantity}x</span>
                              {item.name}
                            </div>
                            {item.notes && <div className="text-[11px] italic text-amber-700">Note: {item.notes}</div>}
                            <div className="text-[10px] text-neutral-400">{formatMoney(item.price)} each</div>
                          </div>

                          <div className="font-semibold text-neutral-800">
                            {formatMoney(item.price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Financial Summary Breakdown */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-cream2 space-y-2 text-xs">
                <h3 className="text-xs uppercase font-semibold text-neutral-500 tracking-wider flex items-center gap-1.5 mb-3">
                  <ReceiptText className="w-3.5 h-3.5 text-gold" />
                  Financial Summary
                </h3>

                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(selectedOrder.subtotal ?? selectedOrder.amount)}</span>
                </div>

                {Boolean(selectedOrder.discount) && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-{formatMoney(selectedOrder.discount)}</span>
                  </div>
                )}

                {Boolean(selectedOrder.tax) && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Tax</span>
                    <span>{formatMoney(selectedOrder.tax)}</span>
                  </div>
                )}

                {Boolean(selectedOrder.service_charge) && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Service Charge</span>
                    <span>{formatMoney(selectedOrder.service_charge)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-cream2 flex justify-between font-serif text-base font-bold text-ink">
                  <span>Total Amount</span>
                  <span className="text-wine">{formatMoney(selectedOrder.total ?? selectedOrder.amount)}</span>
                </div>
              </div>

              {/* Order Notes */}
              {selectedOrder.notes && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-xs space-y-1">
                  <span className="font-semibold text-amber-900 block">Order Instructions:</span>
                  <p className="text-amber-800">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-cream2 bg-neutral-50/80 flex items-center justify-between">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 transition"
              >
                Close
              </button>

              {(selectedOrder.status === "placed" || selectedOrder.status === "accepted") && (
                <button
                  onClick={() => {
                    setCancelModalOrder(selectedOrder);
                    setCancelReason("");
                    setCancelError(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 grid place-items-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    Cancel Order #{cancelModalOrder.order_number ?? "---"}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    This action will cancel the order and exclude it from billing.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCancelModalOrder(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {cancelError}
              </div>
            )}

            {/* Quick Reason Chips */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-700 block">Quick Reasons</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReason(preset)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border transition ${
                      cancelReason === preset
                        ? "bg-rose-600 text-white border-rose-600 font-medium"
                        : "bg-neutral-50 text-neutral-600 border-cream2 hover:bg-neutral-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 block">
                Cancellation Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter mandatory reason for order cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-cream2 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={cancelLoading}
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 transition disabled:opacity-50"
              >
                Keep Order
              </button>

              <button
                disabled={cancelLoading || !cancelReason.trim()}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff POS Order Creation Modal */}
      <StaffOrderModal
        isOpen={showPosModal}
        onClose={() => setShowPosModal(false)}
        onSuccess={loadOrders}
      />
    </div>
  );
}
