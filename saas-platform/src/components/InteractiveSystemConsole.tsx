"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Flame,
  Zap,
  Building,
  CheckCircle2,
  Clock,
  RefreshCw,
  PlusCircle,
  Smartphone,
  Sparkles,
  Play,
  Check,
  Server,
  Activity,
  Layers,
} from "lucide-react";

export default function InteractiveSystemConsole() {
  const [activeTab, setActiveTab] = useState<"deposits" | "kds" | "sync" | "multi">("deposits");

  // Tab 1 State: Deposit simulator
  const [depositList, setDepositList] = useState([
    { id: "RES-99381", guest: "Rajesh Sharma", table: "Table #14 (Royal Booth)", deposit: 500, status: "CREDITED", razorpayId: "pay_982310192" },
    { id: "RES-99382", guest: "Priya Malhotra", table: "Table #06 (Window)", deposit: 500, status: "CREDITED", razorpayId: "pay_982310195" },
  ]);
  const [recoveredAmount, setRecoveredAmount] = useState(1000);

  const simulateNewDeposit = () => {
    const newId = `RES-${Math.floor(90000 + Math.random() * 9999)}`;
    const names = ["Aarav Mehta", "Ananya Reddy", "Vikramaditya S.", "Kavya Nair"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const tables = ["Table #02 (Terrace)", "Table #19 (VIP Private Dining)", "Table #11 (Main Hall)"];
    const randomTable = tables[Math.floor(Math.random() * tables.length)];
    const newDeposit = {
      id: newId,
      guest: randomName,
      table: randomTable,
      deposit: 500,
      status: "CREDITED",
      razorpayId: `pay_${Math.floor(100000000 + Math.random() * 900000000)}`,
    };
    setDepositList([newDeposit, ...depositList]);
    setRecoveredAmount((prev) => prev + 500);
  };

  // Tab 2 State: KDS simulator
  const [tickets, setTickets] = useState([
    { id: "#1041", table: "Table 4", items: ["Butter Chicken x2", "Garlic Naan x4", "Dal Makhani x1"], time: "2:45", status: "Cooking" },
    { id: "#1042", table: "Table 12", items: ["Paneer Tikka x1", "Rogan Josh x1", "Jeera Rice x2"], time: "1:15", status: "Cooking" },
  ]);

  const bumpTicket = (id: string) => {
    setTickets(tickets.filter((t) => t.id !== id));
  };

  const addTicket = () => {
    const newTicketId = `#${Math.floor(1043 + Math.random() * 50)}`;
    const tables = ["Table 7", "Table 15", "Table 2", "Table 9"];
    const sampleItems = [
      ["Shahi Tukda x2", "Gulab Jamun x2"],
      ["Tandoori Roti x6", "Murgh Malai Tikka x1"],
      ["Biryani Special x2", "Raita x2"],
    ];
    const randomItems = sampleItems[Math.floor(Math.random() * sampleItems.length)];
    const randomTable = tables[Math.floor(Math.random() * tables.length)];
    setTickets([...tickets, { id: newTicketId, table: randomTable, items: randomItems, time: "0:10", status: "Cooking" }]);
  };

  // Tab 3 State: 86 Item Sync
  const [items86, setItems86] = useState([
    { name: "Raw Tandoori Tiger Prawns", inStock: true, prepStation: "Seafood Station" },
    { name: "Kashmiri Lamb Shank", inStock: false, prepStation: "Curry Station" },
    { name: "Vintage Saffron Reserve Kheer", inStock: true, prepStation: "Dessert Station" },
  ]);

  const toggle86 = (index: number) => {
    const updated = [...items86];
    updated[index].inStock = !updated[index].inStock;
    setItems86(updated);
  };

  // Tab 4 State: Multi-outlet selector
  const [selectedOutlet, setSelectedOutlet] = useState("bengaluru");
  const OUTLETS: Record<string, any> = {
    bengaluru: { name: "Lumière Indiranagar (Bengaluru)", revenue: "₹3,42,800", activeTables: "24/28", prepTime: "4.1m", staff: 18 },
    hyderabad: { name: "Lumière Jubilee Hills (Hyderabad)", revenue: "₹2,98,400", activeTables: "20/24", prepTime: "3.8m", staff: 15 },
    delhi: { name: "Lumière CyberHub (Gurugram)", revenue: "₹4,12,000", activeTables: "32/32", prepTime: "4.5m", staff: 22 },
  };

  return (
    <div className="bg-slate-900/90 border border-gold/40 rounded-3xl p-4 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl relative overflow-hidden">
      {/* Top Console Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
            <Server className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-white font-bold text-lg font-serif flex flex-wrap items-center gap-2.5">
              <span>Lumière OS Live Interactive Sandbox</span>
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap shrink-0 shadow-sm">
                <Activity size={12} className="animate-spin text-emerald-400" /> LIVE SYSTEM DEMO
              </span>
            </div>
            <div className="text-xs text-slate-400">Click tabs & buttons below to test real-time operational engine logic</div>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 text-xs">
          {[
            { id: "deposits", label: "Razorpay Deposits", icon: ShieldCheck },
            { id: "kds", label: "Kitchen KDS Bump", icon: Flame },
            { id: "sync", label: "Marketplace 86 Sync", icon: Zap },
            { id: "multi", label: "Multi-Outlet Control", icon: Building },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-gold to-amber-400 text-slate-950 shadow-md scale-105"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT 1: DEPOSIT SIMULATOR */}
      {activeTab === "deposits" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="text-gold font-mono text-xs font-bold uppercase tracking-wider">Live No-Show Protection Engine</div>
              <div className="text-slate-300 text-xs mt-0.5">
                Total Recovered Deposits: <strong className="text-emerald-400 font-mono text-sm">₹{recoveredAmount.toLocaleString()}</strong>
              </div>
            </div>
            <button
              onClick={simulateNewDeposit}
              className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <PlusCircle size={14} /> Simulate New ₹500 Booking Deposit
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex justify-between">
              <span>Active Reservations</span>
              <span>Razorpay API Gateway Sync</span>
            </div>
            {depositList.map((dep, idx) => (
              <div
                key={dep.id + idx}
                className="bg-slate-900/90 border border-slate-800 hover:border-gold/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{dep.guest}</span>
                    <span className="text-[10px] font-mono text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                      {dep.id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{dep.table}</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold font-mono text-xs flex items-center gap-1">
                      <CheckCircle2 size={13} /> ₹{dep.deposit} Credited
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">Ref: {dep.razorpayId}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: KITCHEN KDS SIMULATOR */}
      {activeTab === "kds" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="text-gold font-mono text-xs font-bold uppercase tracking-wider">Live KDS Kitchen Bump Bar</div>
              <div className="text-slate-300 text-xs mt-0.5">Active Tickets on Kitchen Screen: <strong className="text-white font-mono">{tickets.length}</strong></div>
            </div>
            <button
              onClick={addTicket}
              className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <PlusCircle size={14} /> Fire New Ticket from POS
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
              All tickets bumped! Click &quot;Fire New Ticket from POS&quot; to test kitchen queue.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-slate-950/90 border border-wine/40 rounded-2xl p-4 space-y-3 relative">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <div>
                      <span className="font-mono font-bold text-gold text-base">{ticket.id}</span>
                      <span className="text-xs text-slate-300 ml-2 font-medium">({ticket.table})</span>
                    </div>
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock size={10} /> Prep: {ticket.time}
                    </span>
                  </div>

                  <ul className="space-y-1 text-xs text-slate-300 font-mono">
                    {ticket.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-wine font-bold">›</span> {item}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => bumpTicket(ticket.id)}
                    className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Check size={14} /> BUMP TICKET (PASS TO TABLE)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: 86 MARKETPLACE SYNC */}
      {activeTab === "sync" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="text-gold font-mono text-xs font-bold uppercase tracking-wider">Instant Out-of-Stock Toggle (Swiggy, Zomato & POS)</div>
            <div className="text-slate-300 text-xs mt-0.5">Toggle any item status below to trigger live synchronization across delivery channels.</div>
          </div>

          <div className="space-y-3">
            {items86.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="text-white font-bold text-sm">{item.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{item.prepStation}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-slate-400">Swiggy / Zomato Status:</span>
                    {item.inStock ? (
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        AVAILABLE
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        86 / OFF-AIR
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => toggle86(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      item.inStock
                        ? "bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40"
                        : "bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {item.inStock ? "Set 86 (Out of Stock)" : "Restore to Stock"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: MULTI-OUTLET SELECTOR */}
      {activeTab === "multi" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {Object.keys(OUTLETS).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedOutlet(key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedOutlet === key
                    ? "bg-gold text-slate-950 shadow-md"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-600"
                }`}
              >
                {OUTLETS[key].name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/80 p-6 rounded-2xl border border-slate-800">
            <div>
              <div className="text-slate-400 text-xs">Today&apos;s Revenue</div>
              <div className="text-gold font-bold font-mono text-xl mt-1">{OUTLETS[selectedOutlet].revenue}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">Live Active Tables</div>
              <div className="text-emerald-400 font-bold font-mono text-xl mt-1">{OUTLETS[selectedOutlet].activeTables}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">Avg Ticket Prep</div>
              <div className="text-white font-bold font-mono text-xl mt-1">{OUTLETS[selectedOutlet].prepTime}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">Staff On Clock</div>
              <div className="text-amber-400 font-bold font-mono text-xl mt-1">{OUTLETS[selectedOutlet].staff} Active</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
