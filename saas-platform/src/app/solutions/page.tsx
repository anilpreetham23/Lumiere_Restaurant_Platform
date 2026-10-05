"use client";

import React from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import {
  Store,
  Flame,
  Layers,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Building,
  Star,
  Quote,
  TrendingUp,
} from "lucide-react";

export default function SolutionsPage() {
  const SOLUTIONS = [
    {
      title: "Fine Dining & Heritage Restaurants",
      icon: Award,
      badge: "High-Touch Hospitality",
      desc: "Tailored for upscale restaurants requiring priority reservation deposit rules, guest memory CRM, wine pairing notes, and table pacing control.",
      highlights: [
        "₹500 Deposit protection for prime weekend dinner slots",
        "Guest preference history & dietary allergy tags",
        "Pacing controls between appetizer, main course, and dessert firings",
        "Journal & Editorial storytelling CMS integration",
      ],
    },
    {
      title: "Cloud Kitchens & Ghost Kitchens",
      icon: Flame,
      badge: "Fast Fulfillment",
      desc: "Designed for high-velocity delivery operations handling dozens of Swiggy & Zomato orders simultaneously without prep bottlenecks.",
      highlights: [
        "Unified multi-brand orders on a single live kitchen screen",
        "Sub-4 minute target preparation timers with audio alert cues",
        "Automated rider dispatch status updates",
        "Instant menu item 86/out-of-stock toggle across delivery apps",
      ],
    },
    {
      title: "Multi-Branch Restaurant Groups",
      icon: Building,
      badge: "Central Management",
      desc: "Comprehensive multi-tenant controls for restaurant groups operating 3 to 20 outlets across different cities.",
      highlights: [
        "Central master menu definition with per-outlet pricing overrides",
        "Inter-outlet inventory transfers & central kitchen production orders",
        "Cross-outlet sales performance & labor efficiency dashboards",
        "Unified accounting & Razorpay payment gateway reconciliation",
      ],
    },
    {
      title: "Franchise & Licensed Outlets",
      icon: Users,
      badge: "Scalable Control",
      desc: "Empower franchise brand owners to enforce recipe consistency, monitor franchise billing, and track royalty calculations.",
      highlights: [
        "Strict recipe COGS enforcement across franchisee kitchens",
        "Automated monthly franchise royalty fee calculations",
        "Franchisee compliance audit checklists & low-stock alerts",
        "Dedicated franchisee login roles with scoped permission rules",
      ],
    },
  ];

  const CASE_STUDIES = [
    {
      restaurant: "Royal Biryani House",
      location: "Bengaluru (3 Outlets)",
      result: "Recovered ₹85,000/mo in table no-shows",
      quote: "Prior to Lumière OS, weekend table no-shows cost us thousands every Friday. Implementing ₹500 Razorpay priority deposits reduced no-shows to virtually 0%.",
      author: "Rajesh V. (Managing Director)",
      stat: "0% No-Shows",
    },
    {
      restaurant: "Saffron Heritage Fine Dining",
      location: "Hyderabad (Jubilee Hills)",
      result: "Prep times reduced from 9.4m to 4.1m",
      quote: "The station-based KDS bump bar allowed our line chefs to coordinate Tandoor and Main Course firings seamlessly without yelling across the pass.",
      author: "Chef Vikram Seth (Executive Chef)",
      stat: "4.1m Avg Prep",
    },
    {
      restaurant: "The Copper Handi Group",
      location: "Delhi NCR (12 Outlets)",
      result: "1-Click menu 86 availability across Swiggy/Zomato",
      quote: "Managing 12 cloud kitchen outlets on delivery apps used to take 2 hours every morning. Lumière OS lets us toggle out-of-stock items across all brands in 1 second.",
      author: "Neha Kapoor (Head of Ops)",
      stat: "12 Outlets Synced",
    },
  ];

  return (
    <PageWrapper>
      {/* HEADER */}
      <section className="py-12 bg-navy-950/80 border-b border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-mono font-semibold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tailored Operating Configurations</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">
            Solutions Tailored to Your Restaurant Business Model
          </h1>
          <p className="text-slate-300 text-base max-w-2xl mx-auto font-light">
            Whether you operate a single Michelin-caliber dining room or a multi-city cloud kitchen group, Lumière OS configures to your exact operational needs.
          </p>
        </div>
      </section>

      {/* SOLUTIONS GRID */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {SOLUTIONS.map((sol, index) => (
            <div
              key={index}
              className="bg-slate-900/60 border border-slate-800 hover:border-gold/40 rounded-3xl p-8 space-y-6 transition-all hover:shadow-2xl hover:shadow-gold/5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                    <sol.icon className="w-6 h-6" />
                  </div>
                  <span className="bg-wine/30 text-gold text-xs font-mono px-3 py-1 rounded-full border border-wine/40">
                    {sol.badge}
                  </span>
                </div>

                <h2 className="font-serif text-2xl font-bold text-white">{sol.title}</h2>
                <p className="text-slate-300 text-sm leading-relaxed">{sol.desc}</p>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Operating Advantages:</div>
                  {sol.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800/80">
                <Link
                  href="/pricing"
                  className="btn-gold w-full py-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2"
                >
                  <span>Select Plan for {sol.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CASE STUDIES SECTION */}
      <section className="py-16 bg-navy-950/80 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-gold font-mono text-xs uppercase tracking-widest font-semibold">Real Operator Impact</span>
            <h2 className="font-serif text-3xl font-bold text-white">Restaurant Success Stories</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CASE_STUDIES.map((cs, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gold text-xs font-mono font-bold bg-gold/10 border border-gold/20 px-2.5 py-1 rounded-full">
                      {cs.stat}
                    </span>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className="fill-current" />
                      ))}
                    </div>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-white">{cs.restaurant}</h3>
                  <div className="text-xs text-slate-400 font-mono">{cs.location}</div>
                  <div className="text-xs font-semibold text-emerald-400 font-mono">{cs.result}</div>
                  <p className="text-slate-300 text-xs leading-relaxed italic">&ldquo;{cs.quote}&rdquo;</p>
                </div>

                <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 font-medium">
                  {cs.author}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-12 bg-slate-900/50 border-t border-slate-800 text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <h3 className="font-serif text-2xl font-bold text-white">Need a custom enterprise deployment for 20+ outlets?</h3>
          <p className="text-slate-300 text-sm font-light">
            Our solution architects provide custom SLA guarantees, dedicated database instances, and tailored hardware integrations.
          </p>
          <div className="pt-2">
            <Link href="/contact" className="btn-gold px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-2">
              <span>Speak with Enterprise Sales</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
