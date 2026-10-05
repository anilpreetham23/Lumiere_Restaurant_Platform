"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const PLANS = [
    {
      name: "Starter Outlet",
      badge: "Emerging Spots",
      priceMonthly: 5999,
      priceAnnual: 4999,
      desc: "Ideal for single cafes, boutique bistros, or emerging dark kitchens needing core POS and KDS.",
      features: [
        "1 Restaurant Outlet & 2 POS Terminals",
        "Real-Time KDS Bump Bar (1 Station)",
        "Direct Web Orders & Table QR Ordering",
        "Standard Table Reservations (No Deposit)",
        "Basic Inventory & Stock Threshold Alerts",
        "Email & Standard Chat Support",
      ],
      cta: "Start 14-Day Free Trial",
      popular: false,
    },
    {
      name: "Growth Fine Dining",
      badge: "Most Popular",
      priceMonthly: 11999,
      priceAnnual: 9999,
      desc: "Complete operating system for high-volume fine dining restaurants & busy culinary venues.",
      features: [
        "Up to 3 Outlets & Unlimited POS Terminals",
        "Multi-Station KDS (Tandoor, Mains, Bar, Pass)",
        "Priority Deposit Protection via Razorpay (₹500)",
        "Swiggy & Zomato Marketplace Auto-Sync",
        "Recipe COGS & Automated Ingredient Deduction",
        "Journal & Editorial Storytelling CMS",
        "24/7 Priority Support & WhatsApp Onboarding",
      ],
      cta: "Start 14-Day Free Trial",
      popular: true,
    },
    {
      name: "Enterprise Multi-Outlet",
      badge: "Franchise & Chains",
      priceMonthly: 24999,
      priceAnnual: 19999,
      desc: "Designed for restaurant groups, multi-city chains, and franchise networks requiring central control.",
      features: [
        "Unlimited Outlets & Franchise Accounts",
        "Central Menu Master & Inter-Outlet Transfers",
        "Custom Payment Gateway & Accounting Sync",
        "Franchisee Royalty & Billing Automation",
        "Dedicated Database Instance & Custom SLA",
        "Dedicated Customer Success Manager",
        "On-Site Staff Training & Hardware Setup",
      ],
      cta: "Contact Enterprise Sales",
      popular: false,
    },
  ];

  const FAQS = [
    {
      q: "How does the 14-day free trial work?",
      a: "You get full access to all features of the Growth Fine Dining plan for 14 days. No credit card is required to sign up. You can test live reservations, KDS bump bars, and menu sync instantly.",
    },
    {
      q: "How do ₹500 table reservation deposits process?",
      a: "When a guest books a priority table slot on your website, Lumière OS generates a Razorpay payment link. Upon completion, the ₹500 deposit is instantly recorded in your admin ledger and credited against the guest's dining bill when they arrive.",
    },
    {
      q: "Can I use my existing thermal printers and kitchen KDS tablets?",
      a: "Yes! Lumière OS is cloud-native and works on standard web browsers (Chrome/Safari) across Android tablets, iPads, Windows POS terminals, and ESC/POS thermal printers.",
    },
    {
      q: "What happens if our internet connection drops in the restaurant?",
      a: "Lumière OS includes local browser buffer sync. Order entries on waiter tablets continue locally and automatically sync back to the cloud as soon as connection is restored.",
    },
    {
      q: "Are there any hidden setup fees or per-transaction commissions?",
      a: "Zero per-transaction commission on direct table orders and website orders! Payment gateway fees for Razorpay apply standard rates (approx. 2%). Subscription prices are flat monthly or annual rates.",
    },
  ];

  return (
    <PageWrapper>
      {/* HEADER */}
      <section className="py-12 bg-navy-950/80 border-b border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-mono font-semibold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Subscription Pricing</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">
            Choose the Right Plan for Your Restaurant
          </h1>
          <p className="text-slate-300 text-base max-w-2xl mx-auto font-light">
            14-day free trial on all plans. Zero hidden setup fees. Upgrade or downgrade anytime.
          </p>

          {/* BILLING TOGGLE */}
          <div className="pt-6 flex items-center justify-center gap-4">
            <span className={`text-xs font-medium ${billingCycle === "monthly" ? "text-white" : "text-slate-400"}`}>
              Monthly Billing
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
              className="w-14 h-8 rounded-full bg-slate-800 p-1 border border-slate-700 relative transition-colors focus:outline-none"
            >
              <div
                className={`w-6 h-6 rounded-full bg-gold transition-transform ${
                  billingCycle === "annual" ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-medium flex items-center gap-1.5 ${billingCycle === "annual" ? "text-gold font-bold" : "text-slate-400"}`}>
              Annual Billing
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono uppercase">
                Save 20%
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                plan.popular
                  ? "bg-gradient-to-b from-slate-900 via-navy-950 to-slate-900 border-2 border-gold shadow-2xl shadow-gold/10"
                  : "bg-slate-900/60 border border-slate-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-navy-950 text-[11px] font-bold font-mono px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-serif text-2xl font-bold text-white">{plan.name}</h2>
                    {!plan.popular && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2.5 py-0.5 rounded">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{plan.desc}</p>
                </div>

                <div className="border-y border-slate-800/80 py-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-4xl font-bold text-white">
                      ₹{(billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly).toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-xs font-mono">/ outlet / month</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {billingCycle === "annual" ? "Billed annually (₹" + (plan.priceAnnual * 12).toLocaleString() + "/yr)" : "Billed monthly"}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Included Capabilities:</div>
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/contact"
                  className={`w-full py-3.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
                    plan.popular
                      ? "btn-gold shadow-lg shadow-gold/20"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section className="py-16 bg-navy-950/60 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-gold font-mono text-xs uppercase tracking-widest font-semibold">Got Questions?</span>
            <h2 className="font-serif text-3xl font-bold text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left font-serif text-base font-bold text-white flex justify-between items-center gap-4 hover:text-gold transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-gold text-xl">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
