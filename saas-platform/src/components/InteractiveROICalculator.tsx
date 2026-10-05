"use client";

import React, { useState } from "react";
import {
  Calculator,
  TrendingUp,
  ShieldCheck,
  Zap,
  DollarSign,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function InteractiveROICalculator() {
  const [tables, setTables] = useState(20);
  const [checkSize, setCheckSize] = useState(3500);
  const [noShowRate, setNoShowRate] = useState(18);
  const [outlets, setOutlets] = useState(1);

  // Calculations
  // Weekend bookings per table per month approx 16 peak slots
  const peakWeekendBookingsMonth = tables * 16 * outlets;
  const noShowBookingsLost = Math.round(peakWeekendBookingsMonth * (noShowRate / 100));
  const monthlyDepositRevenueRecovered = noShowBookingsLost * 500; // ₹500 deposit fee
  const monthlyCheckRevenueProtected = Math.round(noShowBookingsLost * (checkSize * 0.7)); // recovered dining checks
  const totalMonthlySavings = monthlyDepositRevenueRecovered + monthlyCheckRevenueProtected;
  const annualSavings = totalMonthlySavings * 12;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 border border-gold/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden backdrop-blur-xl">
      {/* Glow highlight */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-gold/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-mono font-semibold uppercase">
          <Calculator size={14} />
          <span>Interactive Operator ROI Engine</span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
          Calculate Your Restaurant&apos;s Revenue Recovery
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm font-light">
          Adjust the sliders below to see how much revenue Lumière OS recovers for your dining room or outlet chain.
        </p>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-2">
        <div className="space-y-6 bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
          {/* Slider 1: Tables */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Dining Room Tables Count:</span>
              <span className="text-gold font-bold font-mono text-sm">{tables} Tables</span>
            </div>
            <input
              type="range"
              min="4"
              max="60"
              value={tables}
              onChange={(e) => setTables(Number(e.target.value))}
              className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 2: Average Check Size */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Average Dining Check per Table:</span>
              <span className="text-gold font-bold font-mono text-sm">₹{checkSize.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="800"
              max="10000"
              step="200"
              value={checkSize}
              onChange={(e) => setCheckSize(Number(e.target.value))}
              className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 3: No show rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Estimated Weekend No-Show Rate:</span>
              <span className="text-rose-400 font-bold font-mono text-sm">{noShowRate}% No-Shows</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              value={noShowRate}
              onChange={(e) => setNoShowRate(Number(e.target.value))}
              className="w-full accent-rose-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 4: Outlets */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Number of Restaurant Outlets:</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">{outlets} {outlets === 1 ? "Outlet" : "Outlets"}</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={outlets}
              onChange={(e) => setOutlets(Number(e.target.value))}
              className="w-full accent-emerald-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Real-time Dynamic Metrics Display */}
        <div className="bg-slate-900/90 border border-gold/40 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <div className="text-xs font-mono text-gold uppercase tracking-wider font-bold">ESTIMATED REVENUE RECOVERY</div>
            <div className="text-3xl sm:text-4xl font-bold font-serif text-white mt-1">
              ₹{totalMonthlySavings.toLocaleString()}<span className="text-sm font-sans font-normal text-slate-400">/month</span>
            </div>
            <div className="text-xs text-emerald-400 font-mono mt-1 flex items-center gap-1">
              <TrendingUp size={14} /> Annual Projected Gain: ₹{annualSavings.toLocaleString()}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl text-xs">
              <span className="text-slate-300">No-Show Tables Saved / Month:</span>
              <span className="text-gold font-bold font-mono">{noShowBookingsLost} Tables</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl text-xs">
              <span className="text-slate-300">Razorpay Deposit Balance:</span>
              <span className="text-emerald-400 font-bold font-mono">₹{monthlyDepositRevenueRecovered.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl text-xs">
              <span className="text-slate-300">Kitchen Prep Ticket Acceleration:</span>
              <span className="text-amber-400 font-bold font-mono">-4.5 Min / Order</span>
            </div>
          </div>

          <Link
            href="/pricing"
            className="btn-gold w-full py-3.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <span>Activate Lumière OS Trial for Your Outlet</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
