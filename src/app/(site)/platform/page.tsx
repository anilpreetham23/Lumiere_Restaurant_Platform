"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Calendar,
  Utensils,
  LayoutGrid,
  BookOpen,
  Package,
  Users,
  BarChart3,
  Globe,
  Clock,
  HelpCircle,
  Building2,
  Check,
  X,
  Plus,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";

export default function SaaSPlatformPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("Growth Fine Dining");
  const [monthlyOrders, setMonthlyOrders] = useState<number>(600);
  const [avgBill, setAvgBill] = useState<number>(1200);

  // Form state for demo/trial
  const [demoForm, setDemoForm] = useState({
    restaurant_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
  });
  const [demoSuccess, setDemoSuccess] = useState(false);

  // ROI Math
  const estimatedNoShowSavings = Math.round(monthlyOrders * 0.15 * (avgBill * 0.4));
  const estimatedTimeSavedHours = Math.round(monthlyOrders * 0.2);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSuccess(true);
  };

  const PLANS = [
    {
      name: "Starter Outlet",
      tagline: "Perfect for single cafes & emerging dining spots.",
      monthlyPrice: 2499,
      annualPrice: 1999,
      popular: false,
      features: [
        "1 Restaurant Location",
        "Online Food Ordering System",
        "Table Reservation Engine",
        "Standard Kitchen Display (KDS)",
        "Up to 5 Staff Accounts",
        "Basic Sales & Orders Reports",
        "Email Support",
      ],
      notIncluded: [
        "Swiggy / Zomato Marketplace Sync",
        "Razorpay Priority Deposit System",
        "Inventory & PO Purchasing Module",
        "Multi-Outlet Workspace Switcher",
      ],
    },
    {
      name: "Growth Fine Dining",
      tagline: "Complete OS for high-volume restaurants & fine dining.",
      monthlyPrice: 5999,
      annualPrice: 4999,
      popular: true,
      features: [
        "1 Restaurant Location (Expandable)",
        "Swiggy & Zomato Marketplace Sync",
        "Razorpay & Stripe Priority Deposits",
        "Advanced KDS & Bump Bar Terminal",
        "Floor Plan & Waiter Order Terminal",
        "Inventory, Purchasing & COGS Engine",
        "Journal & Culinary Storytelling CMS",
        "Unlimited Staff Accounts & Roles",
        "24/7 Priority Support",
      ],
      notIncluded: ["Multi-Outlet Franchise Switcher", "Custom Domain & Custom SLA"],
    },
    {
      name: "Enterprise Multi-Outlet",
      tagline: "For restaurant groups, chains, and multi-branch franchises.",
      monthlyPrice: 11999,
      annualPrice: 9999,
      popular: false,
      features: [
        "Unlimited Outlets & Franchise Workspace Switcher",
        "All Growth Features Included",
        "Custom White-Label Branding & Theme Engine",
        "Custom Domain & API Integrations",
        "Centralized Inventory & Transfer Orders",
        "Dedicated Account Manager",
        "Custom SLA & 99.99% Uptime Guarantee",
        "On-Site Staff Training",
      ],
      notIncluded: [],
    },
  ];

  return (
    <>
      <PageHero
        label="Lumière Restaurant OS"
        title="The All-In-One Restaurant SaaS Platform"
        sub="Powering reservations, live kitchen displays, marketplace orders, inventory, and fine dining experiences."
      />

      {/* Hero SaaS Showcase Banner */}
      <section className="py-20 bg-cream">
        <div className="mx-auto max-w-6xl px-5 text-center space-y-8">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-wine/10 text-wine border border-wine/20 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-gold" />
              <span>Multi-Tenant B2B Restaurant Software</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-ink max-w-4xl mx-auto leading-tight mt-4">
              Modernize Your Restaurant Operations from Front-of-House to Kitchen
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed mt-4">
              Eliminate order bottlenecks, reduce table no-shows with refundable deposit booking, sync Swiggy & Zomato marketplace orders, and empower your chefs with a real-time Kitchen Display System.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <button
                onClick={() => {
                  setSelectedPlan("Growth Fine Dining");
                  setIsDemoModalOpen(true);
                }}
                className="w-full sm:w-auto px-8 py-4 bg-wine hover:bg-wine-dark text-white font-semibold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/admin"
                className="w-full sm:w-auto px-8 py-4 bg-white border border-neutral-300 hover:border-wine text-ink font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Building2 className="w-4 h-4 text-wine" />
                <span>Explore Live Admin Demo</span>
              </Link>
            </div>
          </Reveal>

          {/* Key Metrics Strip */}
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs text-center space-y-1">
                <div className="font-serif text-3xl font-bold text-wine">99.9%</div>
                <div className="text-xs text-neutral-500 font-medium">Cloud System Uptime</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs text-center space-y-1">
                <div className="font-serif text-3xl font-bold text-wine">45%</div>
                <div className="text-xs text-neutral-500 font-medium">No-Show Reduction</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs text-center space-y-1">
                <div className="font-serif text-3xl font-bold text-wine">3x</div>
                <div className="text-xs text-neutral-500 font-medium">Faster KDS Prep Time</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs text-center space-y-1">
                <div className="font-serif text-3xl font-bold text-wine">100+</div>
                <div className="text-xs text-neutral-500 font-medium">Outlets Managed</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Feature Modules Breakdown */}
      <section className="py-20 bg-white border-y border-neutral-200">
        <div className="mx-auto max-w-6xl px-5 space-y-16">
          <div className="text-center space-y-3">
            <span className="text-gold font-serif text-sm tracking-widest uppercase font-bold">Comprehensive OS Capabilities</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink">Everything Your Restaurant Needs to Scale</h2>
            <div className="gold-line mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Reveal delay={0.05}>
              <div className="p-8 rounded-2xl bg-cream/60 border border-cream2 hover:border-wine/30 transition shadow-xs space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-wine text-gold flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-ink">Marketplace & Order Ingestion</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Consolidate Swiggy, Zomato, and web orders into a unified stream with real-time audio notifications and auto-print ticket dispatching.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="p-8 rounded-2xl bg-cream/60 border border-cream2 hover:border-wine/30 transition shadow-xs space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-wine text-gold flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-ink">Priority Deposit Reservations</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Offer guests optional or mandatory ₹500 refundable table deposit bookings via Razorpay with 100% bill credit at dining time.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="p-8 rounded-2xl bg-cream/60 border border-cream2 hover:border-wine/30 transition shadow-xs space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-wine text-gold flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                  <Utensils className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-ink">Real-Time Kitchen KDS</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Empower line chefs with interactive bump bars, preparation timers, station filtering (Tandoor, Mains, Bar), and ticket order state management.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="p-8 rounded-2xl bg-cream/60 border border-cream2 hover:border-wine/30 transition shadow-xs space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-wine text-gold flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-ink">Floor & Waiter POS</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Live table map showing occupied vs free tables, waiter order entry, QR table ordering, and fast digital bill generation.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <div className="p-8 rounded-2xl bg-cream/60 border border-cream2 hover:border-wine/30 transition shadow-xs space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-wine text-gold flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-ink">Inventory & Purchasing</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Real-time stock level monitoring, supplier PO generation, recipe COGS cost analysis, and low-inventory threshold alerts.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="p-8 rounded-2xl bg-cream/60 border border-cream2 hover:border-wine/30 transition shadow-xs space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-wine text-gold flex items-center justify-center shadow-md group-hover:scale-110 transition duration-300">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-ink">Journal Editorial CMS</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Publish brand stories, chef interviews, special seasonal menus, and press releases directly to your public website.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="py-20 bg-cream">
        <div className="mx-auto max-w-5xl px-5 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-gold font-serif text-sm tracking-widest uppercase font-bold">Interactive Calculator</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink">Estimate Your Restaurant's Monthly ROI</h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
              See how much revenue you can recover from reduced table no-shows and staff hours saved with Lumière OS.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-xl grid md:grid-cols-2 gap-8 items-center">
            {/* Sliders */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-ink mb-2">
                  <span>Monthly Table Bookings</span>
                  <span className="text-wine font-mono font-bold text-sm">{monthlyOrders} Bookings</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={monthlyOrders}
                  onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                  className="w-full accent-wine cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-ink mb-2">
                  <span>Average Dining Bill (₹)</span>
                  <span className="text-wine font-mono font-bold text-sm">₹{avgBill}</span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={5000}
                  step={100}
                  value={avgBill}
                  onChange={(e) => setAvgBill(Number(e.target.value))}
                  className="w-full accent-wine cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Results Box */}
            <div className="bg-gradient-to-br from-wine to-wine-dark text-white p-6 rounded-2xl space-y-4 text-center">
              <div className="text-xs uppercase tracking-wider text-gold font-bold">Estimated Monthly Value Gained</div>
              <div className="font-serif text-4xl font-bold text-gold">₹{estimatedNoShowSavings.toLocaleString("en-IN")}</div>
              <p className="text-xs text-cream/80">
                Recovered from eliminated no-shows & optimized table turnaround times.
              </p>
              <div className="pt-3 border-t border-white/10 text-xs text-cream/90 flex justify-between px-4">
                <span>Kitchen Hours Saved:</span>
                <span className="font-bold text-white font-mono">{estimatedTimeSavedHours} hrs/mo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 space-y-12">
          <div className="text-center space-y-4">
            <span className="text-gold font-serif text-sm tracking-widest uppercase font-bold">Simple, Transparent Pricing</span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-ink">Choose the Right Plan for Your Restaurant</h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
              14-day free trial on all plans. No credit card required to start.
            </p>

            {/* Billing Toggle */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${billingCycle === "monthly" ? "text-wine" : "text-neutral-500"}`}>
                Monthly Billing
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="w-14 h-7 bg-neutral-200 rounded-full p-1 transition relative"
              >
                <div
                  className={`w-5 h-5 bg-wine rounded-full transition-transform ${
                    billingCycle === "annual" ? "translate-x-7 bg-gold" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === "annual" ? "text-wine" : "text-neutral-500"}`}>
                <span>Annual Billing</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8 pt-6">
            {PLANS.map((plan) => {
              const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.name}
                  className={`bg-white rounded-3xl p-8 border flex flex-col justify-between transition-all relative ${
                    plan.popular
                      ? "border-wine shadow-2xl scale-105 z-10 ring-2 ring-wine/20"
                      : "border-neutral-200 shadow-sm hover:border-neutral-300"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-wine text-gold text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                      Most Popular
                    </span>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-serif text-2xl font-bold text-ink">{plan.name}</h3>
                      <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">{plan.tagline}</p>
                    </div>

                    <div className="pt-2 border-t border-neutral-100">
                      <div className="flex items-baseline gap-1">
                        <span className="font-serif text-4xl font-bold text-wine">₹{price.toLocaleString("en-IN")}</span>
                        <span className="text-xs text-neutral-400">/ month</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {billingCycle === "annual" ? "Billed annually" : "Billed monthly"}
                      </span>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-neutral-100">
                      <div className="text-xs font-bold uppercase tracking-wider text-ink">Included Features:</div>
                      {plan.features.map((feat) => (
                        <div key={feat} className="flex items-center gap-2 text-xs text-neutral-700 font-medium">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}

                      {plan.notIncluded.map((feat) => (
                        <div key={feat} className="flex items-center gap-2 text-xs text-neutral-400 line-through">
                          <X className="w-4 h-4 text-neutral-300 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={() => {
                        setSelectedPlan(plan.name);
                        setIsDemoModalOpen(true);
                      }}
                      className={`w-full py-3.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs ${
                        plan.popular
                          ? "bg-wine text-white hover:bg-wine-dark shadow-md"
                          : "bg-cream hover:bg-cream2 text-ink border border-cream2"
                      }`}
                    >
                      <span>Start 14-Day Free Trial</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Start Trial / Demo Request Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-neutral-200 p-6 md:p-8 space-y-6 relative">
            <button
              onClick={() => {
                setIsDemoModalOpen(false);
                setDemoSuccess(false);
              }}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-100 rounded-full transition text-neutral-400 hover:text-ink"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-gold bg-wine text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Selected Plan: {selectedPlan}</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink">Start Your 14-Day Free Trial</h2>
              <p className="text-xs text-neutral-500">
                Set up your restaurant workspace in 2 minutes. No credit card required.
              </p>
            </div>

            {demoSuccess ? (
              <div className="py-8 text-center space-y-4">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
                <h3 className="font-serif text-2xl font-bold text-ink">Welcome to Lumière OS!</h3>
                <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                  Your trial request for <span className="font-bold text-ink">{demoForm.restaurant_name}</span> has been received. Our team has sent your login credentials to <span className="font-bold text-wine">{demoForm.email}</span>.
                </p>
                <Link
                  href="/admin"
                  className="btn-wine w-full justify-center text-xs font-semibold py-3 mt-4"
                >
                  Launch Restaurant Admin Workspace
                </Link>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Restaurant / Outlet Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Spice Bistro"
                    value={demoForm.restaurant_name}
                    onChange={(e) => setDemoForm({ ...demoForm, restaurant_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Chef Rajesh"
                      value={demoForm.contact_name}
                      onChange={(e) => setDemoForm({ ...demoForm, contact_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">City / Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="Bengaluru"
                      value={demoForm.city}
                      onChange={(e) => setDemoForm({ ...demoForm, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@restaurant.com"
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={demoForm.phone}
                    onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-wine transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-wine hover:bg-wine-dark text-white text-xs font-semibold rounded-xl shadow-md transition"
                >
                  Create Restaurant Workspace
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
