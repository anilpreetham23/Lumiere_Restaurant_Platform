"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Flame,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Timer,
  Utensils,
  Check,
  ChefHat,
  UserCheck,
  Award,
  Sparkles,
  BookOpen,
  Layers,
  Search,
  Filter,
  Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setSessionOrderStatus, setMenuAvailability } from "@/actions/admin";
import { getActiveRestaurantId } from "@/actions/tenant";
import type { SessionOrder, OrderLine } from "@/lib/order";

type TableRow = { id: string; label: string };
type SessionRow = { id: string; table_id: string };

type MenuItem = {
  id: string;
  title: string;
  cuisine: string;
  price: number;
  prep_minutes?: number;
  image?: string;
  short?: string;
  available: boolean;
  tags?: string[];
};

type RecipeItem = {
  id: string;
  menu_item_id: string;
  name: string;
  prep_time_minutes: number;
  instructions: string;
  ingredients: Array<{ name: string; qty: string; unit: string }>;
};

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

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function playKitchenChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5 note

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.log("Audio alert blocked by browser policy", e);
  }
}

export default function KitchenPage() {
  const supabase = useMemo(() => createClient(), []);
  
  // Dashboard Sub-View Tab State: 'kds_queue' | 'head_chef' | 'chief_manager'
  const [activeRoleView, setActiveRoleView] = useState<"kds_queue" | "head_chef" | "chief_manager">("kds_queue");

  const [orders, setOrders] = useState<SessionOrder[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "new" | "preparing" | "ready">("all");
  const [chefSearch, setChefSearch] = useState("");
  const [specialsOnly, setSpecialsOnly] = useState(false);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const prevOrdersCount = React.useRef<number>(0);

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
      setMenuItems([]);
      setRecipes([]);
      return;
    }

    const [o, s, t, m, r] = await Promise.all([
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
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort", { ascending: true }),
      supabase
        .from("recipes")
        .select("*")
        .eq("restaurant_id", restaurantId),
    ]);

    // Exclude unapproved marketplace orders (swiggy / zomato in 'placed' status)
    const rawOrders = (o.data ?? []) as SessionOrder[];
    const activeOrders = rawOrders.filter((ord) => {
      const isMarketplace = ord.source === "swiggy" || ord.source === "zomato";
      if (isMarketplace && ord.status === "placed") return false;
      return true;
    });

    // Play kitchen chime audio if new orders arrive and audio is enabled
    if (activeOrders.length > prevOrdersCount.current && prevOrdersCount.current !== 0) {
      playKitchenChime();
    }
    prevOrdersCount.current = activeOrders.length;

    setOrders(activeOrders);
    setSessions((s.data ?? []) as SessionRow[]);
    setTables((t.data ?? []) as TableRow[]);
    setMenuItems((m.data ?? []) as MenuItem[]);
    setRecipes((r.data ?? []) as RecipeItem[]);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("kitchen-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "session_orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "dining_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, load)
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

  async function advanceStatus(orderId: string, nextStatus: "preparing" | "ready" | "served") {
    setBusy(orderId);
    await setSessionOrderStatus(orderId, nextStatus);
    await load();
    setBusy(null);
  }

  async function toggleMenuAvailability(item: MenuItem) {
    setBusy(item.id);
    const nextVal = !item.available;
    setMenuItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, available: nextVal } : x)));
    await setMenuAvailability(item.id, nextVal);
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

  // Aggregated Dish Prep Counts for Chief & Manager Views
  const activeDishPrepSummary = useMemo(() => {
    const map = new Map<string, { title: string; count: number; tableLabels: string[] }>();
    for (const o of orders) {
      if (o.status === "served" || o.status === "cancelled") continue;
      const tLabel = tableOfSession(o.session_id, o.source);
      if (Array.isArray(o.items)) {
        for (const item of o.items) {
          const key = item.title || "Dish";
          const prev = map.get(key) || { title: key, count: 0, tableLabels: [] };
          map.set(key, {
            title: key,
            count: prev.count + Number(item.qty || 1),
            tableLabels: [...prev.tableLabels, tLabel],
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [orders, tableOfSession]);

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header & Role Sub-View Switcher Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-cream2 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-wine text-gold shadow-xs">
              <Flame size={24} />
            </span>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink">
                Kitchen Display System (KDS)
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Real-time culinary order prep, Head Chef recipe breakdown, & Kitchen Manager dispatch control
              </p>
            </div>
          </div>
        </div>

        {/* Role Sub-View Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveRoleView("kds_queue")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeRoleView === "kds_queue"
                ? "bg-wine text-white shadow-sm"
                : "bg-cream/60 text-neutral-700 hover:bg-cream border border-cream2"
            }`}
          >
            <Utensils className="w-4 h-4 text-gold" />
            <span>📋 Live KDS Station Queue</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveRoleView("head_chef")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeRoleView === "head_chef"
                ? "bg-wine text-white shadow-sm"
                : "bg-cream/60 text-neutral-700 hover:bg-cream border border-cream2"
            }`}
          >
            <ChefHat className="w-4 h-4 text-gold" />
            <span>👨‍🍳 Chief (Head Chef View)</span>
          </button>

          <button
            onClick={() => setActiveRoleView("chief_manager")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeRoleView === "chief_manager"
                ? "bg-wine text-white shadow-sm"
                : "bg-cream/60 text-neutral-700 hover:bg-cream border border-cream2"
            }`}
          >
            <UserCheck className="w-4 h-4 text-gold" />
            <span>👔 Chief Manager (Kitchen Ops)</span>
          </button>

          <button
            onClick={() => {
              playKitchenChime();
              setAudioEnabled(true);
            }}
            title="Test Kitchen Audio Chime"
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold transition border border-amber-200 flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔔 Sound Alert Active</span>
          </button>

          <button
            onClick={load}
            title="Refresh KDS"
            className="p-2 bg-cream hover:bg-cream2 text-wine rounded-xl text-xs font-semibold transition border border-cream2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE KDS STATION QUEUE */}
      {activeRoleView === "kds_queue" && (
        <div className="space-y-6">
          {/* Workflow Summary / Filter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setFilterTab("all")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
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
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                filterTab === "new"
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-red-50 text-red-900 border-red-200 hover:bg-red-100/60"
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 flex items-center justify-between">
                <span>New Orders</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="font-serif text-2xl font-bold mt-1">{newOrders.length}</div>
            </button>

            <button
              onClick={() => setFilterTab("preparing")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
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
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
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
                          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          <Flame size={14} /> Start Preparing
                        </button>
                      ) : o.status === "preparing" ? (
                        <button
                          onClick={() => advanceStatus(o.id, "ready")}
                          disabled={busy === o.id}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Mark Ready
                        </button>
                      ) : o.status === "ready" ? (
                        <button
                          onClick={() => advanceStatus(o.id, "served")}
                          disabled={busy === o.id}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
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
      )}

      {/* VIEW 2: CHIEF (HEAD CHEF / MASTER CHEF VIEW) */}
      {activeRoleView === "head_chef" && (
        <div className="space-y-6">
          {/* Head Chef Banner & Dish Prep Summary */}
          <div className="bg-gradient-to-r from-wine via-[#5e2329] to-wine text-white p-6 rounded-2xl shadow-md border border-wine/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-gold" />
                <span className="text-xs font-bold uppercase tracking-wider text-gold">Executive Culinary Console</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-white">Chief & Master Chef Command Center</h2>
              <p className="text-xs text-amber-100/90 max-w-xl">
                Monitor live dish preparation demands, dish recipes, ingredient Bill of Materials (BOM), and toggle Today&apos;s Specials in real-time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-3 rounded-xl border border-white/20 text-center">
                <span className="text-[10px] uppercase font-bold text-gold block">Dishes in Prep Queue</span>
                <span className="font-serif text-2xl font-bold text-white">{activeDishPrepSummary.reduce((acc, d) => acc + d.count, 0)}</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/20 text-center">
                <span className="text-[10px] uppercase font-bold text-gold block">Total Catalog Recipes</span>
                <span className="font-serif text-2xl font-bold text-white">{menuItems.length}</span>
              </div>
            </div>
          </div>

          {/* Currently Required Dishes in Live Kitchen Queue */}
          <div className="bg-white border border-cream2 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-wine" />
                Live Cooking Batch Demand (Next 30 Mins)
              </h3>
              <span className="text-xs font-semibold text-wine bg-wine/10 px-2.5 py-1 rounded-full border border-wine/20">
                {activeDishPrepSummary.length} Unique Dishes Requested
              </span>
            </div>

            {activeDishPrepSummary.length === 0 ? (
              <p className="text-xs text-neutral-400 italic p-4 text-center">No active dish cooking demands right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {activeDishPrepSummary.map((d) => (
                  <div key={d.title} className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-ink text-sm">{d.title}</span>
                        <span className="font-mono text-xs font-bold bg-wine text-white px-2 py-0.5 rounded-full">
                          {d.count}x Total
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900/80 mt-1 truncate">
                        Tables: {Array.from(new Set(d.tableLabels)).join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Master Culinary Menu & Recipe Ingredients BOM Breakdown */}
          <div className="bg-white border border-cream2 p-6 rounded-2xl shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cream2 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-wine" />
                  Culinary Recipes & Ingredient Quantities per Dish
                </h3>
                <p className="text-xs text-neutral-500">Review exact ingredient quantities required per dish preparation</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search dish or cuisine..."
                  value={chefSearch}
                  onChange={(e) => setChefSearch(e.target.value)}
                  className="px-3 py-1.5 border border-cream2 rounded-xl text-xs focus:outline-none focus:border-wine w-full sm:w-60"
                />
              </div>
            </div>

            {/* Menu & Ingredient Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-cream2 bg-cream/40 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Dish & Cuisine</th>
                    <th className="py-3 px-4">Prep Target</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Recipe Ingredients Required</th>
                    <th className="py-3 px-4 text-center">Kitchen Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream2 text-xs">
                  {menuItems
                    .filter((m) => !chefSearch || m.title.toLowerCase().includes(chefSearch.toLowerCase()) || m.cuisine.toLowerCase().includes(chefSearch.toLowerCase()))
                    .map((item) => {
                      const recipe = recipes.find((r) => r.menu_item_id === item.id || r.name?.toLowerCase() === item.title.toLowerCase());
                      return (
                        <tr key={item.id} className="hover:bg-cream/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-serif font-bold text-ink text-sm flex items-center gap-2">
                              <span>{item.title}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase font-mono">{item.cuisine}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-700">
                            ⏱️ {item.prep_minutes || 15} mins
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-wine">
                            {formatMoney(item.price)}
                          </td>
                          <td className="py-3.5 px-4">
                            {recipe?.ingredients && recipe.ingredients.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {recipe.ingredients.map((ing, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200 text-[10px]">
                                    {ing.name}: <strong>{ing.qty} {ing.unit}</strong>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-neutral-400 italic">Ingredients configured in BOM module</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => toggleMenuAvailability(item)}
                              disabled={busy === item.id}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                                item.available
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200"
                              }`}
                            >
                              {item.available ? "✓ Available" : "✕ Out of Stock"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CHIEF MANAGER (KITCHEN OPERATIONS MANAGER VIEW) */}
      {activeRoleView === "chief_manager" && (
        <div className="space-y-6">
          {/* Kitchen Manager Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-gold" />
                <span className="text-xs font-bold uppercase tracking-wider text-gold">Operations Supervision</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-white">Chief Manager Dispatch & Prep Throughput</h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Supervise kitchen prep bottlenecks, station dispatch performance, order queue timing, and resolution speed.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Preparing Station</span>
                <span className="font-serif text-2xl font-bold text-white">{preparingOrders.length}</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Ready for Pickup</span>
                <span className="font-serif text-2xl font-bold text-white">{readyOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Kitchen Station Operations Breakdown & Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Station Metric 1: New Orders Queue */}
            <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                  🔥 New Orders Stage
                </span>
                <span className="font-mono text-base font-bold text-red-700">{newOrders.length} Orders</span>
              </div>
              <p className="text-xs text-neutral-600">Pending chef pickup & cooking initiation.</p>
              <div className="border-t border-red-100 pt-3 space-y-2">
                {newOrders.slice(0, 4).map((o) => (
                  <div key={o.id} className="p-2 bg-red-50/50 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{tableOfSession(o.session_id, o.source)}</span>
                    <button
                      onClick={() => advanceStatus(o.id, "preparing")}
                      className="px-2 py-1 bg-red-600 text-white font-bold rounded text-[10px] hover:bg-red-700"
                    >
                      Assign Prep
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Station Metric 2: Active Cooking Station */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  🍳 Preparing Station
                </span>
                <span className="font-mono text-base font-bold text-amber-700">{preparingOrders.length} Orders</span>
              </div>
              <p className="text-xs text-neutral-600">Active range & oven cooking in progress.</p>
              <div className="border-t border-amber-100 pt-3 space-y-2">
                {preparingOrders.slice(0, 4).map((o) => (
                  <div key={o.id} className="p-2 bg-amber-50/50 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{tableOfSession(o.session_id, o.source)}</span>
                    <button
                      onClick={() => advanceStatus(o.id, "ready")}
                      className="px-2 py-1 bg-amber-500 text-white font-bold rounded text-[10px] hover:bg-amber-600"
                    >
                      Mark Ready
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Station Metric 3: Ready Station */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  🔔 Ready for Service
                </span>
                <span className="font-mono text-base font-bold text-emerald-700">{readyOrders.length} Orders</span>
              </div>
              <p className="text-xs text-neutral-600">Plated dishes waiting for waiter pickup.</p>
              <div className="border-t border-emerald-100 pt-3 space-y-2">
                {readyOrders.slice(0, 4).map((o) => (
                  <div key={o.id} className="p-2 bg-emerald-50/50 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{tableOfSession(o.session_id, o.source)}</span>
                    <button
                      onClick={() => advanceStatus(o.id, "served")}
                      className="px-2 py-1 bg-emerald-600 text-white font-bold rounded text-[10px] hover:bg-emerald-700"
                    >
                      Dispatch Waiter
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
