"use client";

import React from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import {
  Utensils,
  Layers,
  ShoppingBag,
  Store,
  BookOpen,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Flame,
  ShieldCheck,
  Clock,
  Zap,
  Check,
} from "lucide-react";

export default function FeaturesPage() {
  const MODULES = [
    {
      id: "kds",
      title: "Real-Time Kitchen Display System (KDS)",
      badge: "Kitchen Operations",
      icon: Flame,
      summary: "Replace noisy paper tickets with interactive digital bump bars, target prep timers, and station-based routing.",
      details: [
        "Station-based order routing (Tandoor, Mains, Desserts, Bar, Pass)",
        "Live color-coded timers (Green < 5m, Yellow < 10m, Red > 12m)",
        "Audio alerts for new incoming orders and bump bar station clear",
        "Prep delay bottleneck analytics for kitchen management",
      ],
    },
    {
      id: "deposits",
      title: "Priority Reservation & Deposit Protection",
      badge: "Revenue Guard",
      icon: ShieldCheck,
      summary: "Protect premium weekend table slots with ₹500 refundable Razorpay deposits that credit directly against guest checks.",
      details: [
        "Configurable deposit rules per day, time slot, or table category",
        "Seamless Razorpay Payment Gateway integration with auto-invoicing",
        "Automated WhatsApp & SMS reservation confirmation vouchers",
        "Instant refund capabilities for cancellations before deadline",
      ],
    },
    {
      id: "marketplace",
      title: "Marketplace & Direct Order Aggregator",
      badge: "Omnichannel Sync",
      icon: ShoppingBag,
      summary: "Consolidate Swiggy, Zomato, Direct Web Takeaway, and Table QR Orders into one synchronized live feed.",
      details: [
        "Single-screen order stream eliminating tablet sprawl at front desk",
        "Automated menu item availability toggle across Swiggy & Zomato",
        "Direct delivery driver tracking and rider dispatch alerts",
        "Unified daily settlement reports across online channels",
      ],
    },
    {
      id: "pos",
      title: "Interactive Floor Plan & Waiter POS",
      badge: "Floor Operations",
      icon: Store,
      summary: "Visual graphical layout of dining rooms, live table status indicators, and mobile order entry for floor staff.",
      details: [
        "Real-time table status (Free, Reserved, Seated, Order Fired, Bill Printed)",
        "Waiter tablet ordering with instant kitchen ticket dispatch",
        "Split check, table merge, and item discount controls",
        "Digital receipt via WhatsApp / SMS with zero paper waste",
      ],
    },
    {
      id: "inventory",
      title: "Inventory, Recipe COGS & Purchasing",
      badge: "Cost Control",
      icon: Layers,
      summary: "Control raw material costs, track ingredient batch stock levels, and monitor exact Cost of Goods Sold per dish.",
      details: [
        "Recipe ingredient mapping with automatic deduction on order fire",
        "Low-stock threshold notifications & purchase order generation",
        "Supplier master directory with purchase history and price trends",
        "COGS variance alerts comparing theoretical vs actual usage",
      ],
    },
    {
      id: "journal",
      title: "Journal Editorial & Content CMS",
      badge: "Brand Storytelling",
      icon: BookOpen,
      summary: "Publish luxury brand stories, chef profiles, seasonal menu highlights, and culinary press releases directly to your public site.",
      details: [
        "Rich text editor with cover photo uploads and media gallery",
        "Category tagging (Recipes, Chef's Table, Behind the Scenes)",
        "SEO metadata controls for rank indexing on Google",
        "Direct admin integration on public dining platform",
      ],
    },
  ];

  return (
    <PageWrapper>
      {/* HEADER */}
      <section className="py-12 bg-navy-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-mono font-semibold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Complete Architecture Specs</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">
            Built for High-Volume Restaurant Excellence
          </h1>
          <p className="text-slate-300 text-base max-w-2xl mx-auto font-light">
            Discover the modular architecture of Lumière OS designed to streamline every step of your restaurant workflow.
          </p>
        </div>
      </section>

      {/* MODULE LIST */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {MODULES.map((mod, index) => (
            <div
              key={mod.id}
              className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-gold/30 transition-all ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <span className="bg-wine/20 text-gold text-xs font-mono px-3 py-1 rounded-full border border-wine/30 uppercase">
                    {mod.badge}
                  </span>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">{mod.title}</h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{mod.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {mod.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-navy-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400 font-mono">
                  <span>MODULE LIVE STATUS</span>
                  <span className="text-emerald-400 font-bold">100% OPERATIONAL</span>
                </div>
                <div className="space-y-3 py-2 text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between">
                    <span className="text-slate-300">Target Efficiency Gain</span>
                    <span className="text-gold font-bold font-mono">+35% Speed</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between">
                    <span className="text-slate-300">POS & Cloud Latency</span>
                    <span className="text-emerald-400 font-bold font-mono">&lt; 120ms</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between">
                    <span className="text-slate-300">Data Synchronization</span>
                    <span className="text-slate-300 font-mono">Real-time WebSockets</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CALLOUT */}
      <section className="py-12 bg-slate-900/40 border-t border-slate-800 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h3 className="font-serif text-2xl font-bold text-white">Want to see these features in action?</h3>
          <div className="flex justify-center gap-4">
            <Link href="/pricing" className="btn-gold px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <span>View Pricing Plans</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="http://localhost:3000/admin"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Open Live Admin Workspace
            </a>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
