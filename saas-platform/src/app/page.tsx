"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TrialModal from "@/components/TrialModal";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Calendar,
  Utensils,
  LayoutGrid,
  Package,
  BookOpen,
  Users,
  Building2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  ExternalLink,
} from "lucide-react";

export default function SaaSMainPage() {
  const [isTrialOpen, setIsTrialOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Growth Fine Dining");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // ROI Calculator State
  const [monthlyBookings, setMonthlyBookings] = useState<number>(600);
  const [avgBill, setAvgBill] = useState<number>(1200);

  const handleOpenTrial = (planName?: string) => {
    if (planName) setSelectedPlan(planName);
    setIsTrialOpen(true);
  };

  // ROI Calculations
  const recoveredNoShowRevenue = Math.round(monthlyBookings * 0.15 * (avgBill * 0.4));
  const kitchenHoursSaved = Math.round(monthlyBookings * 0.2);

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

  const FAQS = [
    {
      q: "How fast can we set up Lumière OS for our restaurant?",
      a: "Provisioning takes under 2 minutes. Once registered, you can upload your menu items, set up your table layout, configure staff permissions, and start accepting online orders and table reservations immediately.",
    },
    {
      q: "How does the Priority Deposit system prevent table no-shows?",
      a: "Guests booking a table can pay a ₹500 refundable deposit via Razorpay. When they arrive at your restaurant, 100% of their ₹500 deposit is automatically credited directly against their final dining bill.",
    },
    {
      q: "Can we manage multiple restaurant branches from one account?",
      a: "Yes! With our Multi-Outlet Workspace Switcher (included in Growth & Enterprise plans), franchise owners and managers can switch between different restaurant branches with a single click.",
    },
    {
      q: "Is any special hardware required for the Kitchen Display System (KDS)?",
      a: "No special hardware needed! Lumière KDS runs in any modern browser on standard tablets (iPads, Android tablets), touch monitors, or laptops.",
    },
    {
      q: "How does the Swiggy & Zomato marketplace integration work?",
      a: "Orders placed on Swiggy or Zomato are automatically ingested into Lumière OS in real-time via webhook sync, triggering audio alerts on your admin dashboard and dispatching kitchen tickets instantly.",
    },
  ];

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans">
      <Navbar onOpenTrial={handleOpenTrial} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 overflow-hidden">
        {/* Glowing Background Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-wine/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-gold/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-gold/30 px-4 py-2 rounded-full text-xs font-semibold text-gold shadow-lg">
            <Sparkles className="w-4 h-4 text-gold" />
            <span>Next-Gen B2B Multi-Tenant Restaurant OS</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-5xl mx-auto leading-tight">
            The Operating System for <span className="gradient-text">Modern Fine Dining</span> & Restaurant Chains
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Unify table reservations, real-time Kitchen Display (KDS), marketplace order sync (Swiggy/Zomato), floor plan table management, inventory COGS, and culinary editorial CMS in one seamless SaaS platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => handleOpenTrial("Growth Fine Dining")}
              className="btn-gold w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold shadow-xl flex items-center justify-center gap-2"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="http://localhost:3000/admin"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-gold/50 text-slate-200 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md"
            >
              <Building2 className="w-4 h-4 text-gold" />
              <span>Explore Live Admin Demo</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>

          {/* Trust Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-16 max-w-4xl mx-auto">
            <div className="glow-card p-6 rounded-2xl text-center space-y-1">
              <div className="font-serif text-3xl font-bold text-gold">99.99%</div>
              <div className="text-xs text-slate-400 font-medium">Uptime Guarantee</div>
            </div>
            <div className="glow-card p-6 rounded-2xl text-center space-y-1">
              <div className="font-serif text-3xl font-bold text-gold">45%</div>
              <div className="text-xs text-slate-400 font-medium">No-Show Reduction</div>
            </div>
            <div className="glow-card p-6 rounded-2xl text-center space-y-1">
              <div className="font-serif text-3xl font-bold text-gold">3x</div>
              <div className="text-xs text-slate-400 font-medium">Faster KDS Prep Time</div>
            </div>
            <div className="glow-card p-6 rounded-2xl text-center space-y-1">
              <div className="font-serif text-3xl font-bold text-gold">100+</div>
              <div className="text-xs text-slate-400 font-medium">Outlets Active</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Modules Deep Dive */}
      <section id="features" className="py-24 bg-navy-900/60 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3">
            <span className="text-gold font-serif text-xs uppercase tracking-widest font-bold">Platform Capabilities</span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white">Built for High-Volume Culinary Operations</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Every module is designed to save labor hours, eliminate order friction, and elevate your dining revenue.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="glow-card p-8 rounded-3xl space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-wine/30 border border-wine/40 text-gold flex items-center justify-center shadow-lg group-hover:scale-110 transition duration-300">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">Marketplace & Order Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Consolidate Swiggy, Zomato, QR Table Orders, and Web Takeaway orders into a single live stream with instant audio alerts and KDS ticket dispatching.
              </p>
            </div>

            <div className="glow-card p-8 rounded-3xl space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-wine/30 border border-wine/40 text-gold flex items-center justify-center shadow-lg group-hover:scale-110 transition duration-300">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">Priority Deposit System</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Allow guests to secure priority seating with ₹500 refundable deposits processed via Razorpay. Deposits are 100% credited against final dining bills.
              </p>
            </div>

            <div className="glow-card p-8 rounded-3xl space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-wine/30 border border-wine/40 text-gold flex items-center justify-center shadow-lg group-hover:scale-110 transition duration-300">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">Real-Time Kitchen KDS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Empower line chefs with interactive bump bars, live preparation timers, station routing (Tandoor, Mains, Desserts, Bar), and ticket order state tracking.
              </p>
            </div>

            <div className="glow-card p-8 rounded-3xl space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-wine/30 border border-wine/40 text-gold flex items-center justify-center shadow-lg group-hover:scale-110 transition duration-300">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">Floor Plan & Waiter POS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live interactive table floor map showing table states (Free, Occupied, Bill Pending), waiter order entry terminal, and fast digital bill settlement.
              </p>
            </div>

            <div className="glow-card p-8 rounded-3xl space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-wine/30 border border-wine/40 text-gold flex items-center justify-center shadow-lg group-hover:scale-110 transition duration-300">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">Inventory & Recipe COGS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Batch inventory management, low-stock threshold alerts, supplier purchase order tracking, and item-level recipe cost of goods sold (COGS) analysis.
              </p>
            </div>

            <div className="glow-card p-8 rounded-3xl space-y-4 group">
              <div className="w-12 h-12 rounded-xl bg-wine/30 border border-wine/40 text-gold flex items-center justify-center shadow-lg group-hover:scale-110 transition duration-300">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">Journal & Editorial CMS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Publish brand stories, chef interviews, seasonal menu notes, and press releases to your public site with a full admin content management system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section id="calculator" className="py-24 bg-navy-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-gold font-serif text-xs uppercase tracking-widest font-bold">Interactive Calculator</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">Calculate Your Restaurant's Monthly ROI</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              See estimated revenue recovered from reduced table no-shows and hours saved using Lumière OS.
            </p>
          </div>

          <div className="glow-card rounded-3xl p-8 border border-gold/30 shadow-2xl grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-200 mb-2">
                  <span>Monthly Table Bookings</span>
                  <span className="text-gold font-mono font-bold text-sm">{monthlyBookings} Bookings</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={monthlyBookings}
                  onChange={(e) => setMonthlyBookings(Number(e.target.value))}
                  className="w-full accent-gold cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-200 mb-2">
                  <span>Average Dining Bill (₹)</span>
                  <span className="text-gold font-mono font-bold text-sm">₹{avgBill}</span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={5000}
                  step={100}
                  value={avgBill}
                  onChange={(e) => setAvgBill(Number(e.target.value))}
                  className="w-full accent-gold cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-wine/90 to-navy-900 border border-wine/40 p-6 rounded-2xl space-y-4 text-center">
              <div className="text-xs uppercase tracking-wider text-gold font-bold">Estimated Monthly Value Gained</div>
              <div className="font-serif text-4xl font-bold text-gold">₹{recoveredNoShowRevenue.toLocaleString("en-IN")}</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Revenue recovered from eliminated no-shows & faster table turnaround times.
              </p>
              <div className="pt-3 border-t border-white/10 text-xs text-slate-300 flex justify-between px-4">
                <span>Kitchen Hours Saved:</span>
                <span className="font-bold text-white font-mono">{kitchenHoursSaved} hrs/mo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Pricing Plans Section */}
      <section id="pricing" className="py-24 bg-navy-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <span className="text-gold font-serif text-xs uppercase tracking-widest font-bold">Transparent SaaS Pricing</span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white">Choose the Right Plan for Your Outlets</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              14-day free trial on all plans. Instant provisioning with zero setup fees.
            </p>

            {/* Toggle */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${billingCycle === "monthly" ? "text-gold" : "text-slate-400"}`}>
                Monthly Billing
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="w-14 h-7 bg-slate-800 rounded-full p-1 transition relative border border-slate-700"
              >
                <div
                  className={`w-5 h-5 bg-gold rounded-full transition-transform ${
                    billingCycle === "annual" ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === "annual" ? "text-gold" : "text-slate-400"}`}>
                <span>Annual Billing</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 pt-4">
            {PLANS.map((plan) => {
              const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.name}
                  className={`glow-card rounded-3xl p-8 border flex flex-col justify-between transition-all relative ${
                    plan.popular
                      ? "border-gold shadow-2xl scale-105 z-10 ring-2 ring-gold/30 bg-navy-900/90"
                      : "border-slate-800"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-navy-950 text-[10px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-serif text-2xl font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 min-h-[32px] leading-relaxed">{plan.tagline}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="font-serif text-4xl font-bold text-gold">₹{price.toLocaleString("en-IN")}</span>
                        <span className="text-xs text-slate-400">/ month</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {billingCycle === "annual" ? "Billed annually" : "Billed monthly"}
                      </span>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Included Features:</div>
                      {plan.features.map((feat) => (
                        <div key={feat} className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}

                      {plan.notIncluded.map((feat) => (
                        <div key={feat} className="flex items-center gap-2 text-xs text-slate-500 line-through">
                          <X className="w-4 h-4 text-slate-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={() => handleOpenTrial(plan.name)}
                      className={`w-full py-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        plan.popular ? "btn-gold shadow-lg" : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
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

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-navy-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-gold font-serif text-xs uppercase tracking-widest font-bold">Frequently Asked Questions</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">Got Questions? We Have Answers.</h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={faq.q}
                  className="glow-card rounded-2xl border border-slate-800 overflow-hidden transition"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between font-serif font-bold text-base text-white hover:text-gold transition"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-gold" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-wine/80 via-navy-900 to-wine/80 border-t border-gold/30 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 space-y-6 relative z-10">
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white">
            Ready to Elevate Your Restaurant's Revenue?
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Join hundreds of restaurants using Lumière OS to automate reservations, orders, and kitchen workflows.
          </p>
          <button
            onClick={() => handleOpenTrial("Growth Fine Dining")}
            className="btn-gold px-8 py-4 rounded-xl text-sm font-bold shadow-xl inline-flex items-center gap-2"
          >
            <span>Launch Your Restaurant SaaS Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <Footer />

      {/* Trial Modal */}
      <TrialModal
        isOpen={isTrialOpen}
        onClose={() => setIsTrialOpen(false)}
        selectedPlan={selectedPlan}
      />
    </div>
  );
}
