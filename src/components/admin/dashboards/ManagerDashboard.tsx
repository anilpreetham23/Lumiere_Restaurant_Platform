"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  UtensilsCrossed,
  CheckCircle2,
  LayoutGrid,
  Bell,
  CalendarCheck,
  Globe,
  Package,
  Truck,
  Users,
  Plus,
  ArrowRight,
  AlertTriangle,
  Star,
  Check,
  Loader2,
} from "lucide-react";
import { money } from "@/data/menu";
import { setReservationStatus, setSessionOrderStatus, resolveServiceRequest } from "@/actions/admin";
import { DashboardOnlineOrdersClient } from "@/components/admin/DashboardOnlineOrdersClient";

type ManagerDashboardProps = {
  restaurantName: string;
  orders: any[];
  marketplaceOrders: any[];
  reservations: any[];
  inventoryItems: any[];
  serviceRequests: any[];
  memberships: any[];
  reviews: any[];
  tables: any[];
};

export default function ManagerDashboard({
  restaurantName,
  orders,
  marketplaceOrders,
  reservations,
  inventoryItems,
  serviceRequests,
  memberships,
  reviews,
  tables,
}: ManagerDashboardProps) {
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const pendingOrders = orders.filter((o) => o.status === "placed" || o.status === "accepted");
  const cookingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  const occupiedTables = tables.filter((t) => t.status === "occupied");
  const todayReservations = reservations.filter((r) => r.date === todayStr || r.status === "pending");
  const openRequests = serviceRequests.filter((s) => s.status === "pending" || !s.status);

  const lowStockItems = inventoryItems.filter((i) => {
    const min = i.min_reorder_level ?? 5;
    return i.is_active && Number(i.quantity) <= min;
  });

  async function handleStatusChange(orderId: string, nextStatus: string) {
    setUpdatingOrderId(orderId);
    await setSessionOrderStatus(orderId, nextStatus);
    setUpdatingOrderId(null);
  }

  async function handleResolveRequest(reqId: string) {
    setResolvingRequestId(reqId);
    await resolveServiceRequest(reqId);
    setResolvingRequestId(null);
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-wine/10 text-wine border border-wine/20">
              Operations Manager Dashboard
            </span>
            <span className="text-xs text-neutral-400 font-medium">Floor & Shift Operations</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink">{restaurantName}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Operational command center for live orders, kitchen dispatch, floor management, and stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/orders" className="btn-wine text-xs py-2 px-3.5 shadow-xs flex items-center gap-1.5">
            <Plus size={15} /> Take Order
          </Link>
          <Link href="/admin/kitchen" className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5">
            <UtensilsCrossed size={14} /> Kitchen KDS
          </Link>
          <Link href="/admin/floor" className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5">
            <LayoutGrid size={14} /> Floor Plan
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Orders Needing Action */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 grid place-items-center font-bold">
              <ShoppingBag size={16} />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full">
              New
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-ink">{pendingOrders.length}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Pending action</div>
        </div>

        {/* Cooking */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 grid place-items-center font-bold">
              <UtensilsCrossed size={16} />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full">
              Kitchen
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-ink">{cookingOrders.length}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Preparing</div>
        </div>

        {/* Ready to Serve */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 grid place-items-center font-bold">
              <CheckCircle2 size={16} />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full">
              Ready
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-ink">{readyOrders.length}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Awaiting service</div>
        </div>

        {/* Floor Occupancy */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-900 grid place-items-center font-bold">
              <LayoutGrid size={16} />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-900 bg-purple-50 px-2 py-0.5 rounded-full">
              Tables
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-ink">
            {occupiedTables.length} / {tables.length}
          </div>
          <div className="text-[11px] text-neutral-500 font-medium">Occupied tables</div>
        </div>

        {/* Service Requests */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-900 grid place-items-center font-bold">
              <Bell size={16} />
            </span>
            {openRequests.length > 0 && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full">
                Alert
              </span>
            )}
          </div>
          <div className="font-serif text-2xl font-bold text-ink">{openRequests.length}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Waiter calls</div>
        </div>

        {/* Reservations */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 grid place-items-center font-bold">
              <CalendarCheck size={16} />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full">
              Today
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-ink">{todayReservations.length}</div>
          <div className="text-[11px] text-neutral-500 font-medium">Bookings</div>
        </div>
      </div>

      {/* Operational Quick Actions Panel */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-cream2">
        <h2 className="font-serif text-sm font-semibold text-ink mb-2.5">Manager Operational Shortcuts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <Link
            href="/admin/orders"
            className="p-2.5 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <ShoppingBag className="mx-auto text-wine" size={18} />
            <div className="text-[11px] font-semibold text-ink">Take Order</div>
          </Link>
          <Link
            href="/admin/kitchen"
            className="p-2.5 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <UtensilsCrossed className="mx-auto text-blue-600" size={18} />
            <div className="text-[11px] font-semibold text-ink">Kitchen Display</div>
          </Link>
          <Link
            href="/admin/floor"
            className="p-2.5 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <LayoutGrid className="mx-auto text-purple-600" size={18} />
            <div className="text-[11px] font-semibold text-ink">Floor Plan</div>
          </Link>
          <Link
            href="/admin/waiter"
            className="p-2.5 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <Bell className="mx-auto text-rose-600" size={18} />
            <div className="text-[11px] font-semibold text-ink">Service Calls</div>
          </Link>
          <Link
            href="/admin/online-orders"
            className="p-2.5 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <Globe className="mx-auto text-amber-600" size={18} />
            <div className="text-[11px] font-semibold text-ink">Online Orders</div>
          </Link>
          <Link
            href="/admin/reservations"
            className="p-2.5 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <CalendarCheck className="mx-auto text-emerald-600" size={18} />
            <div className="text-[11px] font-semibold text-ink">Reservations</div>
          </Link>
          <Link
            href="/admin/inventory"
            className="p-2.5 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <Package className="mx-auto text-gold" size={18} />
            <div className="text-[11px] font-semibold text-ink">Stock Catalog</div>
          </Link>
          <Link
            href="/admin/purchasing"
            className="p-2.5 bg-cream/50 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <Truck className="mx-auto text-neutral-700" size={18} />
            <div className="text-[11px] font-semibold text-ink">Issue PO</div>
          </Link>
        </div>
      </div>

      {/* ONLINE ORDERS COMMAND CENTER */}
      <DashboardOnlineOrdersClient initialOrders={marketplaceOrders} />

      {/* Main Grid: Live Orders & Service Calls vs Stock & Reservations */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols */}
        <div className="lg:col-span-7 space-y-8">
          {/* Active Orders Requiring Attention */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-ink">Orders Needing Manager Action</h2>
                <p className="text-xs text-neutral-500">Live order workflow dispatch and cooking status updates</p>
              </div>
              <Link href="/admin/orders" className="text-xs text-wine font-semibold hover:underline flex items-center gap-1">
                All Orders ({orders.length}) <ArrowRight size={14} />
              </Link>
            </div>

            {pendingOrders.length === 0 && cookingOrders.length === 0 && readyOrders.length === 0 ? (
              <div className="py-10 text-center text-neutral-400 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <p className="text-sm font-medium">No pending operational orders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...pendingOrders, ...cookingOrders, ...readyOrders].slice(0, 6).map((o) => (
                  <div key={o.id} className="bg-cream/30 p-3.5 rounded-xl border border-cream2 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">Order #{o.order_number || o.id.slice(0, 6)}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900">
                          {o.status}
                        </span>
                      </div>
                      <div className="text-neutral-500 mt-0.5">
                        {o.dining_sessions?.customer_name || o.customer_name || "Guest"} • {money(Number(o.total || o.amount))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {o.status === "placed" && (
                        <button
                          disabled={updatingOrderId === o.id}
                          onClick={() => handleStatusChange(o.id, "preparing")}
                          className="btn-wine text-[11px] py-1 px-3 shadow-xs flex items-center gap-1"
                        >
                          {updatingOrderId === o.id ? <Loader2 className="animate-spin" size={12} /> : null} Accept & Cook
                        </button>
                      )}
                      {o.status === "preparing" && (
                        <button
                          disabled={updatingOrderId === o.id}
                          onClick={() => handleStatusChange(o.id, "ready")}
                          className="btn-gold text-[11px] py-1 px-3 shadow-xs flex items-center gap-1 text-ink"
                        >
                          {updatingOrderId === o.id ? <Loader2 className="animate-spin" size={12} /> : null} Mark Ready
                        </button>
                      )}
                      {o.status === "ready" && (
                        <button
                          disabled={updatingOrderId === o.id}
                          onClick={() => handleStatusChange(o.id, "served")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold py-1 px-3 rounded-lg shadow-xs flex items-center gap-1"
                        >
                          {updatingOrderId === o.id ? <Loader2 className="animate-spin" size={12} /> : null} Mark Served
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Table Service Requests */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="text-rose-600" size={18} />
                <h2 className="font-serif text-lg font-bold text-ink">Active Table Calls</h2>
              </div>
              <Link href="/admin/waiter" className="text-xs text-wine font-semibold hover:underline">
                Waiter Screen
              </Link>
            </div>

            {openRequests.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-xs">
                No active waiter calls or bill requests pending.
              </div>
            ) : (
              <div className="space-y-2">
                {openRequests.map((req) => (
                  <div key={req.id} className="bg-rose-50/50 border border-rose-200 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-rose-950">Table #{req.table_number || "—"}</span>
                      <span className="ml-2 text-rose-800 capitalize font-medium">Requested: {req.type || "Service"}</span>
                    </div>
                    <button
                      disabled={resolvingRequestId === req.id}
                      onClick={() => handleResolveRequest(req.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1 px-3 rounded-lg text-[11px]"
                    >
                      {resolvingRequestId === req.id ? <Loader2 className="animate-spin inline" size={12} /> : "Resolve"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Cols */}
        <div className="lg:col-span-5 space-y-8">
          {/* Inventory Alerts */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-600" size={18} />
                <h2 className="font-serif text-lg font-bold text-ink">Low Stock & Reorder</h2>
              </div>
              <Link href="/admin/inventory" className="text-xs text-wine font-semibold hover:underline">
                Catalog
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center text-neutral-400 text-xs">
                All ingredient and stock levels are healthy.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-amber-950">{item.name}</div>
                      <div className="text-[11px] text-amber-800">
                        Stock: <span className="font-mono font-bold text-red-600">{item.quantity} {item.unit}</span>
                      </div>
                    </div>
                    <Link
                      href={`/admin/purchasing?action=new_po&inventory_item_id=${item.id}`}
                      className="btn-wine text-[11px] py-1 px-2.5"
                    >
                      Issue PO
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Today's Reservations */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="text-wine" size={18} />
                <h2 className="font-serif text-lg font-bold text-ink">Today&apos;s Reservations</h2>
              </div>
              <Link href="/admin/reservations" className="text-xs text-wine font-semibold hover:underline">
                Manage
              </Link>
            </div>

            {todayReservations.length === 0 ? (
              <div className="py-6 text-center text-neutral-400 text-xs">
                No table bookings scheduled for today.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {todayReservations.slice(0, 4).map((r) => (
                  <div key={r.id} className="bg-cream/30 p-2.5 rounded-xl border border-cream2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-ink">{r.name}</div>
                      <div className="text-[11px] text-neutral-500">{r.guests} Guests • {r.time}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-amber-100 text-amber-900">
                      {r.status}
                    </span>
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
