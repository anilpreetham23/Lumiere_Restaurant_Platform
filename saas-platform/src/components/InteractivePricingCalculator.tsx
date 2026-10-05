"use client";

import React, { useState } from "react";
import { CheckCircle2, Sparkles, ArrowRight, Zap, Building } from "lucide-react";
import Link from "next/link";

export default function InteractivePricingCalculator() {
  const [annual, setAnnual] = useState(true);
  const [outlets, setOutlets] = useState(2);

  // Base Plan rates per outlet
  const baseRate = annual ? 2999 : 3699;
  const proRate = annual ? 5999 : 6999;

  const totalProMonthly = proRate * outlets;
  const annualDiscountSaved = (6999 - 5999) * 12 * outlets;

  return (
    <div className="bg-slate-900/90 border border-gold/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="text-gold font-mono text-xs font-bold uppercase tracking-wider">Dynamic Plan Configurator</div>
          <div className="text-white font-serif text-2xl font-bold mt-1">Configure Subscriptions by Outlet Count</div>
        </div>

        {/* Toggle Annual vs Monthly */}
        <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              !annual ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              annual ? "bg-gold text-slate-950 shadow-md font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Annual Billing</span>
            <span className="bg-rose-500 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Outlet Slider */}
      <div className="space-y-4 max-w-xl">
        <div className="flex justify-between items-center">
          <span className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Building size={16} className="text-gold" /> Total Active Restaurant Outlets:
          </span>
          <span className="text-gold font-bold font-mono text-lg bg-gold/10 px-3 py-1 rounded-xl border border-gold/30">
            {outlets} {outlets === 1 ? "Outlet" : "Outlets"}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={outlets}
          onChange={(e) => setOutlets(Number(e.target.value))}
          className="w-full accent-amber-400 bg-slate-800 h-2.5 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[11px] font-mono text-slate-500">
          <span>1 Single Outlet</span>
          <span>10 Chain Outlets</span>
          <span>20+ Multi-City Outlets</span>
        </div>
      </div>

      {/* Dynamic Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Growth Plan Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-slate-400 text-xs font-mono font-bold uppercase">Growth Tier</div>
              <div className="text-white font-serif text-xl font-bold">Standard Outlet</div>
            </div>
            <span className="text-xs font-mono text-gold bg-gold/10 px-2.5 py-1 rounded-full border border-gold/20">
              ₹{baseRate}/mo per outlet
            </span>
          </div>

          <div className="text-3xl font-bold font-serif text-white">
            ₹{(baseRate * outlets).toLocaleString()}<span className="text-xs font-sans text-slate-400 font-normal"> / month total</span>
          </div>

          <ul className="space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> Single-outlet POS & Table Layout
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> ₹500 Razorpay Priority Deposit Rule
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> Kitchen KDS Screen (Up to 2 stations)
            </li>
          </ul>

          <Link
            href="/contact"
            className="w-full py-3 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-center flex items-center justify-center gap-2 transition"
          >
            <span>Choose Growth Plan ({outlets} Outlets)</span>
          </Link>
        </div>

        {/* Enterprise Pro Plan Card (Highlighted) */}
        <div className="bg-slate-950/90 border-2 border-gold rounded-2xl p-6 space-y-4 relative shadow-xl shadow-gold/10">
          <div className="absolute -top-3 right-6 bg-gold text-slate-950 font-bold font-mono text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
            MOST POPULAR FOR GROUPS
          </div>

          <div className="flex justify-between items-start">
            <div>
              <div className="text-gold text-xs font-mono font-bold uppercase">Pro Group Tier</div>
              <div className="text-white font-serif text-xl font-bold">Multi-Outlet OS</div>
            </div>
            <span className="text-xs font-mono text-gold bg-gold/10 px-2.5 py-1 rounded-full border border-gold/20">
              ₹{proRate}/mo per outlet
            </span>
          </div>

          <div className="text-3xl font-bold font-serif text-white">
            ₹{totalProMonthly.toLocaleString()}<span className="text-xs font-sans text-slate-400 font-normal"> / month total</span>
          </div>

          {annual && (
            <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <Sparkles size={12} /> Save ₹{annualDiscountSaved.toLocaleString()} with Annual Billing!
            </div>
          )}

          <ul className="space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> Multi-outlet master menu & 86 sync
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> Swiggy & Zomato Marketplace integration
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> Unlimited KDS Bump Bar screens & Recipe COGS
            </li>
          </ul>

          <Link
            href="/contact"
            className="btn-gold w-full py-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Activate Pro OS for {outlets} Outlets</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
