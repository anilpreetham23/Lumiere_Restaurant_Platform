"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function CalculatorPage() {
  const [monthlyCovers, setMonthlyCovers] = useState<number>(1800);
  const [avgCheck, setAvgCheck] = useState<number>(2200);
  const [noShowRate, setNoShowRate] = useState<number>(18);
  const [kitchenDelayMins, setKitchenDelayMins] = useState<number>(6);

  // Revenue & Savings Math
  const estimatedNoShowLoss = Math.round((monthlyCovers * (noShowRate / 100)) * (avgCheck * 0.7));
  const recoveredNoShowRevenue = Math.round(estimatedNoShowLoss * 0.85); // 85% recovered via deposits
  const monthlyLaborHoursSaved = Math.round((monthlyCovers * kitchenDelayMins) / 60);
  const laborCostSavings = Math.round(monthlyLaborHoursSaved * 180); // ₹180/hr labor cost
  const totalMonthlyROI = recoveredNoShowRevenue + laborCostSavings;
  const annualROI = totalMonthlyROI * 12;

  return (
    <PageWrapper>
      {/* HEADER */}
      <section className="py-12 bg-navy-950/80 border-b border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-mono font-semibold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Profit Estimator</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white">
            Calculate Your Restaurant's Monthly ROI
          </h1>
          <p className="text-slate-300 text-base max-w-2xl mx-auto font-light">
            Adjust the sliders below based on your restaurant's current volume to see how much revenue Lumière OS recovers every month.
          </p>
        </div>
      </section>

      {/* CALCULATOR TOOL */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* INPUT CONTROLS */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-8">
            <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-gold" />
              <span>Restaurant Operating Parameters</span>
            </h2>

            {/* Slider 1: Monthly Dining Guests */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <label className="text-slate-300 font-medium">Monthly Dining Guests (Covers)</label>
                <span className="text-gold font-bold font-mono text-base">{monthlyCovers.toLocaleString()} Guests</span>
              </div>
              <input
                type="range"
                min="500"
                max="8000"
                step="100"
                value={monthlyCovers}
                onChange={(e) => setMonthlyCovers(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-gold"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>500 (Boutique)</span>
                <span>4,000 (Fine Dining)</span>
                <span>8,000+ (High-Volume)</span>
              </div>
            </div>

            {/* Slider 2: Average Check Size */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <label className="text-slate-300 font-medium">Average Bill Value per Guest (₹)</label>
                <span className="text-gold font-bold font-mono text-base">₹{avgCheck.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="500"
                max="6000"
                step="100"
                value={avgCheck}
                onChange={(e) => setAvgCheck(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-gold"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>₹500 (Casual)</span>
                <span>₹2,500 (Fine Dining)</span>
                <span>₹6,000 (Luxury Tasting)</span>
              </div>
            </div>

            {/* Slider 3: Current No-Show Rate */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <label className="text-slate-300 font-medium">Estimated Table No-Show Rate (%)</label>
                <span className="text-wine font-bold font-mono text-base">{noShowRate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={noShowRate}
                onChange={(e) => setNoShowRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-wine"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>5% (Low)</span>
                <span>18% (Industry Avg)</span>
                <span>40% (Peak Weekend)</span>
              </div>
            </div>

            {/* Slider 4: Kitchen Ticket Delay */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <label className="text-slate-300 font-medium">Average Paper Ticket Prep Delay (Mins)</label>
                <span className="text-amber-300 font-bold font-mono text-base">{kitchenDelayMins} Minutes</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={kitchenDelayMins}
                onChange={(e) => setKitchenDelayMins(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          {/* DYNAMIC RESULTS DISPLAY */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-navy-950 to-slate-900 border-2 border-gold/60 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="font-mono text-xs font-bold text-gold uppercase tracking-widest">ESTIMATED NET FINANCIAL IMPACT</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2.5 py-1 rounded font-bold">
                Lumière OS Protection
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-400">Total Monthly Revenue Recovered:</div>
              <div className="font-serif text-4xl sm:text-5xl font-bold text-white tracking-tight">
                ₹{totalMonthlyROI.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-400 font-mono pt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Annual ROI Boost: ₹{annualROI.toLocaleString()} / year</span>
              </div>
            </div>

            <div className="space-y-3 py-4 border-t border-slate-800 text-xs">
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center">
                <div>
                  <div className="text-slate-200 font-semibold">No-Show Revenue Recovered</div>
                  <div className="text-[10px] text-slate-400">Via ₹500 Razorpay Priority Deposits</div>
                </div>
                <span className="text-gold font-mono font-bold text-sm">₹{recoveredNoShowRevenue.toLocaleString()}</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center">
                <div>
                  <div className="text-slate-200 font-semibold">Kitchen Labor Hours Saved</div>
                  <div className="text-[10px] text-slate-400">{monthlyLaborHoursSaved} hours saved with KDS</div>
                </div>
                <span className="text-emerald-400 font-mono font-bold text-sm">₹{laborCostSavings.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/pricing"
                className="btn-gold w-full py-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xl shadow-gold/20"
              >
                <span>Claim Your ROI & Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
