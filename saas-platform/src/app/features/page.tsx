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
  Server,
  Smartphone,
  AlertTriangle,
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
      // UNIQUE METRICS & LIVE MOCKUP FOR KDS
      liveMetrics: {
        title: "KDS BUMP BAR MONITOR",
        accentColor: "border-gold/40",
        items: [
          { label: "Active Kitchen Tickets", val: "14 Live Tickets", highlight: "text-gold font-bold font-mono" },
          { label: "Average Prep Time", val: "4.2 Minutes / Ticket", highlight: "text-emerald-400 font-bold font-mono" },
          { label: "Station Routing", val: "Tandoor, Mains, Bar, Pass", highlight: "text-slate-300 font-mono" },
          { label: "Rush Alert Status", val: "VIP Table #14 Order Fired", highlight: "text-wine font-bold font-mono" },
        ],
      },
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
      // UNIQUE METRICS FOR DEPOSITS
      liveMetrics: {
        title: "RESERVATION REVENUE GUARD",
        accentColor: "border-emerald-500/40",
        items: [
          { label: "Deposit Amount", val: "₹500 / Reservation", highlight: "text-gold font-bold font-mono" },
          { label: "No-Show Elimination", val: "0% Table No-Shows", highlight: "text-emerald-400 font-bold font-mono" },
          { label: "Payment Gateway", val: "Razorpay UPI & Cards", highlight: "text-slate-300 font-mono" },
          { label: "Ledger Settlement", val: "100% Credited to Bill", highlight: "text-emerald-400 font-mono" },
        ],
      },
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
      // UNIQUE METRICS FOR MARKETPLACE
      liveMetrics: {
        title: "OMNICHANNEL CHANNEL SYNC",
        accentColor: "border-sky-500/40",
        items: [
          { label: "Swiggy Channel", val: "ONLINE (0.3s Sync)", highlight: "text-emerald-400 font-bold font-mono" },
          { label: "Zomato Channel", val: "ONLINE (0.4s Sync)", highlight: "text-emerald-400 font-bold font-mono" },
          { label: "Auto 86 Out-of-Stock", val: "1-Click Global Toggle", highlight: "text-gold font-mono" },
          { label: "Order Feed Latency", val: "< 150ms Real-Time", highlight: "text-sky-400 font-mono" },
        ],
      },
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
      // UNIQUE METRICS FOR POS
      liveMetrics: {
        title: "DINING ROOM FLOOR MAP",
        accentColor: "border-purple-500/40",
        items: [
          { label: "Table Occupancy", val: "18 / 22 Tables Active", highlight: "text-gold font-bold font-mono" },
          { label: "Live Floor Breakdown", val: "12 Dining, 5 Billing, 1 Res", highlight: "text-slate-300 font-mono" },
          { label: "Waiter Handheld POS", val: "4 Devices Connected", highlight: "text-emerald-400 font-mono" },
          { label: "Check Splitting", val: "Instant Split Check Active", highlight: "text-purple-400 font-mono" },
        ],
      },
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
      // UNIQUE METRICS FOR INVENTORY
      liveMetrics: {
        title: "RECIPE COGS & STOCK LEDGER",
        accentColor: "border-amber-500/40",
        items: [
          { label: "Raw Ingredients Tracked", val: "142 Master SKUs", highlight: "text-gold font-bold font-mono" },
          { label: "COGS Target Variance", val: "< 1.2% Variance", highlight: "text-emerald-400 font-bold font-mono" },
          { label: "Automatic Stock Deduct", val: "Enabled on Kitchen Fire", highlight: "text-slate-300 font-mono" },
          { label: "Low-Stock Reorder Alert", val: "Saffron & Paneer Reorder", highlight: "text-amber-400 font-mono" },
        ],
      },
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
      // UNIQUE METRICS FOR JOURNAL
      liveMetrics: {
        title: "EDITORIAL CMS PUBLISHER",
        accentColor: "border-rose-500/40",
        items: [
          { label: "Published Brand Stories", val: "8 Articles Live", highlight: "text-gold font-bold font-mono" },
          { label: "Public Site Integration", val: "Synced with localhost:3000/blog", highlight: "text-slate-300 font-mono" },
          { label: "Media Storage CDN", val: "AWS S3 Optimized", highlight: "text-emerald-400 font-mono" },
          { label: "Google SEO Indexing", val: "Schema.org Article Ready", highlight: "text-rose-400 font-mono" },
        ],
      },
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

              {/* UNIQUE LIVE OPERATIONAL METRICS CARD FOR EACH FEATURE */}
              <div className={`lg:col-span-5 bg-navy-950 border ${mod.liveMetrics.accentColor} rounded-2xl p-6 shadow-xl space-y-4`}>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400 font-mono">
                  <span>{mod.liveMetrics.title}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                </div>

                <div className="space-y-3 py-1 text-xs">
                  {mod.liveMetrics.items.map((item, iIdx) => (
                    <div key={iIdx} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">{item.label}</span>
                      <span className={item.highlight}>{item.val}</span>
                    </div>
                  ))}
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
