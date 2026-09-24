"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Flame,
  Clock,
  CheckCircle2,
  BellRing,
  RefreshCw,
  AlertTriangle,
  Timer,
  ChevronRight,
  Utensils,
  Check,
  GlassWater,
  ReceiptText
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/data/menu";
import { setSessionOrderStatus, resolveServiceRequest } from "@/actions/admin";
import { getActiveRestaurantId } from "@/actions/tenant";
import type { SessionOrder, OrderLine } from "@/lib/order";

type TableRow = { id: string; label: string };
type SessionRow = { id: string; table_id: string };
type Req = { id: string; table_id: string; type: string; status: string; created_at: string };

const STATE_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; text: string; headerBg: string }
> = {
  placed: {
    label: "NEW ORDER",
    bg: "bg-red-50/80",
    border: "border-red-400",
    text: "text-red-700",
    headerBg: "bg-red-600 text-white",
  },
  accepted: {
    label: "NEW ORDER",
    bg: "bg-red-50/80",
    border: "border-red-400",
    text: "text-red-700",
    headerBg: "bg-red-600 text-white",
  },
  preparing: {
    label: "PREPARING",
    bg: "bg-amber-50/80",
    border: "border-amber-400",
    text: "text-amber-800",
    headerBg: "bg-amber-500 text-white",
  },
  ready: {
    label: "READY TO SERVE",
    bg: "bg-emerald-50/80",
    border: "border-emerald-400",
    text: "text-emerald-800",
    headerBg: "bg-emerald-600 text-white",
  },
};

export default function KitchenPage() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<SessionOrder[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "new" | "preparing" | "ready">("all");

  // Timer ticker state for live elapsed/remaining prep times
  const [nowTs, setNowTs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    const restaurantId = await getActiveRestaurantId();
    if (!restaurantId) {
      setOrders([]);
      setSessions([]);
      setTables([]);
      setReqs([]);
      return;
    }
    const [o, s, t, r] = await Promise.all([
      supabase
        .from("session_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .neq("status", "served")
        .neq("status", "cancelled")
        .order("created_at", { ascending: true }),
      supabase
        .from("dining_sessions")
        .select("id,table_id")
        .eq("restaurant_id", restaurantId)
        .in("status", ["open", "bill_pending"]),
      supabase
        .from("restaurant_tables")
        .select("id,label")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("service_requests")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .neq("status", "done")
        .order("created_at", { ascending: true }),
    ]);

    // Exclude unapproved marketplace orders (swiggy / zomato in 'placed' status)
    const rawOrders = (o.data ?? []) as SessionOrder[];
    const activeOrders = rawOrders.filter((ord) => {
      const isMarketplace = ord.source === "swiggy" || ord.source === "zomato";
      if (isMarketplace && ord.status === "placed") return false;
      return true;
    });

    setOrders(activeOrders);
    setSessions((s.data ?? []) as SessionRow[]);
    setTables((t.data ?? []) as TableRow[]);
    setReqs((r.data ?? []) as Req[]);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("kitchen-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "session_orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "dining_sessions" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, load]);

  const tableOfSession = useMemo(() => {
    const sMap = Object.fromEntries(sessions.map((s) => [s.id, s.table_id]));
    const tMap = Object.fromEntries(tables.map((t) => [t.id, t.label]));
    return (sessionId: string | null, source?: string) => {
      if (source === "swiggy" || source === "zomato") {
        return "Online Delivery";
      }
      if (!sessionId) return "Delivery / Takeaway";
      return tMap[sMap[sessionId]] ?? "Table —";
    };
  }, [sessions, tables]);

  const tableOfId = useCallback(
    (tableId: string) => tables.find((t) => t.id === tableId)?.label ?? "Table —",
    [tables]
  );

  async function advanceStatus(orderId: string, nextStatus: "preparing" | "ready" | "served") {
    setBusy(orderId);
    await setSessionOrderStatus(orderId, nextStatus);
    await load();
    setBusy(null);
  }

  async function doneReq(id: string) {
    setBusy(id);
    await resolveServiceRequest(id);
    await load();
    setBusy(null);
  }

  const newOrders = orders.filter((o) => o.status === "placed" || o.status === "accepted");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  const displayedOrders = useMemo(() => {
    if (filterTab === "new") return newOrders;
    if (filterTab === "preparing") return preparingOrders;
    if (filterTab === "ready") return readyOrders;
    return orders;
  }, [filterTab, orders, newOrders, preparingOrders, readyOrders]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink flex items-center gap-2.5">
            <Flame className="text-wine" size={28} /> Kitchen Display System
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Real-time kitchen order processing & preparation time management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Refresh KDS
          </button>
        </div>
      </div>

      {/* Service Request Banner */}
      {reqs.length > 0 && (
        <div className="bg-wine text-white rounded-2xl p-4 shadow-sm space-y-2 border border-wine/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
              <BellRing size={14} className="animate-bounce" /> Active Service Calls ({reqs.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {reqs.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-xs text-white rounded-xl px-3 py-1.5 text-xs font-medium border border-white/20"
              >
                <span className="font-serif font-bold text-gold">{tableOfId(r.table_id)}</span>
                <span className="capitalize opacity-90">· {r.type}</span>
                <button
                  onClick={() => doneReq(r.id)}
                  disabled={busy === r.id}
                  className="ml-1 p-1 rounded-lg bg-white/20 hover:bg-emerald-500 hover:text-white transition-colors"
                  title="Resolve request"
                >
                  <Check size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Summary / Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterTab("all")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            filterTab === "all"
              ? "bg-ink text-white border-ink shadow-sm"
              : "bg-white text-ink border-cream2 hover:bg-cream"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Total Active</div>
          <div className="font-serif text-2xl font-bold mt-1">{orders.length}</div>
        </button>

        <button
          onClick={() => setFilterTab("new")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            filterTab === "new"
              ? "bg-red-600 text-white border-red-600 shadow-sm"
              : "bg-red-50 text-red-900 border-red-200 hover:bg-red-100/60"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 flex items-center justify-between">
            <span>New Orders</span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div className="font-serif text-2xl font-bold mt-1">{newOrders.length}</div>
        </button>

        <button
          onClick={() => setFilterTab("preparing")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            filterTab === "preparing"
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/60"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 flex items-center justify-between">
            <span>Preparing</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="font-serif text-2xl font-bold mt-1">{preparingOrders.length}</div>
        </button>

        <button
          onClick={() => setFilterTab("ready")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            filterTab === "ready"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/60"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 flex items-center justify-between">
            <span>Ready to Serve</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="font-serif text-2xl font-bold mt-1">{readyOrders.length}</div>
        </button>
      </div>

      {/* Orders Grid */}
      {displayedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-cream2 space-y-3">
          <Utensils size={36} className="mx-auto text-neutral-300" />
          <h3 className="font-serif text-lg font-semibold text-ink">No active kitchen orders</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            When guests place orders from their table QR code, waiter app, or when online orders are accepted, they will appear here live.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedOrders.map((o) => {
            const config = STATE_CONFIG[o.status] || STATE_CONFIG.placed;
            const tableLabel = tableOfSession(o.session_id, o.source);
            const isSwiggy = o.source === "swiggy";
            const isZomato = o.source === "zomato";

            // Preparation Time Calculation
            const targetMins = o.target_prep_mins || 20;
            const createdTime = new Date(o.created_at).getTime();
            const startedTime = o.started_at ? new Date(o.started_at).getTime() : null;
            const completedTime = o.completed_at ? new Date(o.completed_at).getTime() : null;

            // Compute elapsed seconds
            const elapsedSecs = startedTime
              ? Math.max(0, Math.floor(((completedTime || nowTs) - startedTime) / 1000))
              : Math.max(0, Math.floor((nowTs - createdTime) / 1000));

            const elapsedMins = Math.floor(elapsedSecs / 60);
            const remainingMins = targetMins - elapsedMins;

            // Prep status badge
            let prepBadge = { label: "On Time", bg: "bg-emerald-100 text-emerald-800" };
            if (o.status === "preparing") {
              if (remainingMins < 0) {
                prepBadge = { label: `Overdue (${Math.abs(remainingMins)}m)`, bg: "bg-red-100 text-red-800 font-bold" };
              } else if (remainingMins <= 5) {
                prepBadge = { label: `Due Soon (${remainingMins}m)`, bg: "bg-amber-100 text-amber-800 font-semibold" };
              } else {
                prepBadge = { label: `${remainingMins}m left`, bg: "bg-emerald-100 text-emerald-800" };
              }
            }

            return (
              <div
                key={o.id}
                className={`bg-white rounded-2xl border-2 shadow-xs overflow-hidden flex flex-col justify-between transition-all duration-200 ${config.border}`}
              >
                {/* Header Banner */}
                <div>
                  <div className={`px-4 py-2.5 flex items-center justify-between font-bold text-xs ${config.headerBg}`}>
                    <span className="tracking-wide uppercase font-mono">{config.label}</span>
                    <span className="font-mono opacity-90">#{o.order_number || o.id.slice(-4).toUpperCase()}</span>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Table & Timestamp Header */}
                    <div className="flex items-start justify-between border-b border-cream2 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-xl font-bold text-ink">{tableLabel}</span>
                          {isSwiggy && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                              🟠 Swiggy
                            </span>
                          )}
                          {isZomato && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              🔴 Zomato
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Ordered at {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      {/* Prep timer badge */}
                      <div className="text-right">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-mono ${prepBadge.bg}`}>
                          {prepBadge.label}
                        </span>
                        <div className="text-[11px] text-neutral-500 font-mono mt-1 flex items-center justify-end gap-1">
                          <Timer size={12} />
                          {Math.floor(elapsedSecs / 60)}m {String(elapsedSecs % 60).padStart(2, "0")}s
                        </div>
                      </div>
                    </div>

                    {/* Order Items List */}
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                        Items ({o.items?.length || 0})
                      </div>
                      <ul className="space-y-1.5 text-xs text-ink font-medium">
                        {(o.items as OrderLine[]).map((item, idx) => (
                          <li key={idx} className="flex items-start justify-between gap-2">
                            <span className="leading-tight">
                              <span className="font-serif font-bold text-wine text-sm mr-1.5">{item.qty}×</span>
                              {item.title}
                            </span>
                            {item.notes && (
                              <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                                {item.notes}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Order Level Special Notes */}
                    {o.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-start gap-1.5">
                        <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <b className="font-semibold block">Order Note:</b>
                          {o.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-3 bg-cream/40 border-t border-cream2 space-y-2">
                  {o.status === "placed" || o.status === "accepted" ? (
                    <button
                      onClick={() => advanceStatus(o.id, "preparing")}
                      disabled={busy === o.id}
                      className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <Flame size={14} /> Start Preparing
                    </button>
                  ) : o.status === "preparing" ? (
                    <button
                      onClick={() => advanceStatus(o.id, "ready")}
                      disabled={busy === o.id}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <CheckCircle2 size={14} /> Mark Ready
                    </button>
                  ) : o.status === "ready" ? (
                    <button
                      onClick={() => advanceStatus(o.id, "served")}
                      disabled={busy === o.id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <Check size={14} /> Mark Served
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
