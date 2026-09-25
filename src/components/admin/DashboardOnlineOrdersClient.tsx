"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Globe,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  Utensils,
  CheckCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/actions/tenant";
import type { MarketplaceOrder } from "@/actions/admin";

type Props = {
  initialOrders: MarketplaceOrder[];
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(isoString: string): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isToday(isoString: string): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function DashboardOnlineOrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<MarketplaceOrder[]>(initialOrders);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    getActiveRestaurantId().then((id) => setRestaurantId(id));
  }, []);

  // Realtime subscription for marketplace orders
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`dashboard-online-orders-realtime-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async () => {
          const { data } = await supabase
            .from("session_orders")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .in("source", ["swiggy", "zomato"])
            .order("created_at", { ascending: false });

          if (data) {
            const mapped = data.map((o: any) => {
              let custName = "Marketplace Customer";
              let phone = null;
              if (o.notes && typeof o.notes === "string") {
                const matchName = o.notes.match(/Customer:\s*([^,|]+)/i);
                if (matchName) custName = matchName[1].trim();
                const matchPhone = o.notes.match(/Phone:\s*([^,|]+)/i);
                if (matchPhone) phone = matchPhone[1].trim();
              }
              return {
                ...o,
                customer_name: o.customer_name || custName,
                phone: o.phone || phone,
              };
            });
            setOrders(mapped);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId]);

  // Metrics Calculations
  const todayOrders = useMemo(() => orders.filter((o) => isToday(o.created_at)), [orders]);

  // 1. Pending Approval = placed
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "placed"),
    [orders]
  );

  // 2. Preparing = preparing
  const preparingOrders = useMemo(
    () => orders.filter((o) => o.status === "preparing"),
    [orders]
  );

  // 3. Ready = ready
  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === "ready"),
    [orders]
  );

  // 4. Completed Today = served (and created today)
  const completedToday = useMemo(
    () => todayOrders.filter((o) => o.status === "served"),
    [todayOrders]
  );

  // Provider breakdowns
  const swiggyOrdersToday = useMemo(
    () => todayOrders.filter((o) => o.source === "swiggy"),
    [todayOrders]
  );
  const swiggyPending = useMemo(
    () => pendingOrders.filter((o) => o.source === "swiggy"),
    [pendingOrders]
  );

  const zomatoOrdersToday = useMemo(
    () => todayOrders.filter((o) => o.source === "zomato"),
    [todayOrders]
  );
  const zomatoPending = useMemo(
    () => pendingOrders.filter((o) => o.source === "zomato"),
    [pendingOrders]
  );

  // Recent activity limit 6
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  return (
    <section className="bg-white border border-cream2 rounded-2xl p-5 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cream2 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-wine/10 text-wine">
              <Globe className="w-5 h-5" />
            </span>
            <h2 className="font-serif text-xl text-ink font-bold">Online Orders Command Center</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Swiggy & Zomato marketplace activity and live fulfillment status.
          </p>
        </div>

        <Link
          href="/admin/online-orders"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-cream hover:bg-cream2 text-wine rounded-xl text-xs font-semibold transition shadow-2xs self-start sm:self-auto"
        >
          <span>View All Online Orders</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Summary Row - 5 Compact Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-cream/40 border border-cream2 p-3 rounded-xl">
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Total Today
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-serif text-2xl text-ink font-bold">{todayOrders.length}</span>
            <span className="text-[11px] text-neutral-400">orders</span>
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border transition-colors ${
            pendingOrders.length > 0
              ? "bg-amber-500/10 border-amber-300 text-amber-900"
              : "bg-cream/40 border-cream2"
          }`}
        >
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Approval</span>
            {pendingOrders.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={`font-serif text-2xl font-bold ${
                pendingOrders.length > 0 ? "text-amber-700" : "text-ink"
              }`}
            >
              {pendingOrders.length}
            </span>
            <span className="text-[11px] text-neutral-500">needs review</span>
          </div>
        </div>

        <div className="bg-cream/40 border border-cream2 p-3 rounded-xl">
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Preparing
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-serif text-2xl text-indigo-900 font-bold">
              {preparingOrders.length}
            </span>
            <span className="text-[11px] text-neutral-400">cooking</span>
          </div>
        </div>

        <div className="bg-cream/40 border border-cream2 p-3 rounded-xl">
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Ready
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-serif text-2xl text-purple-900 font-bold">
              {readyOrders.length}
            </span>
            <span className="text-[11px] text-neutral-400">pickup</span>
          </div>
        </div>

        <div className="bg-cream/40 border border-cream2 p-3 rounded-xl">
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Completed Today
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-serif text-2xl text-emerald-800 font-bold">
              {completedToday.length}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">served</span>
          </div>
        </div>
      </div>

      {/* Provider Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Swiggy Card */}
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-700 font-serif font-bold grid place-items-center text-sm shadow-2xs">
              SW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-neutral-900">Swiggy Delivery</h3>
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-800 rounded text-[10px] font-bold">
                  Marketplace
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Today: <strong className="text-neutral-800">{swiggyOrdersToday.length} orders</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                swiggyPending.length > 0
                  ? "bg-amber-500 text-white shadow-xs animate-pulse"
                  : "bg-cream2 text-neutral-600"
              }`}
            >
              {swiggyPending.length} Pending
            </span>
          </div>
        </div>

        {/* Zomato Card */}
        <div className="border border-rose-500/30 bg-rose-500/5 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-700 font-serif font-bold grid place-items-center text-sm shadow-2xs">
              ZO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-neutral-900">Zomato Delivery</h3>
                <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-800 rounded text-[10px] font-bold">
                  Marketplace
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Today: <strong className="text-neutral-800">{zomatoOrdersToday.length} orders</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                zomatoPending.length > 0
                  ? "bg-rose-600 text-white shadow-xs animate-pulse"
                  : "bg-cream2 text-neutral-600"
              }`}
            >
              {zomatoPending.length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Pending Orders Attention Banner */}
      {pendingOrders.length > 0 ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/80 border border-amber-300 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 animate-bounce" />
              <h3 className="font-serif font-bold text-sm text-amber-950">
                Pending Marketplace Orders Requiring Approval ({pendingOrders.length})
              </h3>
            </div>
            <Link
              href="/admin/online-orders"
              className="text-xs font-bold text-wine hover:underline flex items-center gap-1"
            >
              <span>Review All ({pendingOrders.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingOrders.slice(0, 3).map((po) => {
              const isSwiggy = po.source === "swiggy";
              const itemCount = Array.isArray(po.items)
                ? po.items.reduce((acc, it) => acc + Number(it.qty || 1), 0)
                : 1;

              return (
                <div
                  key={po.id}
                  className="bg-white border border-amber-200 rounded-lg p-3 shadow-2xs space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isSwiggy
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-rose-100 text-rose-900 border border-rose-300"
                      }`}
                    >
                      {isSwiggy ? "🟠 Swiggy" : "🔴 Zomato"}
                    </span>
                    <span className="font-mono text-xs font-bold text-ink">
                      #{po.order_number}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-xs text-neutral-900 truncate">
                      {po.customer_name || "Marketplace Customer"}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {itemCount} {itemCount === 1 ? "item" : "items"} • {formatMoney(Number(po.total))}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-cream2 text-xs">
                    <span className="text-[10px] text-neutral-400">{formatTime(po.created_at)}</span>
                    <Link
                      href="/admin/online-orders"
                      className="px-2.5 py-1 bg-wine text-white rounded text-[11px] font-semibold hover:bg-[#5e2329] transition"
                    >
                      Review Order
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty Pending State */
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">All caught up</p>
              <p className="text-emerald-700">No online orders are waiting for approval.</p>
            </div>
          </div>
          <Link
            href="/admin/online-orders"
            className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1"
          >
            <span>View Marketplace Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Recent Online Activity Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-sm text-ink">Recent Online Activity</h3>
          <span className="text-xs text-neutral-400">Showing last {recentOrders.length} orders</span>
        </div>

        <div className="overflow-x-auto border-t border-cream2 pt-2">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead>
              <tr className="border-b border-cream2 text-neutral-400 uppercase tracking-wider font-semibold">
                <th className="pb-2.5 px-2">Provider</th>
                <th className="pb-2.5 px-2">Order #</th>
                <th className="pb-2.5 px-2">Customer</th>
                <th className="pb-2.5 px-2">Location</th>
                <th className="pb-2.5 px-2">Items</th>
                <th className="pb-2.5 px-2">Total</th>
                <th className="pb-2.5 px-2">Status</th>
                <th className="pb-2.5 px-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream2">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    No online marketplace orders recorded yet today.
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => {
                  const isSwiggy = o.source === "swiggy";
                  const itemCount = Array.isArray(o.items)
                    ? o.items.reduce((acc, it) => acc + Number(it.qty || 1), 0)
                    : 1;

                  return (
                    <tr key={o.id} className="hover:bg-cream/40 transition-colors">
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            isSwiggy
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {o.source}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 font-mono font-bold text-ink">
                        #{o.order_number}
                        {o.external_order_id && (
                          <span className="block text-[10px] text-neutral-400 font-normal">
                            {o.external_order_id}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2 font-medium text-neutral-900">
                        {o.customer_name || "Marketplace Customer"}
                      </td>

                      <td className="py-2.5 px-2 font-medium text-amber-800 bg-amber-50/50 rounded px-1.5 py-0.5 inline-block my-1">
                        Online Order
                      </td>

                      <td className="py-2.5 px-2 text-neutral-600">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </td>

                      <td className="py-2.5 px-2 font-bold text-wine">
                        {formatMoney(Number(o.total))}
                      </td>

                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            o.status === "placed"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : o.status === "accepted"
                              ? "bg-blue-100 text-blue-800"
                              : o.status === "preparing"
                              ? "bg-indigo-100 text-indigo-800 animate-pulse"
                              : o.status === "ready"
                              ? "bg-purple-100 text-purple-800"
                              : o.status === "served"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {o.status === "placed"
                            ? "Pending Approval"
                            : o.status === "served"
                            ? "Completed"
                            : o.status === "cancelled"
                            ? "Rejected"
                            : o.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-right text-neutral-400 text-[11px]">
                        {formatTime(o.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
