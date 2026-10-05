"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShoppingBag,
  Utensils,
  Truck,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function OrderTrackingPage() {
  const [searchId, setSearchId] = useState("");
  const [activeOrder, setActiveOrder] = useState<any>({
    id: "ORD-8924",
    customerName: "Ananya Sharma",
    phone: "+91 98765 43210",
    address: "Flat 402, Oakwood Apartments, 100ft Road, Indiranagar, Bengaluru",
    orderType: "Delivery",
    createdAt: "12:15 PM Today",
    estimatedDelivery: "12:45 PM (In 18 mins)",
    status: "Kitchen Prep", // Pending, Kitchen Prep, Out for Delivery, Delivered
    step: 2, // 1: Received, 2: Kitchen Prep, 3: Out for Delivery, 4: Delivered
    total: 1480,
    items: [
      { name: "Murgh Makhani (Butter Chicken)", qty: 1, price: 580 },
      { name: "Hyderabadi Dum Biryani", qty: 1, price: 620 },
      { name: "Garlic Butter Naan", qty: 2, price: 140 },
      { name: "Gulab Jamun Flambé", qty: 1, price: 140 },
    ],
  });

  const STEPS = [
    { title: "Order Placed", desc: "Received & confirmed by Lumière system", icon: CheckCircle2 },
    { title: "Kitchen Preparation", desc: "Chefs are crafting your dish on line", icon: Utensils },
    { title: "Out for Delivery", desc: "Rider dispatched with thermal insulated box", icon: Truck },
    { title: "Delivered", desc: "Arrived fresh at your doorstep", icon: ShoppingBag },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    // Simulate finding order
    setActiveOrder({
      ...activeOrder,
      id: searchId.toUpperCase().startsWith("ORD-") ? searchId.toUpperCase() : `ORD-${searchId.toUpperCase()}`,
      createdAt: "Just now",
      status: "Kitchen Prep",
      step: 2,
    });
  };

  return (
    <div className="bg-cream min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-wine/10 text-wine text-xs font-mono font-semibold uppercase">
            <Sparkles size={14} />
            <span>Live Order Status</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
            Track Your Dining Order
          </h1>
          <p className="text-neutral-600 text-sm max-w-lg mx-auto font-light">
            Enter your Order Reference ID or phone number to see live status updates from our Indiranagar kitchen.
          </p>
        </div>

        {/* SEARCH BAR */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="e.g. ORD-8924 or 9876543210"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full bg-white border border-cream3 rounded-xl pl-10 pr-4 py-3 text-sm text-ink focus:outline-none focus:border-gold shadow-sm"
            />
          </div>
          <button type="submit" className="btn-gold px-6 py-3 text-xs font-bold rounded-xl shadow-md">
            Track Order
          </button>
        </form>

        {/* TRACKING CARD */}
        {activeOrder && (
          <div className="bg-white border border-cream2 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
            {/* TOP BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-cream2 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-xl text-ink">{activeOrder.id}</span>
                  <span className="bg-wine/10 text-wine text-xs font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
                    {activeOrder.orderType}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Placed on {activeOrder.createdAt} &middot; Guest: {activeOrder.customerName}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                <Clock size={20} className="text-amber-600 animate-pulse" />
                <div>
                  <div className="text-[10px] text-amber-700 font-mono uppercase tracking-wider">Estimated Delivery</div>
                  <div className="text-xs font-bold text-amber-900">{activeOrder.estimatedDelivery}</div>
                </div>
              </div>
            </div>

            {/* LIVE STEPPER */}
            <div className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                {STEPS.map((stepItem, idx) => {
                  const stepNum = idx + 1;
                  const isCompleted = stepNum < activeOrder.step;
                  const isCurrent = stepNum === activeOrder.step;

                  return (
                    <div key={idx} className="flex md:flex-col items-center text-left md:text-center gap-4 md:gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          isCompleted
                            ? "bg-emerald-500 text-white shadow-lg"
                            : isCurrent
                            ? "bg-wine text-white shadow-xl ring-4 ring-wine/20 scale-110"
                            : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                        }`}
                      >
                        <stepItem.icon size={22} />
                      </div>
                      <div>
                        <div
                          className={`text-sm font-bold ${
                            isCurrent ? "text-wine font-serif text-base" : isCompleted ? "text-emerald-700" : "text-neutral-400"
                          }`}
                        >
                          {stepItem.title}
                        </div>
                        <div className="text-[11px] text-neutral-500 leading-tight mt-0.5">{stepItem.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ORDER ITEMS & DELIVERY DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-cream2 text-xs">
              {/* ITEMS BREAKDOWN */}
              <div className="space-y-3 bg-cream/60 p-4 rounded-2xl border border-cream2">
                <div className="font-bold text-ink text-sm flex items-center justify-between">
                  <span>Order Items</span>
                  <span className="font-mono text-wine">₹{activeOrder.total.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  {activeOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-neutral-700">
                      <span>
                        <span className="font-bold text-wine">{item.qty}x</span> {item.name}
                      </span>
                      <span className="font-mono text-neutral-500">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ADDRESS & SUPPORT */}
              <div className="space-y-3 bg-cream/60 p-4 rounded-2xl border border-cream2">
                <div className="font-bold text-ink text-sm flex items-center gap-2">
                  <MapPin size={16} className="text-gold" />
                  <span>Delivery Address</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">{activeOrder.address}</p>
                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">Need help with your order?</span>
                  <a href="tel:+919346543338" className="text-wine font-bold flex items-center gap-1 hover:underline">
                    <Phone size={12} /> Call Restaurant (+91 93465 43338)
                  </a>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-cream2 text-xs">
              <Link href="/menu" className="text-wine font-bold flex items-center gap-1 hover:underline">
                &larr; Order More Items
              </Link>
              <Link href="/reservations" className="btn-gold px-5 py-2.5 text-xs rounded-xl">
                Reserve a Table for Dinner
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
