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
  RotateCcw,
  User,
  Phone,
  Plus,
  Loader2,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  Ban,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getOnlineOrdersAdminAction,
  reviewMarketplaceOrderAdminAction,
  simulateMarketplaceOrderIngestionAdminAction,
  getAvailableMenuItemsAdminAction,
  type MarketplaceOrder,
} from "@/actions/admin";
import { getActiveRestaurantId } from "@/actions/tenant";

type MenuItem = {
  id: string;
  title: string;
  price: number;
  available: boolean;
  category?: string;
};

function formatMoney(amount: number | null | undefined): string {
  const val = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

function formatTime(isoString: string): string {
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

export function OnlineOrdersClient() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filters
  const [providerTab, setProviderTab] = useState<"all" | "swiggy" | "zomato">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Review Drawer state
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
  const [reviewing, setReviewing] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Simulator Modal state
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [simProvider, setSimProvider] = useState<"swiggy" | "zomato">("swiggy");
  const [simCustomer, setSimCustomer] = useState<string>("Rohan Sharma");
  const [simPhone, setSimPhone] = useState<string>("+91 98765 43210");
  const [simNotes, setSimNotes] = useState<string>("Please deliver cutlery and napkins.");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ menu_item_id: string; qty: number; notes?: string }[]>([]);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [loadingMenuItems, setLoadingMenuItems] = useState<boolean>(false);
  const [menuItemsError, setMenuItemsError] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    getActiveRestaurantId().then((id) => setRestaurantId(id));
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getOnlineOrdersAdminAction();
    if (!res.ok) {
      setError(res.error || "Failed to fetch online marketplace orders.");
      setOrders([]);
    } else {
      setOrders(res.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`online-orders-realtime-${restaurantId}`)
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

  const fetchMenuItems = useCallback(async () => {
    setLoadingMenuItems(true);
    setMenuItemsError(null);
    try {
      const res = await getAvailableMenuItemsAdminAction();
      setLoadingMenuItems(false);
      if (res.ok && res.data) {
        setMenuItems(res.data);
        if (res.data.length > 0) {
          setCart((prev) => (prev.length === 0 ? [{ menu_item_id: res.data[0].id, qty: 1 }] : prev));
        }
      } else {
        setMenuItemsError(res.error || "Failed to load menu items.");
      }
    } catch (err: any) {
      setLoadingMenuItems(false);
      setMenuItemsError(err?.message || "Failed to load menu items.");
    }
  }, []);

  // Load available menu items when simulator opens
  useEffect(() => {
    if (showSimulator && menuItems.length === 0) {
      fetchMenuItems();
    }
  }, [showSimulator, menuItems.length, fetchMenuItems]);

  // Filtered orders calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Provider filter
      if (providerTab !== "all" && o.source !== providerTab) return false;

      // Status filter
      if (statusFilter === "pending" && o.status !== "placed") return false;
      if (statusFilter === "accepted" && o.status !== "accepted") return false;
      if (statusFilter === "preparing" && o.status !== "preparing") return false;
      if (statusFilter === "ready" && o.status !== "ready") return false;
      if (statusFilter === "rejected" && o.status !== "cancelled") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = String(o.order_number || "").includes(q);
        const matchesExt = (o.external_order_id || "").toLowerCase().includes(q);
        const matchesCust = (o.customer_name || "").toLowerCase().includes(q);
        const matchesNotes = (o.notes || "").toLowerCase().includes(q);
        if (!matchesNum && !matchesExt && !matchesCust && !matchesNotes) return false;
      }

      return true;
    });
  }, [orders, providerTab, statusFilter, searchQuery]);

  // Counts summary
  const pendingCount = useMemo(() => orders.filter((o) => o.status === "placed").length, [orders]);
  const swiggyCount = useMemo(() => orders.filter((o) => o.source === "swiggy").length, [orders]);
  const zomatoCount = useMemo(() => orders.filter((o) => o.source === "zomato").length, [orders]);

  // Handle Review Actions
  const handleReview = async (action: "accept" | "reject") => {
    if (!selectedOrder) return;
    if (action === "reject" && (!rejectionReason.trim() || rejectionReason.trim().length < 2)) {
      setReviewError("Please enter a valid rejection reason.");
      return;
    }

    setReviewing(true);
    setReviewError(null);

    const res = await reviewMarketplaceOrderAdminAction({
      orderId: selectedOrder.id,
      action,
      rejectionReason: action === "reject" ? rejectionReason.trim() : undefined,
    });

    if (!res.ok) {
      setReviewError(res.error || `Failed to ${action} order.`);
      setReviewing(false);
    } else {
      setReviewing(false);
      setSelectedOrder(null);
      setShowRejectInput(false);
      setRejectionReason("");
      setActionSuccessMsg(`Order #${selectedOrder.order_number} ${action === "accept" ? "accepted" : "rejected"} successfully.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      await loadOrders();
    }
  };

  // Handle Ingestion Simulation
  const handleSimulateIngestion = async () => {
    if (!simCustomer.trim()) {
      setSimError("Customer name is required.");
      return;
    }

    if (cart.length === 0) {
      setSimError("At least one menu item is required.");
      return;
    }

    setSimulating(true);
    setSimError(null);

    const res = await simulateMarketplaceOrderIngestionAdminAction({
      provider: simProvider,
      customerName: simCustomer.trim(),
      phone: simPhone.trim() || undefined,
      items: cart,
      notes: simNotes.trim() || undefined,
    });

    if (!res.ok) {
      setSimError(res.error || "Simulation failed.");
      setSimulating(false);
    } else {
      setSimulating(false);
      setShowSimulator(false);
      setActionSuccessMsg(`Simulated ${simProvider.toUpperCase()} order #${res.data?.order_number} ingested successfully!`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
      await loadOrders();
    }
  };

  // Calculate live total for simulator cart
  const simSubtotal = useMemo(() => {
    const miMap = new Map(menuItems.map((m) => [m.id, m]));
    return cart.reduce((sum, item) => {
      const mi = miMap.get(item.menu_item_id);
      return sum + (mi ? mi.price * item.qty : 0);
    }, 0);
  }, [cart, menuItems]);

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
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-ink flex items-center gap-2">
            Online Orders
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Unified Swiggy & Zomato marketplace order inbox and fulfillment workflow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-wine hover:bg-wine-dark rounded-lg shadow-sm transition"
          >
            <Sparkles className="w-4 h-4 text-gold" />
            + Ingest Demo Order
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

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Provider Tabs Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-cream2 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream2 pb-3">
          {/* Provider Selector */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setProviderTab("all")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                providerTab === "all"
                  ? "bg-ink text-white shadow-sm"
                  : "text-neutral-600 bg-neutral-100 hover:bg-neutral-200"
              }`}
            >
              All Marketplace ({orders.length})
            </button>
            <button
              onClick={() => setProviderTab("swiggy")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                providerTab === "swiggy"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200"
              }`}
            >
              <span>🟠 Swiggy</span>
              <span className="text-[10px] opacity-80">({swiggyCount})</span>
            </button>
            <button
              onClick={() => setProviderTab("zomato")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                providerTab === "zomato"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <span>🔴 Zomato</span>
              <span className="text-[10px] opacity-80">({zomatoCount})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search #order, ext ID, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-cream2 rounded-lg focus:outline-none focus:ring-1 focus:ring-wine focus:bg-white"
            />
          </div>
        </div>

        {/* Status Filter Sub-Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Statuses" },
            { id: "pending", label: "Pending Approval", badge: pendingCount },
            { id: "accepted", label: "Accepted (In Kitchen)" },
            { id: "preparing", label: "Preparing" },
            { id: "ready", label: "Ready" },
            { id: "rejected", label: "Rejected / Cancelled" },
          ].map((st) => {
            const isActive = statusFilter === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap flex items-center gap-1.5 transition ${
                  isActive
                    ? "bg-wine/10 text-wine font-semibold border border-wine/20"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span>{st.label}</span>
                {st.badge !== undefined && st.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {st.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Order List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-cream2 p-12 text-center text-neutral-400 space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-wine border-t-transparent" />
          <p className="text-xs">Loading online orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-cream2 p-12 text-center text-neutral-400 space-y-3">
          <ShoppingBag className="w-12 h-12 mx-auto text-neutral-300 stroke-1" />
          <p className="font-serif text-lg text-ink">No online orders found</p>
          <p className="text-xs max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all" || providerTab !== "all"
              ? "No marketplace orders match your selected filters."
              : "No Swiggy or Zomato orders have been received yet. Use the Demo Ingestion simulator to create test orders."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isSwiggy = order.source === "swiggy";
            const isPending = order.status === "placed";
            const itemsList = parseItems(order.items);
            const totalQty = itemsList.reduce((acc, i) => acc + i.quantity, 0);

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl border transition-all shadow-sm flex flex-col justify-between overflow-hidden ${
                  isPending
                    ? "border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/10"
                    : order.status === "cancelled"
                    ? "border-neutral-200 bg-neutral-50/50"
                    : "border-cream2 hover:border-wine/30"
                }`}
              >
                {/* Header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSwiggy ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                          🟠 Swiggy
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          🔴 Zomato
                        </span>
                      )}
                      <span className="font-mono font-bold text-ink text-sm">
                        #{order.order_number}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isPending
                          ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                          : order.status === "accepted"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : order.status === "preparing"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : order.status === "ready"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {isPending ? "Pending Review" : order.status.toUpperCase()}
                    </span>
                  </div>

                  {/* External ID & Received Time */}
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between text-neutral-500 font-mono text-[11px]">
                      <span>Ext ID: {order.external_order_id || "N/A"}</span>
                      <span>{formatElapsed(order.created_at)}</span>
                    </div>
                    <div className="font-medium text-ink flex items-center justify-between">
                      <span>{order.customer_name || "Marketplace Customer"}</span>
                      <span className="font-serif font-bold text-sm text-wine">
                        {formatMoney(order.total || order.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="pt-2 border-t border-cream2 text-xs text-neutral-600 space-y-1">
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      {totalQty} {totalQty === 1 ? "Item" : "Items"}
                    </div>
                    <ul className="space-y-0.5 line-clamp-3">
                      {itemsList.map((it, idx) => (
                        <li key={idx} className="flex items-center justify-between text-[11px]">
                          <span>
                            <span className="font-bold text-wine">{it.quantity}×</span> {it.name}
                          </span>
                          <span className="text-neutral-400">{formatMoney(it.price * it.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-3 bg-neutral-50 border-t border-cream2 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-neutral-400">{formatTime(order.created_at)}</span>

                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowRejectInput(false);
                      setRejectionReason("");
                      setReviewError(null);
                    }}
                    className={`px-3 py-1.5 font-semibold rounded-lg text-xs transition flex items-center gap-1 ${
                      isPending
                        ? "bg-wine text-white hover:bg-wine-dark shadow-sm"
                        : "bg-white text-neutral-700 border border-cream2 hover:bg-neutral-100"
                    }`}
                  >
                    <span>{isPending ? "Review Order" : "View Details"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Order Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-cream2 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2.5">
                {selectedOrder.source === "swiggy" ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                    🟠 Swiggy
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    🔴 Zomato
                  </span>
                )}
                <div>
                  <h2 className="font-serif text-lg font-bold text-ink">
                    Order #{selectedOrder.order_number}
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Ext ID: {selectedOrder.external_order_id || "N/A"}
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

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1 text-xs text-neutral-700">
              {/* Order Status & Timestamps */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-cream2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-neutral-400">Current Status</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-wine/10 text-wine border border-wine/20">
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="text-neutral-500 space-y-1 text-[11px]">
                  <div>Received: {formatFullDateTime(selectedOrder.created_at)} ({formatElapsed(selectedOrder.created_at)})</div>
                  {selectedOrder.accepted_at && (
                    <div className="text-purple-700 font-medium">Accepted at: {formatFullDateTime(selectedOrder.accepted_at)}</div>
                  )}
                  {selectedOrder.rejected_at && (
                    <div className="text-rose-700 font-medium">Rejected at: {formatFullDateTime(selectedOrder.rejected_at)}</div>
                  )}
                  {selectedOrder.rejection_reason && (
                    <div className="text-rose-800 bg-rose-50 p-2 rounded border border-rose-200 mt-1">
                      <strong>Rejection Reason:</strong> {selectedOrder.rejection_reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Details */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-cream2 space-y-2">
                <h3 className="font-semibold text-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gold" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Name</span>
                    <span className="font-medium text-neutral-800">{selectedOrder.customer_name || "Marketplace Customer"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Phone</span>
                    <span className="font-medium text-neutral-800">{selectedOrder.phone || "Not provided"}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="font-semibold text-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gold" />
                  Ordered Items
                </h3>
                <div className="bg-white border border-cream2 rounded-xl overflow-hidden divide-y divide-cream2">
                  {parseItems(selectedOrder.items).map((item, idx) => (
                    <div key={idx} className="p-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink">
                          <span className="font-bold text-wine mr-1">{item.quantity}×</span>
                          {item.name}
                        </div>
                        {item.notes && <div className="text-[11px] text-amber-700 italic mt-0.5">Note: {item.notes}</div>}
                      </div>
                      <div className="font-mono text-neutral-800 font-medium">
                        {formatMoney(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {selectedOrder.notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <span className="font-semibold text-amber-900 block text-[11px]">Special Instructions:</span>
                  <p className="text-amber-800 text-xs">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Financial Breakdown */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-cream2 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span>{formatMoney(selectedOrder.subtotal || selectedOrder.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Taxes & Fees</span>
                  <span>{formatMoney(selectedOrder.tax || 0)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-ink text-sm pt-2 border-t border-cream2 font-serif">
                  <span>Total Payload</span>
                  <span className="text-wine">{formatMoney(selectedOrder.total || selectedOrder.amount)}</span>
                </div>
              </div>

              {/* Error in review */}
              {reviewError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              {/* Reject Reason Input (If Reject toggled) */}
              {showRejectInput && selectedOrder.status === "placed" && (
                <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
                  <label className="block text-xs font-semibold text-rose-900">
                    Rejection Reason <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Item out of stock / Kitchen overloaded / Restaurant closing"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReview("reject")}
                      disabled={reviewing}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Actions Footer */}
            {selectedOrder.status === "placed" && (
              <div className="p-4 bg-white border-t border-cream2 flex items-center gap-3">
                {!showRejectInput && (
                  <>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      disabled={reviewing}
                      className="flex-1 py-2.5 px-4 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Order
                    </button>

                    <button
                      onClick={() => handleReview("accept")}
                      disabled={reviewing}
                      className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Accept Order
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {showSimulator && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-cream2 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Simulator Notice Header */}
            <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center justify-between text-amber-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm">Demo / Simulator</h3>
                  <p className="text-[11px] text-amber-700">Not connected to live Swiggy/Zomato APIs</p>
                </div>
              </div>
              <button onClick={() => setShowSimulator(false)} className="text-amber-700 hover:text-amber-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 text-xs">
              {/* Provider Selection */}
              <div>
                <label className="block font-semibold text-ink mb-1.5">Provider Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimProvider("swiggy")}
                    className={`py-2 px-3 rounded-lg font-bold border flex items-center justify-center gap-2 ${
                      simProvider === "swiggy"
                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                        : "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100"
                    }`}
                  >
                    <span>🟠 Swiggy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimProvider("zomato")}
                    className={`py-2 px-3 rounded-lg font-bold border flex items-center justify-center gap-2 ${
                      simProvider === "zomato"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    <span>🔴 Zomato</span>
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={simCustomer}
                    onChange={(e) => setSimCustomer(e.target.value)}
                    className="w-full p-2 text-xs border border-cream2 rounded-lg focus:outline-none focus:ring-1 focus:ring-wine"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Phone</label>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full p-2 text-xs border border-cream2 rounded-lg focus:outline-none focus:ring-1 focus:ring-wine"
                  />
                </div>
              </div>

              {/* Items Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-ink">Order Items (Server Price Validated)</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (menuItems.length > 0) {
                        setCart([...cart, { menu_item_id: menuItems[0].id, qty: 1 }]);
                      }
                    }}
                    className="text-wine hover:underline text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                {loadingMenuItems ? (
                  <div className="p-4 text-center text-neutral-400 bg-neutral-50 rounded-lg flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-wine" />
                    <span>Loading menu items...</span>
                  </div>
                ) : menuItemsError ? (
                  <div className="p-4 text-center bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                    <p className="text-xs text-rose-700 font-medium">{menuItemsError}</p>
                    <button
                      type="button"
                      onClick={fetchMenuItems}
                      className="px-3 py-1 bg-white border border-rose-300 text-rose-800 text-[11px] font-semibold rounded hover:bg-rose-100 transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry Loading Menu
                    </button>
                  </div>
                ) : menuItems.length === 0 ? (
                  <div className="p-4 text-center text-neutral-500 bg-neutral-50 border border-cream2 rounded-lg space-y-1">
                    <p className="font-semibold text-xs text-ink">No menu items available</p>
                    <p className="text-[11px] text-neutral-400">
                      Please ensure active menu items exist for your active restaurant before simulating orders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                    {cart.map((cItem, index) => {
                      const selectedMi = menuItems.find((m) => m.id === cItem.menu_item_id);
                      return (
                        <div key={index} className="p-2.5 bg-neutral-50 border border-cream2 rounded-lg flex items-center gap-2">
                          <select
                            value={cItem.menu_item_id}
                            onChange={(e) => {
                              const newCart = [...cart];
                              newCart[index].menu_item_id = e.target.value;
                              setCart(newCart);
                            }}
                            className="flex-1 p-1.5 text-xs bg-white border border-cream2 rounded focus:outline-none"
                          >
                            {menuItems.map((mi) => (
                              <option key={mi.id} value={mi.id}>
                                {mi.title} — {formatMoney(mi.price)}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={cItem.qty}
                            onChange={(e) => {
                              const newCart = [...cart];
                              newCart[index].qty = Math.max(1, parseInt(e.target.value) || 1);
                              setCart(newCart);
                            }}
                            className="w-14 p-1.5 text-xs border border-cream2 rounded bg-white text-center font-bold"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              if (cart.length > 1) {
                                setCart(cart.filter((_, i) => i !== index));
                              }
                            }}
                            className="p-1 text-neutral-400 hover:text-rose-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div>
                <label className="block font-semibold text-ink mb-1">Delivery Notes</label>
                <input
                  type="text"
                  value={simNotes}
                  onChange={(e) => setSimNotes(e.target.value)}
                  className="w-full p-2 text-xs border border-cream2 rounded-lg focus:outline-none focus:ring-1 focus:ring-wine"
                />
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-cream2 flex items-center justify-between font-serif font-bold text-sm">
                <span>Calculated Total</span>
                <span className="text-wine text-base">{formatMoney(simSubtotal)}</span>
              </div>

              {simError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{simError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-cream2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSimulator(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulateIngestion}
                disabled={simulating}
                className="px-5 py-2 text-xs font-semibold text-white bg-wine hover:bg-wine-dark rounded-xl shadow-sm disabled:opacity-60 flex items-center gap-2 transition"
              >
                {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-gold" />}
                Ingest Simulated Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
