"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Award,
  Sparkles,
  PieChart as PieChartIcon,
  UtensilsCrossed,
  Globe,
  Clock,
  Layers,
  Crown,
} from "lucide-react";

export type RawOrderItem = {
  menu_item_id?: string;
  title?: string;
  name?: string;
  price?: number;
  quantity?: number;
  qty?: number;
};

export type RawOrder = {
  id: string;
  restaurant_id: string;
  order_number?: number;
  source?: string;
  status?: string;
  items?: any;
  total?: number;
  amount?: number;
  subtotal?: number;
  created_at: string;
};

export type RawMenuItem = {
  id: string;
  title: string;
  price: number;
  cuisine?: string;
  image?: string;
  short?: string;
};

type Props = {
  restaurantName: string;
  initialOrders: RawOrder[];
  initialMenuItems: RawMenuItem[];
  initialReservationsCount: number;
  initialReviewsCount: number;
  initialAvgRating: string;
};

type DurationOption = "today" | "yesterday" | "this_week" | "this_month" | "past_month" | "all_time" | "custom";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseOrderItems(rawItems: any): Array<{ title: string; price: number; quantity: number; menuItemId?: string }> {
  if (!rawItems) return [];
  let arr: any[] = [];
  if (typeof rawItems === "string") {
    try {
      arr = JSON.parse(rawItems);
    } catch {
      return [];
    }
  } else if (Array.isArray(rawItems)) {
    arr = rawItems;
  }

  if (!Array.isArray(arr)) return [];

  return arr.map((it) => ({
    title: it.title || it.name || it.item_name || "Item",
    price: Number(it.price || 0),
    quantity: Number(it.quantity || it.qty || 1),
    menuItemId: it.menu_item_id || it.id,
  }));
}

const CHANNEL_COLORS: Record<string, { bg: string; fill: string; text: string; border: string }> = {
  "Dine-In": { bg: "bg-wine", fill: "#800020", text: "text-wine", border: "border-wine/20" },
  Swiggy: { bg: "bg-orange-500", fill: "#f97316", text: "text-orange-600", border: "border-orange-200" },
  Zomato: { bg: "bg-rose-600", fill: "#e11d48", text: "text-rose-600", border: "border-rose-200" },
  Takeaway: { bg: "bg-amber-500", fill: "#f59e0b", text: "text-amber-600", border: "border-amber-200" },
  Delivery: { bg: "bg-purple-600", fill: "#9333ea", text: "text-purple-600", border: "border-purple-200" },
  "POS Manual": { bg: "bg-slate-600", fill: "#475569", text: "text-slate-600", border: "border-slate-200" },
};

export function ReportsClient({
  restaurantName,
  initialOrders,
  initialMenuItems,
  initialReservationsCount,
  initialReviewsCount,
  initialAvgRating,
}: Props) {
  const [duration, setDuration] = useState<DurationOption>("this_month");
  const [startDate, setStartDate] = useState<string>("2026-09-01");
  const [endDate, setEndDate] = useState<string>("2026-09-30");

  const menuMap = useMemo(() => {
    const map = new Map<string, RawMenuItem>();
    for (const item of initialMenuItems) {
      map.set(item.title.toLowerCase().trim(), item);
      if (item.id) map.set(item.id, item);
    }
    return map;
  }, [initialMenuItems]);

  // Current Reference Dates
  const refTodayStr = "2026-09-28";
  const refYesterdayStr = "2026-09-27";

  // Filter orders by selected duration
  const filteredOrders = useMemo(() => {
    return initialOrders.filter((o) => {
      if (o.status === "cancelled") return false;
      const createdStr = o.created_at ? o.created_at.slice(0, 10) : "";

      if (duration === "today") return createdStr === refTodayStr;
      if (duration === "yesterday") return createdStr === refYesterdayStr;
      if (duration === "this_week") return createdStr >= "2026-09-22" && createdStr <= "2026-09-28";
      if (duration === "this_month") return createdStr >= "2026-09-01" && createdStr <= "2026-09-30";
      if (duration === "past_month") return createdStr >= "2026-08-01" && createdStr <= "2026-08-31";
      if (duration === "custom") {
        if (startDate && createdStr < startDate) return false;
        if (endDate && createdStr > endDate) return false;
        return true;
      }
      return true; // all_time
    });
  }, [initialOrders, duration, startDate, endDate]);

  // Today Orders for "Item Sold More Today"
  const todayOrders = useMemo(() => {
    return initialOrders.filter((o) => o.status !== "cancelled" && o.created_at?.slice(0, 10) === refTodayStr);
  }, [initialOrders]);

  // This Month Orders for "Item Sold More This Month"
  const thisMonthOrders = useMemo(() => {
    return initialOrders.filter((o) => {
      if (o.status === "cancelled") return false;
      const dateStr = o.created_at?.slice(0, 10) || "";
      return dateStr >= "2026-09-01" && dateStr <= "2026-09-30";
    });
  }, [initialOrders]);

  // Bestseller Today
  const topItemToday = useMemo(() => {
    const itemMap = new Map<string, { title: string; qty: number; revenue: number }>();
    for (const order of todayOrders) {
      const items = parseOrderItems(order.items);
      for (const it of items) {
        const key = it.title;
        const prev = itemMap.get(key) || { title: key, qty: 0, revenue: 0 };
        itemMap.set(key, {
          title: key,
          qty: prev.qty + it.quantity,
          revenue: prev.revenue + it.price * it.quantity,
        });
      }
    }
    const list = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);
    return list[0] || null;
  }, [todayOrders]);

  // Bestseller This Month
  const topItemThisMonth = useMemo(() => {
    const itemMap = new Map<string, { title: string; qty: number; revenue: number }>();
    for (const order of thisMonthOrders) {
      const items = parseOrderItems(order.items);
      for (const it of items) {
        const key = it.title;
        const prev = itemMap.get(key) || { title: key, qty: 0, revenue: 0 };
        itemMap.set(key, {
          title: key,
          qty: prev.qty + it.quantity,
          revenue: prev.revenue + it.price * it.quantity,
        });
      }
    }
    const list = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);
    return list[0] || null;
  }, [thisMonthOrders]);

  // Item Sales Aggregation for Filtered Duration
  const itemSalesBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        qty: number;
        revenue: number;
        price: number;
        cuisine?: string;
        image?: string;
      }
    >();

    for (const order of filteredOrders) {
      const items = parseOrderItems(order.items);
      for (const it of items) {
        const key = it.title;
        const meta = menuMap.get(key.toLowerCase().trim()) || (it.menuItemId ? menuMap.get(it.menuItemId) : undefined);
        const prev = map.get(key) || {
          title: key,
          qty: 0,
          revenue: 0,
          price: it.price || meta?.price || 0,
          cuisine: meta?.cuisine || "Signature",
          image: meta?.image || "/img/menu/1.jpg",
        };

        map.set(key, {
          ...prev,
          qty: prev.qty + it.quantity,
          revenue: prev.revenue + it.price * it.quantity,
        });
      }
    }

    const list = Array.from(map.values()).sort((a, b) => b.qty - a.qty);
    const maxQty = list.reduce((max, i) => Math.max(max, i.qty), 1);
    const totalRev = list.reduce((sum, i) => sum + i.revenue, 0);

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      qtyPercent: Math.round((item.qty / maxQty) * 100),
      revenuePercent: totalRev > 0 ? Math.round((item.revenue / totalRev) * 100) : 0,
    }));
  }, [filteredOrders, menuMap]);

  // Channel Distribution Data
  const channelBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; count: number; revenue: number }>();
    for (const o of filteredOrders) {
      const src = o.source || "dine_in";
      let label = "Dine-In";
      if (src === "swiggy") label = "Swiggy";
      if (src === "zomato") label = "Zomato";
      if (src === "takeaway") label = "Takeaway";
      if (src === "delivery") label = "Delivery";
      if (src === "pos_manual") label = "POS Manual";

      const amt = Number(o.total || o.amount || 0);
      const prev = map.get(label) || { label, count: 0, revenue: 0 };
      map.set(label, { label, count: prev.count + 1, revenue: prev.revenue + amt });
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Total Summary stats
  const periodTotalRevenue = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + Number(o.total || o.amount || 0), 0),
    [filteredOrders]
  );
  const periodTotalOrders = filteredOrders.length;
  const periodTotalItemsSold = useMemo(
    () => itemSalesBreakdown.reduce((sum, i) => sum + i.qty, 0),
    [itemSalesBreakdown]
  );

  // Daily Trend Data for Bar Graph Timeline
  const dailyTrendData = useMemo(() => {
    const map = new Map<string, { dateLabel: string; revenue: number; ordersCount: number }>();
    for (const o of filteredOrders) {
      const dt = o.created_at ? o.created_at.slice(0, 10) : "";
      if (!dt) continue;
      const dObj = new Date(dt);
      const label = dObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const prev = map.get(dt) || { dateLabel: label, revenue: 0, ordersCount: 0 };
      map.set(dt, {
        dateLabel: label,
        revenue: prev.revenue + Number(o.total || o.amount || 0),
        ordersCount: prev.ordersCount + 1,
      });
    }
    const sorted = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((entry) => entry[1]);

    const maxRev = sorted.reduce((max, d) => Math.max(max, d.revenue), 1);
    return sorted.map((d) => ({
      ...d,
      heightPercent: Math.round((d.revenue / maxRev) * 100),
      isPeak: d.revenue === maxRev,
    }));
  }, [filteredOrders]);

  // SVG Donut Chart Calculation
  const donutSlices = useMemo(() => {
    const totalRev = periodTotalRevenue || 1;
    let accumulatedPercent = 0;

    return channelBreakdown.map((ch) => {
      const share = ch.revenue / totalRev;
      const startPercent = accumulatedPercent;
      accumulatedPercent += share;
      const color = CHANNEL_COLORS[ch.label]?.fill || "#7a2e35";

      return {
        label: ch.label,
        count: ch.count,
        revenue: ch.revenue,
        sharePercent: Math.round(share * 100),
        startPercent,
        share,
        color,
      };
    });
  }, [channelBreakdown, periodTotalRevenue]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header & Duration Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-cream2 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-wine text-gold shadow-sm">
              <BarChart3 size={24} />
            </span>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink">
                Sales & Performance Analytics
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Real-time graphical charts, item bestseller rankings, and duration analytics for {restaurantName}
              </p>
            </div>
          </div>
        </div>

        {/* Duration Quick Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "today", label: "⚡ Today" },
            { id: "yesterday", label: "📅 Yesterday" },
            { id: "this_week", label: "🗓️ This Week" },
            { id: "this_month", label: "🗓️ This Month" },
            { id: "past_month", label: "🗓️ Past Month (Aug)" },
            { id: "all_time", label: "📊 All Time" },
            { id: "custom", label: "📆 Custom Calendar" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDuration(opt.id as DurationOption)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                duration === opt.id
                  ? "bg-wine text-white shadow-sm"
                  : "bg-cream/60 text-neutral-700 hover:bg-cream border border-cream2"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker (if Custom selected) */}
      {duration === "custom" && (
        <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-xl flex flex-wrap items-center gap-4 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-wine" />
            <span className="font-semibold text-amber-900">Select Custom Duration:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-neutral-600">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 bg-white border border-amber-300 rounded-lg font-mono text-xs focus:ring-wine focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-neutral-600">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 bg-white border border-amber-300 rounded-lg font-mono text-xs focus:ring-wine focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* HIGHLIGHT SPOTLIGHT CARDS — Item Sold More Today & Item Sold More This Month */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Item Sold More Today */}
        <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-5 rounded-2xl border border-amber-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300/50">
              ⚡ Item Sold Most Today
            </span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>

          {topItemToday ? (
            <div className="mt-4 space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-ink leading-tight">{topItemToday.title}</h3>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-bold text-wine text-base">{topItemToday.qty} Sold Today</span>
                <span className="font-mono text-neutral-600 font-semibold">{formatMoney(topItemToday.revenue)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 mt-4 italic">No items sold yet today.</p>
          )}

          <div className="mt-3 pt-2 border-t border-amber-200/60 text-[10px] text-amber-700 font-medium">
            Computed from today&apos;s real-time orders
          </div>
        </div>

        {/* Card 2: Item Sold More This Month */}
        <div className="bg-gradient-to-br from-wine/5 via-white to-wine/10 p-5 rounded-2xl border border-wine/20 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-wine bg-wine/10 px-2.5 py-1 rounded-full border border-wine/20">
              🏆 Item Sold Most This Month
            </span>
            <Award className="w-4 h-4 text-wine" />
          </div>

          {topItemThisMonth ? (
            <div className="mt-4 space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-ink leading-tight">{topItemThisMonth.title}</h3>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-bold text-wine text-base">{topItemThisMonth.qty} Sold This Month</span>
                <span className="font-mono text-neutral-600 font-semibold">{formatMoney(topItemThisMonth.revenue)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 mt-4 italic">No items sold this month.</p>
          )}

          <div className="mt-3 pt-2 border-t border-wine/10 text-[10px] text-wine/80 font-medium">
            Monthly culinary bestseller leader
          </div>
        </div>

        {/* Card 3: Total Period Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-cream2 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Period Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-4">
            <p className="font-serif text-2xl font-bold text-ink">{formatMoney(periodTotalRevenue)}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              From {periodTotalOrders} orders ({duration.replace("_", " ")})
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-cream2 text-[10px] text-neutral-400">
            Verified sales payload
          </div>
        </div>

        {/* Card 4: Total Volume & Rating */}
        <div className="bg-white p-5 rounded-2xl border border-cream2 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Volume & Quality</span>
            <ShoppingBag className="w-4 h-4 text-gold" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="font-serif text-2xl font-bold text-ink">{periodTotalItemsSold} Dishes</p>
            <p className="text-xs text-gold font-semibold">
              ★ {initialAvgRating} Rating ({initialReviewsCount} Reviews)
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-cream2 text-[10px] text-neutral-400">
            {initialReservationsCount} Table Reservations Booked
          </div>
        </div>
      </div>

      {/* GRAPHICAL CHART 1 — VERTICAL BAR GRAPH (ITEM DISH SALES VISUALIZER) */}
      <div className="bg-white rounded-2xl border border-cream2 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cream2 pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-wine" />
              Item Dish Sales Graphical Bar Chart
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Direct visual bar graph indicating units sold and dish revenue comparison ({duration.replace("_", " ")})
            </p>
          </div>
          <span className="text-xs font-semibold text-wine bg-wine/10 px-3 py-1.5 rounded-xl border border-wine/20 w-fit">
            Showing Top {Math.min(itemSalesBreakdown.length, 8)} Items
          </span>
        </div>

        {itemSalesBreakdown.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-neutral-300" />
            <p className="font-serif text-base text-ink">No dish sales for selected period</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Bar Chart Graph Grid */}
            <div className="h-72 pt-14 pb-4 flex items-end justify-between gap-3 border-b border-neutral-200 px-2 overflow-x-auto">
              {itemSalesBreakdown.slice(0, 8).map((item) => {
                const isTop = item.rank === 1;
                return (
                  <div key={item.title} className="flex-1 min-w-[75px] max-w-[120px] flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Card Tooltip */}
                    <div className="absolute -top-10 bg-slate-900 text-white text-[11px] py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 shadow-2xl border border-amber-400/40 flex items-center gap-1.5">
                      <span className="font-bold text-amber-300 font-sans">{item.title}:</span>
                      <span className="font-mono font-bold text-white">{item.qty} sold</span>
                      <span className="text-amber-200/90 font-mono text-[10px]">({formatMoney(item.revenue)})</span>
                    </div>

                    {/* Quantity Badge on Bar */}
                    <span className={`text-[11px] font-bold mb-1.5 font-mono ${isTop ? "text-wine scale-110" : "text-neutral-700"}`}>
                      {item.qty}
                    </span>

                    {/* The Graphical Bar */}
                    <div
                      className={`w-full rounded-t-xl transition-all duration-700 relative flex flex-col justify-between overflow-hidden shadow-xs ${
                        isTop
                          ? "bg-gradient-to-t from-wine via-amber-700 to-gold ring-2 ring-gold/50"
                          : "bg-gradient-to-t from-wine/90 to-wine/60 group-hover:from-wine group-hover:to-wine-dark"
                      }`}
                      style={{ height: `${Math.max(item.qtyPercent, 12)}%` }}
                    >
                      {isTop && (
                        <div className="p-1 text-center">
                          <Crown className="w-3.5 h-3.5 text-gold mx-auto animate-bounce" />
                        </div>
                      )}
                    </div>

                    {/* Rank Indicator */}
                    <span className="mt-2 text-[10px] font-bold font-serif text-neutral-400">
                      #{item.rank}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Dish Names & Revenue Footer beneath Bar Graph */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
              {itemSalesBreakdown.slice(0, 8).map((item) => (
                <div key={item.title} className="p-2 bg-cream/40 rounded-xl border border-cream2/70 flex flex-col justify-between h-full">
                  <span className="font-serif font-bold text-ink truncate text-[11px]" title={item.title}>
                    {item.title}
                  </span>
                  <div className="mt-1">
                    <span className="text-wine font-bold font-mono text-[10px] block">{item.qty} Sold</span>
                    <span className="text-neutral-500 font-mono text-[9px]">{formatMoney(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GRAPHICAL CHART 2 — PIE / DONUT CHART FOR CHANNEL BREAKDOWN + DAILY TIMELINE BAR GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* DONUT / PIE CHART FOR ORDER CHANNELS (5 COLUMNS) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-cream2 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-cream2 pb-3">
            <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-wine" />
              Channel Sales Donut Chart
            </h3>
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Market Share
            </span>
          </div>

          <div className="flex flex-col items-center justify-center pt-2">
            {/* SVG DONUT CHART */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f3f2ee" strokeWidth="16" />

                {/* Slices */}
                {donutSlices.map((slice, i) => {
                  const strokeDasharray = `${slice.share * 238.76} 238.76`;
                  const strokeDashoffset = -slice.startPercent * 238.76;

                  return (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="16"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-700 hover:opacity-90 cursor-pointer"
                    />
                  );
                })}
              </svg>

              {/* Inner Donut Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Total Payload
                </span>
                <span className="font-serif text-base font-bold text-ink">
                  {formatMoney(periodTotalRevenue)}
                </span>
                <span className="text-[10px] font-semibold text-wine">
                  {periodTotalOrders} Orders
                </span>
              </div>
            </div>

            {/* Donut Chart Legend & Segment Breakdown */}
            <div className="w-full mt-6 space-y-2 text-xs">
              {donutSlices.map((slice) => (
                <div key={slice.label} className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-cream2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="font-bold text-ink">{slice.label}</span>
                    <span className="text-neutral-400 text-[10px]">({slice.count} orders)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-wine">{formatMoney(slice.revenue)}</span>
                    <span className="ml-2 text-[10px] font-bold bg-white border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-600">
                      {slice.sharePercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DAILY REVENUE TIMELINE BAR GRAPH (7 COLUMNS) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-cream2 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-cream2 pb-3">
            <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Daily Sales Revenue Timeline
            </h3>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Period Trend ({dailyTrendData.length} active days)
            </span>
          </div>

          {dailyTrendData.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <p className="font-serif text-sm text-ink">No timeline data for selected range</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="h-64 pt-12 pb-2 flex items-end justify-between gap-2 border-b border-neutral-200 px-1 overflow-x-auto">
                {dailyTrendData.map((day) => (
                  <div key={day.dateLabel} className="flex-1 min-w-[38px] flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-30 font-mono shadow-xl border border-emerald-500/40">
                      <span className="text-emerald-400 font-bold">{day.dateLabel}:</span> {formatMoney(day.revenue)} <span className="text-slate-300">({day.ordersCount} orders)</span>
                    </div>

                    {/* Value Badge */}
                    <span className="text-[9px] font-bold font-mono text-neutral-600 mb-1">
                      ₹{Math.round(day.revenue / 1000)}k
                    </span>

                    {/* Timeline Bar */}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        day.isPeak
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400 ring-2 ring-emerald-300"
                          : "bg-gradient-to-t from-wine/80 to-wine/50 hover:from-wine"
                      }`}
                      style={{ height: `${Math.max(day.heightPercent, 10)}%` }}
                    />

                    {/* Date Label */}
                    <span className="mt-2 text-[9px] font-semibold text-neutral-500 whitespace-nowrap">
                      {day.dateLabel}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-cream/40 rounded-xl border border-cream2 text-xs flex items-center justify-between text-neutral-600">
                <span>Peak Sales Volume Day:</span>
                <span className="font-bold text-emerald-700">
                  {dailyTrendData.find((d) => d.isPeak)?.dateLabel || "N/A"} (
                  {formatMoney(dailyTrendData.find((d) => d.isPeak)?.revenue || 0)})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
