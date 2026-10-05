"use client";

import React from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  ShoppingBag,
  Store,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <PageWrapper>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        {/* Background Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-gold/10 via-wine/20 to-transparent blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-xl animate-fade-in">
              <Sparkles className="w-4 h-4 text-gold animate-pulse" />
              <span>Next-Gen B2B Multi-Tenant Restaurant OS</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.15]">
              The Operating System for <br />
              <span className="bg-gradient-to-r from-gold via-amber-200 to-gold bg-clip-text text-transparent">
                Fine Dining & Multi-Outlet Chains
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-xl leading-relaxed font-light max-w-3xl mx-auto">
              Unify table reservations, refundable deposits, real-time Kitchen KDS bump bars, Swiggy & Zomato order sync, floor plan waiter POS, recipe COGS inventory, and editorial CMS into one high-performance SaaS engine.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="btn-gold w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-3 shadow-2xl shadow-gold/20 hover:scale-105 transition-all"
              >
                <span>Explore Pricing & Plans</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/features"
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
              >
                <span>View Full Module Specs</span>
                <ChevronRight className="w-4 h-4 text-gold" />
              </Link>

              <a
                href="http://localhost:3000/admin"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-4 rounded-xl text-sm font-semibold text-gold bg-wine/20 hover:bg-wine/30 border border-wine/40 transition-all flex items-center justify-center gap-2"
              >
                <span>Live Admin Demo</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Micro Badge Stats */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
              {[
                { label: "Zero Table No-Shows", val: "₹500 Deposit Protection" },
                { label: "Kitchen Order Speed", val: "4.2 Min Ticket Prep" },
                { label: "Marketplace Sync", val: "Swiggy & Zomato Live" },
                { label: "Multi-Tenant Cloud", val: "99.99% SLA Uptime" },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900/60 backdrop-blur border border-slate-800 p-4 rounded-2xl">
                  <div className="text-gold font-bold text-sm sm:text-base font-mono">{stat.val}</div>
                  <div className="text-slate-400 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK EXPLORE CARDS (NAVIGATE TO MULTIPLE PAGES) */}
      <section className="py-16 bg-navy-950/60 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <span className="text-gold font-mono text-xs uppercase tracking-widest font-semibold">Explore Platform Portals</span>
            <h2 className="font-serif text-3xl font-bold text-white">Dedicated Platform Solutions & Tools</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: "Module Features",
                desc: "Explore deep technical specs for KDS bump bar, floor plan POS, deposits, and recipe COGS.",
                link: "/features",
                icon: Layers,
                btnText: "Explore Features",
              },
              {
                title: "Segment Solutions",
                desc: "Custom operating setups tailored for Fine Dining, Cloud Kitchens, Chains, and Franchises.",
                link: "/solutions",
                icon: Store,
                btnText: "View Solutions",
              },
              {
                title: "Pricing & Plans",
                desc: "Transparent monthly & annual subscription plans with zero hidden setup fees.",
                link: "/pricing",
                icon: DollarSign,
                btnText: "Compare Plans",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-slate-900/70 border border-slate-800 hover:border-gold/50 rounded-2xl p-6 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mb-4 group-hover:scale-110 transition-transform">
                    <card.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-6">{card.desc}</p>
                </div>
                <Link
                  href={card.link}
                  className="text-xs font-semibold text-gold hover:text-amber-300 flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  <span>{card.btnText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE HIGHLIGHTS TEASER */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-gold font-mono text-xs uppercase tracking-widest font-semibold">Priority Reservations & Deposits</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
                Eliminate Table No-Shows with Razorpay Deposit Protection
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Table reservations in fine dining often suffer 15% to 25% no-show rates. Lumière OS lets guests choose standard free booking or priority ₹500 refundable deposit booking. Deposits automatically process via Razorpay and credit seamlessly toward their final dining check.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Configurable Deposit Rules (Optional or Mandatory for VIP peak slots)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant Razorpay Payment Link generation with auto-invoicing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct Guest SMS & WhatsApp booking vouchers</span>
                </li>
              </ul>
              <div>
                <Link href="/features" className="btn-gold text-xs px-5 py-3 rounded-xl inline-flex items-center gap-2">
                  <span>See How Deposit Control Works</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono text-gold font-bold">LIVE RESERVATION ENGINE</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono">Synced</span>
              </div>
              <div className="py-6 space-y-4">
                <div className="bg-slate-900/90 border border-gold/30 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold text-sm">Table #14 &middot; Royal Booth</div>
                    <div className="text-slate-400 text-xs">Guest: Rajesh Sharma &middot; 4 Guests &middot; 8:30 PM</div>
                  </div>
                  <div className="text-right">
                    <span className="bg-gold/20 text-gold text-xs font-mono font-bold px-2.5 py-1 rounded">₹500 Deposit Paid</span>
                    <div className="text-[10px] text-emerald-400 mt-1">Razorpay Ref #pay_98231</div>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between opacity-80">
                  <div>
                    <div className="text-white font-bold text-sm">Table #08 &middot; Garden Terrace</div>
                    <div className="text-slate-400 text-xs">Guest: Ananya Roy &middot; 2 Guests &middot; 9:00 PM</div>
                  </div>
                  <span className="bg-slate-800 text-slate-400 text-xs font-mono px-2.5 py-1 rounded">Standard Booking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-wine/40 via-navy-950 to-wine/40 border border-gold/30 rounded-3xl p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              Ready to Upgrade Your Restaurant Operations?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-light">
              Deploy Lumière OS across your outlets in under 15 minutes with 14 days of full feature access.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/pricing" className="btn-gold px-8 py-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <span>View Subscription Plans</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="px-6 py-3.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 transition">
                Book 1-on-1 Sales Demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
