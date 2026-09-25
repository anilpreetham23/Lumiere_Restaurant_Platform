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
  Plus,
  Loader2,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { money } from "@/data/menu";
import { setSessionOrderStatus, resolveServiceRequest } from "@/actions/admin";

type StaffDashboardProps = {
  restaurantName: string;
  orders: any[];
  reservations: any[];
  serviceRequests: any[];
  tables: any[];
};

export default function StaffDashboard({
  restaurantName,
  orders,
  reservations,
  serviceRequests,
  tables,
}: StaffDashboardProps) {
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const pendingOrders = orders.filter((o) => o.status === "placed" || o.status === "accepted");
  const cookingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  const openRequests = serviceRequests.filter((s) => s.status === "pending" || !s.status);
  const occupiedTables = tables.filter((t) => t.status === "occupied");
  const todayReservations = reservations.filter((r) => r.date === todayStr || r.status === "pending");

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
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
              Staff Shift Dashboard
            </span>
            <span className="text-xs text-neutral-400 font-medium">Task & Operations Focused</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink">{restaurantName}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Active shift workspace for POS order entry, table service, kitchen status, and guest requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/orders" className="btn-wine text-xs py-2 px-4 shadow-xs flex items-center gap-1.5 font-bold">
            <Plus size={16} /> Take POS Order
          </Link>
          <Link href="/admin/waiter" className="btn-gold text-xs py-2 px-3.5 shadow-xs flex items-center gap-1.5 text-ink font-bold">
            <Bell size={15} /> Waiter Calls ({openRequests.length})
          </Link>
        </div>
      </div>

      {/* Task Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dishes Ready for Serving (HIGHEST PRIORITY) */}
        <div className={`rounded-2xl p-5 shadow-xs border ${
          readyOrders.length > 0 ? "bg-emerald-500 text-white border-emerald-600 animate-pulse" : "bg-white border-cream2 text-ink"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`w-10 h-10 rounded-xl grid place-items-center font-bold ${
              readyOrders.length > 0 ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-900"
            }`}>
              <CheckCircle2 size={20} />
            </span>
            {readyOrders.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-emerald-900 px-2 py-0.5 rounded-full shadow-xs">
                SERVE NOW
              </span>
            )}
          </div>
          <div className={`font-serif text-3xl font-bold ${readyOrders.length > 0 ? "text-white" : "text-ink"}`}>
            {readyOrders.length}
          </div>
          <div className={`text-xs font-medium mt-0.5 ${readyOrders.length > 0 ? "text-emerald-100" : "text-neutral-500"}`}>
            Ready to serve dishes
          </div>
        </div>

        {/* Orders in Preparation */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-2">
            <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 grid place-items-center font-bold">
              <UtensilsCrossed size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full">
              Kitchen
            </span>
          </div>
          <div className="font-serif text-3xl font-bold text-ink">{pendingOrders.length + cookingOrders.length}</div>
          <div className="text-xs text-neutral-500 font-medium mt-0.5">Orders in preparation</div>
        </div>

        {/* Table Service Calls */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-2">
            <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-900 grid place-items-center font-bold">
              <Bell size={20} />
            </span>
            {openRequests.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 bg-rose-50 px-2 py-0.5 rounded-full">
                Needs Staff
              </span>
            )}
          </div>
          <div className="font-serif text-3xl font-bold text-ink">{openRequests.length}</div>
          <div className="text-xs text-neutral-500 font-medium mt-0.5">Table service requests</div>
        </div>

        {/* Occupied Tables */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-cream2">
          <div className="flex items-center justify-between mb-2">
            <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 grid place-items-center font-bold">
              <LayoutGrid size={20} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 bg-purple-50 px-2 py-0.5 rounded-full">
              Floor
            </span>
          </div>
          <div className="font-serif text-3xl font-bold text-ink">
            {occupiedTables.length} / {tables.length}
          </div>
          <div className="text-xs text-neutral-500 font-medium mt-0.5">Occupied tables</div>
        </div>
      </div>

      {/* Staff Operational Quick Shortcuts */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-cream2">
        <h2 className="font-serif text-sm font-semibold text-ink mb-2.5">Staff Task Shortcuts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Link
            href="/admin/orders"
            className="p-3 bg-wine text-white rounded-xl text-center space-y-1 hover:bg-wine/90 transition-all font-semibold shadow-xs"
          >
            <ShoppingBag className="mx-auto" size={20} />
            <div className="text-xs">Take POS Order</div>
          </Link>
          <Link
            href="/admin/kitchen"
            className="p-3 bg-cream/60 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <UtensilsCrossed className="mx-auto text-blue-700" size={20} />
            <div className="text-xs font-semibold text-ink">Kitchen Screen</div>
          </Link>
          <Link
            href="/admin/floor"
            className="p-3 bg-cream/60 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <LayoutGrid className="mx-auto text-purple-700" size={20} />
            <div className="text-xs font-semibold text-ink">Floor Plan & Tables</div>
          </Link>
          <Link
            href="/admin/waiter"
            className="p-3 bg-cream/60 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <Bell className="mx-auto text-rose-600" size={20} />
            <div className="text-xs font-semibold text-ink">Service Calls</div>
          </Link>
          <Link
            href="/admin/reservations"
            className="p-3 bg-cream/60 hover:bg-cream border border-cream2 rounded-xl text-center space-y-1 transition-all"
          >
            <CalendarCheck className="mx-auto text-emerald-700" size={20} />
            <div className="text-xs font-semibold text-ink">Guest Reservations</div>
          </Link>
        </div>
      </div>

      {/* Ready to Serve Section (High Urgency) */}
      {readyOrders.length > 0 && (
        <section className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald-700" size={20} />
              <h2 className="font-serif text-xl font-bold text-emerald-950">Dishes Ready for Table Delivery</h2>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              {readyOrders.length} Ready
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.map((o) => (
              <div key={o.id} className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-ink">Order #{o.order_number || o.id.slice(0, 6)}</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase">Ready</span>
                </div>
                <div className="text-xs text-neutral-600">
                  Customer: <span className="font-semibold text-ink">{o.dining_sessions?.customer_name || o.customer_name || "Guest"}</span>
                </div>
                <button
                  disabled={updatingOrderId === o.id}
                  onClick={() => handleStatusChange(o.id, "served")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  {updatingOrderId === o.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Mark Served to Table
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Grid: Pending Kitchen Orders vs Table Calls */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Active Orders */}
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-ink">Shift Orders In Progress</h2>
                <p className="text-xs text-neutral-500">Live order queue requiring kitchen and floor coordination</p>
              </div>
              <Link href="/admin/orders" className="text-xs text-wine font-semibold hover:underline flex items-center gap-1">
                View All ({orders.length}) <ArrowRight size={14} />
              </Link>
            </div>

            {pendingOrders.length === 0 && cookingOrders.length === 0 ? (
              <div className="py-10 text-center text-neutral-400 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <p className="text-sm font-medium">No pending kitchen orders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...pendingOrders, ...cookingOrders].map((o) => (
                  <div key={o.id} className="bg-cream/30 p-3.5 rounded-xl border border-cream2 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">Order #{o.order_number || o.id.slice(0, 6)}</span>
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                          o.status === "preparing" ? "bg-blue-100 text-blue-900" : "bg-amber-100 text-amber-900"
                        }`}>
                          {o.status}
                        </span>
                      </div>
                      <div className="text-neutral-500 mt-0.5">
                        {o.dining_sessions?.customer_name || o.customer_name || "Guest"} • {money(Number(o.total || o.amount))}
                      </div>
                    </div>

                    <div>
                      {o.status === "placed" && (
                        <button
                          disabled={updatingOrderId === o.id}
                          onClick={() => handleStatusChange(o.id, "preparing")}
                          className="btn-wine text-[11px] py-1 px-3 shadow-xs"
                        >
                          {updatingOrderId === o.id ? <Loader2 className="animate-spin inline" size={12} /> : "Accept & Cook"}
                        </button>
                      )}
                      {o.status === "preparing" && (
                        <button
                          disabled={updatingOrderId === o.id}
                          onClick={() => handleStatusChange(o.id, "ready")}
                          className="btn-gold text-[11px] py-1 px-3 shadow-xs text-ink font-bold"
                        >
                          {updatingOrderId === o.id ? <Loader2 className="animate-spin inline" size={12} /> : "Mark Ready"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Cols: Service Calls & Reservations */}
        <div className="lg:col-span-5 space-y-8">
          {/* Service Requests */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="text-rose-600" size={18} />
                <h2 className="font-serif text-lg font-bold text-ink">Open Table Calls</h2>
              </div>
              <Link href="/admin/waiter" className="text-xs text-wine font-semibold hover:underline">
                Waiter View
              </Link>
            </div>

            {openRequests.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-xs">
                No active service requests right now.
              </div>
            ) : (
              <div className="space-y-2">
                {openRequests.map((req) => (
                  <div key={req.id} className="bg-rose-50/60 border border-rose-200 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-rose-950">Table #{req.table_number || "—"}</span>
                      <span className="ml-2 text-rose-800 capitalize font-medium">{req.type || "Service Call"}</span>
                    </div>
                    <button
                      disabled={resolvingRequestId === req.id}
                      onClick={() => handleResolveRequest(req.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3 rounded-lg text-[11px]"
                    >
                      {resolvingRequestId === req.id ? <Loader2 className="animate-spin inline" size={12} /> : "Resolve"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Today's Reservations */}
          <section className="bg-white rounded-2xl p-6 shadow-xs border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="text-emerald-700" size={18} />
                <h2 className="font-serif text-lg font-bold text-ink">Shift Guest Reservations</h2>
              </div>
              <Link href="/admin/reservations" className="text-xs text-wine font-semibold hover:underline">
                All Bookings
              </Link>
            </div>

            {todayReservations.length === 0 ? (
              <div className="py-6 text-center text-neutral-400 text-xs">
                No guest reservations scheduled for today.
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
