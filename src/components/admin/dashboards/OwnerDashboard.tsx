"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Globe,
  CalendarCheck,
  AlertTriangle,
  Users,
  Star,
  Plus,
  ArrowRight,
  TrendingUp,
  Building2,
  Package,
  Truck,
  Settings,
  BarChart3,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { money } from "@/data/menu";
import { setReservationStatus, setSessionOrderStatus } from "@/actions/admin";
import { DashboardOnlineOrdersClient } from "@/components/admin/DashboardOnlineOrdersClient";

type OwnerDashboardProps = {
  restaurantName: string;
  orders: any[];
  marketplaceOrders: any[];
  reservations: any[];
  inventoryItems: any[];
  serviceRequests: any[];
  memberships: any[];
  reviews: any[];
  tables: any[];
  purchaseOrders: any[];
};

export default function OwnerDashboard({
  restaurantName,
  orders,
  marketplaceOrders,
  reservations,
  inventoryItems,
  serviceRequests,
  memberships,
  reviews,
  tables,
  purchaseOrders,
}: OwnerDashboardProps) {
  // Calculations
  const todayStr = new Date().toISOString().split("T")[0];

  const todayOrders = orders.filter((o) => {
    const d = o.created_at ? new Date(o.created_at).toISOString().split("T")[0] : "";
    return d === todayStr;
  });

  const todaySales = todayOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, o) => acc + Number(o.total || o.amount || 0), 0);

  const activeOrders = orders.filter((o) =>
    ["placed", "accepted", "preparing", "ready", "served"].includes(o.status)
  );

  const todayMarketplace = marketplaceOrders.filter((o) => {
    const d = o.created_at ? new Date(o.created_at).toISOString().split("T")[0] : "";
    return d === todayStr;
  });

  const marketplaceSales = todayMarketplace
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, o) => acc + Number(o.total || o.amount || 0), 0);

  const todayReservations = reservations.filter((r) => r.date === todayStr || r.status === "pending");

  const lowStockItems = inventoryItems.filter((i) => {
    const min = i.min_reorder_level ?? 5;
    return i.is_active && Number(i.quantity) <= min;
  });

  const occupiedTables = tables.filter((t) => t.status === "occupied");

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              Owner Command Center
            </span>
            <span className="text-xs text-neutral-400 font-medium">Full Executive Authority</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink">{restaurantName}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Executive overview of revenue, operations, workforce, and tenant analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/orders" className="btn-wine text-xs py-2 px-3.5 shadow-xs flex items-center gap-1.5">
            <Plus size={15} /> New Order
          </Link>
          <Link href="/admin/menu" className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5">
            <Plus size={14} /> Add Menu Item
          </Link>
          <Link href="/admin/staff" className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5">
            <Users size={14} /> Add Staff
          </Link>
          <Link href="/admin/settings" className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5">
            <Settings size={14} /> Settings
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales KPI */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-cream2 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center font-bold">
              <DollarSign size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Today
            </span>
          </div>
          <div className="font-serif text-2xl lg:text-3xl font-bold text-ink">{money(todaySales)}</div>
          <div className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-600" /> {todayOrders.length} orders today
          </div>
        </div>

        {/* Active Operations KPI */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-2">
            <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 grid place-items-center font-bold">
              <ShoppingBag size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <div className="font-serif text-2xl lg:text-3xl font-bold text-ink">{activeOrders.length}</div>
          <div className="text-xs text-neutral-500 font-medium mt-0.5">Active dining orders</div>
        </div>

        {/* Online Orders KPI */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-2">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center font-bold">
              <Globe size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Swiggy / Zomato
            </span>
          </div>
          <div className="font-serif text-2xl lg:text-3xl font-bold text-ink">{marketplaceOrders.length}</div>
          <div className="text-xs text-neutral-500 font-medium mt-0.5">{money(marketplaceSales)} today</div>
        </div>

        {/* Stock & Reservations KPI */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-2">
            <span className="w-10 h-10 rounded-xl bg-wine/10 text-wine grid place-items-center font-bold">
              <CalendarCheck size={20} />
            </span>
            {lowStockItems.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle size={10} /> {lowStockItems.length} Low Stock
              </span>
            )}
          </div>
          <div className="font-serif text-2xl lg:text-3xl font-bold text-ink">{todayReservations.length}</div>
          <div className="text-xs text-neutral-500 font-medium mt-0.5">Reservations for today</div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-cream2">
        <h2 className="font-serif text-lg font-semibold text-ink mb-3 flex items-center gap-2">
          <span>Owner Quick Actions</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Link
            href="/admin/orders"
            className="p-3 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1.5 transition-all group"
          >
            <ShoppingBag className="mx-auto text-wine group-hover:scale-110 transition-transform" size={20} />
            <div className="text-xs font-semibold text-ink">New Order</div>
          </Link>
          <Link
            href="/admin/menu"
            className="p-3 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1.5 transition-all group"
          >
            <Package className="mx-auto text-gold group-hover:scale-110 transition-transform" size={20} />
            <div className="text-xs font-semibold text-ink">Add Menu</div>
          </Link>
          <Link
            href="/admin/staff"
            className="p-3 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1.5 transition-all group"
          >
            <Users className="mx-auto text-blue-600 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-xs font-semibold text-ink">Employees</div>
          </Link>
          <Link
            href="/admin/purchasing"
            className="p-3 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1.5 transition-all group"
          >
            <Truck className="mx-auto text-emerald-600 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-xs font-semibold text-ink">Issue PO</div>
          </Link>
          <Link
            href="/admin/reservations"
            className="p-3 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1.5 transition-all group"
          >
            <CalendarCheck className="mx-auto text-amber-600 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-xs font-semibold text-ink">Reservations</div>
          </Link>
          <Link
            href="/admin/reports"
            className="p-3 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1.5 transition-all group"
          >
            <BarChart3 className="mx-auto text-purple-600 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-xs font-semibold text-ink">Reports</div>
          </Link>
          <Link
            href="/admin/settings"
            className="p-3 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1.5 transition-all group"
          >
            <Settings className="mx-auto text-neutral-600 group-hover:scale-110 transition-transform" size={20} />
            <div className="text-xs font-semibold text-ink">Settings</div>
          </Link>
        </div>
      </div>

      {/* ONLINE ORDERS COMMAND CENTER */}
      <DashboardOnlineOrdersClient initialOrders={marketplaceOrders} />

      {/* Main Grid: Left (Live Operations & Reservations) vs Right (Inventory & Staff) */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols */}
        <div className="lg:col-span-7 space-y-8">
          {/* Active Orders Panel */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-ink">Live Operational Orders</h2>
                <p className="text-xs text-neutral-500">Orders currently in service across tables and POS</p>
              </div>
              <Link href="/admin/orders" className="text-xs text-wine font-semibold hover:underline flex items-center gap-1">
                View All ({orders.length}) <ArrowRight size={14} />
              </Link>
            </div>

            {activeOrders.length === 0 ? (
              <div className="py-10 text-center text-neutral-400 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <p className="text-sm font-medium">All orders completed! No active operations pending.</p>
              </div>
            ) : (
              <div className="divide-y divide-cream2">
                {activeOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-ink">Order #{o.order_number || o.id.slice(0, 6)}</div>
                      <div className="text-neutral-500">
                        {o.dining_sessions?.customer_name || o.customer_name || "Guest"} • {o.source || "dine_in"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-wine">{money(Number(o.total || o.amount))}</span>
                      <span className="px-2.5 py-1 rounded-full uppercase font-mono text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Today's Reservations */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-ink">Today&apos;s Reservations</h2>
                <p className="text-xs text-neutral-500">Guest table bookings scheduled for today</p>
              </div>
              <Link href="/admin/reservations" className="text-xs text-wine font-semibold hover:underline flex items-center gap-1">
                Manage ({reservations.length}) <ArrowRight size={14} />
              </Link>
            </div>

            {todayReservations.length === 0 ? (
              <div className="py-10 text-center text-neutral-400 space-y-2">
                <CalendarCheck size={32} className="mx-auto text-neutral-300" />
                <p className="text-sm font-medium">No table reservations scheduled for today.</p>
              </div>
            ) : (
              <div className="divide-y divide-cream2">
                {todayReservations.slice(0, 5).map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-ink">{r.name}</div>
                      <div className="text-neutral-500">
                        {r.guests} Guests • {r.date} {r.time}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                          r.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Cols */}
        <div className="lg:col-span-5 space-y-8">
          {/* Low Stock Alerts */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-600" size={18} />
                <h2 className="font-serif text-lg font-bold text-ink">Inventory Alerts</h2>
              </div>
              <Link href="/admin/inventory" className="text-xs text-wine font-semibold hover:underline">
                View Stock
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 space-y-1.5">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                <p className="text-xs font-semibold text-neutral-700">Healthy Stock Levels</p>
                <p className="text-[11px]">All inventory items are currently above minimum reorder thresholds.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-amber-950">{item.name}</div>
                      <div className="text-[11px] text-amber-800">
                        Remaining: <span className="font-mono font-bold text-red-600">{item.quantity} {item.unit}</span> (Min: {item.min_reorder_level || 5})
                      </div>
                    </div>
                    <Link
                      href={`/admin/purchasing?action=new_po&inventory_item_id=${item.id}`}
                      className="btn-wine text-[11px] py-1 px-2.5 shadow-xs shrink-0"
                    >
                      Reorder
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Workforce Summary */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-wine" size={18} />
                <h2 className="font-serif text-lg font-bold text-ink">Workforce Directory</h2>
              </div>
              <Link href="/admin/staff" className="text-xs text-wine font-semibold hover:underline">
                Manage Staff
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-cream/50 rounded-xl p-3 border border-cream2">
                <div className="font-serif text-xl font-bold text-ink">{memberships.filter(m => m.role === "owner").length}</div>
                <div className="text-[10px] font-bold text-neutral-500 uppercase">Owners</div>
              </div>
              <div className="bg-cream/50 rounded-xl p-3 border border-cream2">
                <div className="font-serif text-xl font-bold text-ink">{memberships.filter(m => m.role === "manager").length}</div>
                <div className="text-[10px] font-bold text-neutral-500 uppercase">Managers</div>
              </div>
              <div className="bg-cream/50 rounded-xl p-3 border border-cream2">
                <div className="font-serif text-xl font-bold text-ink">{memberships.filter(m => m.role === "staff").length}</div>
                <div className="text-[10px] font-bold text-neutral-500 uppercase">Staff</div>
              </div>
            </div>
          </section>

          {/* Customer Reviews Highlight */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div className="flex items-center gap-2">
                <Star className="text-gold fill-gold" size={18} />
                <h2 className="font-serif text-lg font-bold text-ink">Customer Reviews</h2>
              </div>
              <span className="text-xs font-bold text-ink bg-cream px-2.5 py-1 rounded-full border border-cream2">
                ★ {avgRating} / 5.0
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="py-6 text-center text-neutral-400 text-xs">
                No customer ratings submitted yet.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {reviews.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="bg-cream/30 p-3 rounded-xl border border-cream2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-ink">{rev.customer_name || "Guest"}</span>
                      <span className="text-amber-600 font-bold">{"★".repeat(rev.rating || 5)}</span>
                    </div>
                    <p className="text-neutral-600 text-[11px] line-clamp-2">{rev.comment || "Great food and ambience!"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
