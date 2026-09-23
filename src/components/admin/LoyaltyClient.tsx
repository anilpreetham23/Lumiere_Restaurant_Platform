"use client";

import { useState } from "react";
import { adjustLoyaltyPointsAdminAction, getCustomerLoyaltyHistoryAdminAction } from "@/actions/admin";

interface LoyaltyClientProps {
  initialOverview: {
    totalLoyaltyCustomers: number;
    totalIssued: number;
    totalRedeemed: number;
    currentOutstandingPoints: number;
  };
  initialCustomers: any[];
}

export default function LoyaltyClient({ initialOverview, initialCustomers }: LoyaltyClientProps) {
  const [overview, setOverview] = useState(initialOverview);
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Manual Adjustment Form state
  const [adjPoints, setAdjPoints] = useState<number | "">("");
  const [adjReason, setAdjReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const filteredCustomers = customers.filter((acc) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const c = acc.customers;
    return (
      c?.name?.toLowerCase().includes(term) ||
      c?.phone?.toLowerCase().includes(term) ||
      c?.email?.toLowerCase().includes(term)
    );
  });

  async function handleSelectAccount(acc: any) {
    setSelectedAccount(acc);
    setErrorMsg("");
    setSuccessMsg("");
    setAdjPoints("");
    setAdjReason("");
    setLoadingHistory(true);

    const res = await getCustomerLoyaltyHistoryAdminAction(acc.customer_id);
    if (res.ok) {
      setHistory(res.data || []);
    } else {
      setErrorMsg(res.error || "Failed to load loyalty transaction history.");
    }
    setLoadingHistory(false);
  }

  async function handleAdjustPoints(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;

    const pointsNum = Number(adjPoints);
    if (!pointsNum || pointsNum === 0) {
      setErrorMsg("Please enter non-zero adjustment points.");
      return;
    }

    if (!adjReason.trim()) {
      setErrorMsg("Adjustment reason is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const res = await adjustLoyaltyPointsAdminAction({
      customerId: selectedAccount.customer_id,
      points: pointsNum,
      reason: adjReason.trim(),
    });

    if (res.ok && res.result) {
      const newBal = res.result.new_balance;
      setSuccessMsg(`Successfully adjusted ${pointsNum > 0 ? `+${pointsNum}` : pointsNum} points. New balance: ${newBal} pts.`);

      // Update local state
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedAccount.id
            ? { ...c, balance: newBal, lifetime_points: pointsNum > 0 ? c.lifetime_points + pointsNum : c.lifetime_points }
            : c
        )
      );

      setSelectedAccount((prev: any) => ({
        ...prev,
        balance: newBal,
        lifetime_points: pointsNum > 0 ? prev.lifetime_points + pointsNum : prev.lifetime_points,
      }));

      // Refresh history
      const hRes = await getCustomerLoyaltyHistoryAdminAction(selectedAccount.customer_id);
      if (hRes.ok) setHistory(hRes.data || []);

      setAdjPoints("");
      setAdjReason("");
    } else {
      setErrorMsg(res.error || "Failed to adjust points.");
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Loyalty Ledger & Rewards</h1>
          <p className="text-sm text-neutral-500">
            Tenant-isolated server-authoritative ledger for customer loyalty points, redemptions & manual adjustments.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-cream2 rounded-xl p-3 text-center shadow-sm">
            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Members</span>
            <span className="font-serif text-xl text-ink font-bold">{overview.totalLoyaltyCustomers}</span>
          </div>
          <div className="bg-white border border-cream2 rounded-xl p-3 text-center shadow-sm">
            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Total Issued</span>
            <span className="font-serif text-xl text-emerald-800 font-bold">+{overview.totalIssued}</span>
          </div>
          <div className="bg-white border border-cream2 rounded-xl p-3 text-center shadow-sm">
            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Total Redeemed</span>
            <span className="font-serif text-xl text-red-800 font-bold">-{overview.totalRedeemed}</span>
          </div>
          <div className="bg-white border border-cream2 rounded-xl p-3 text-center shadow-sm">
            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Outstanding</span>
            <span className="font-serif text-xl text-gold font-bold">{overview.currentOutstandingPoints}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-cream2 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search loyalty accounts by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-gold"
          />
          <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-xs text-neutral-500">
          Showing {filteredCustomers.length} of {customers.length} loyalty accounts
        </span>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Accounts Column */}
        <div className="lg:col-span-1 bg-white border border-cream2 rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-serif text-lg text-ink pb-2 border-b border-cream2">Loyalty Accounts</h2>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-sm">
              No loyalty accounts found.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredCustomers.map((acc) => {
                const isSelected = selectedAccount?.id === acc.id;
                const cust = acc.customers;
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-gold bg-amber-50/40 shadow-sm"
                        : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-ink text-sm">
                          {cust?.name || "Guest Customer"}
                        </div>
                        <div className="text-xs text-neutral-500 font-mono mt-0.5">
                          {cust?.phone || "No phone"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-serif text-lg font-bold text-ink block">
                          {acc.balance} <span className="text-xs font-normal text-neutral-500">pts</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-100 pt-1.5">
                      <span>Lifetime: <strong>{acc.lifetime_points} pts</strong></span>
                      <span>{cust?.visits || 1} visits</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Account & Manual Adjustment Column */}
        <div className="lg:col-span-2 bg-white border border-cream2 rounded-xl p-6 shadow-sm space-y-6">
          {!selectedAccount ? (
            <div className="text-center py-16 text-neutral-400">
              <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">Select a loyalty account from the left list to view ledger or adjust points</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Header */}
              <div className="flex items-start justify-between pb-4 border-b border-cream2">
                <div>
                  <h2 className="font-serif text-2xl text-ink">
                    {selectedAccount.customers?.name || "Guest Customer"}
                  </h2>
                  <p className="text-sm font-mono text-neutral-500 mt-1">
                    Phone: {selectedAccount.customers?.phone}
                  </p>
                </div>
                <div className="bg-neutral-900 text-white rounded-xl px-5 py-3 text-right shadow-sm">
                  <span className="text-[10px] uppercase text-gold font-semibold tracking-wider block">Current Balance</span>
                  <span className="font-serif text-2xl font-bold text-white block">
                    {selectedAccount.balance} Points
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                  {successMsg}
                </div>
              )}

              {/* Manual Adjustment Form */}
              <form onSubmit={handleAdjustPoints} className="bg-cream border border-cream2 p-4 rounded-xl space-y-3">
                <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                  <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Manager Manual Points Adjustment (Ledger Audit Logged)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Points (+ / -)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 50 or -20"
                      value={adjPoints}
                      onChange={(e) => setAdjPoints(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-gold bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Audit Reason (Required)</label>
                    <input
                      type="text"
                      placeholder="e.g. Compensation for service delay / Promotional bonus"
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-gold bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-gold hover:bg-gold-dark rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {submitting ? "Processing..." : "Apply Adjustment"}
                  </button>
                </div>
              </form>

              {/* Transaction Ledger History */}
              <div className="space-y-3">
                <h3 className="font-serif text-lg text-ink">Transaction Ledger History</h3>

                {loadingHistory ? (
                  <div className="text-center py-6 text-xs text-neutral-400">Loading ledger transactions...</div>
                ) : history.length === 0 ? (
                  <div className="text-center py-6 text-xs text-neutral-400 bg-neutral-50 rounded-lg">
                    No transactions recorded for this account.
                  </div>
                ) : (
                  <div className="border border-cream2 rounded-xl overflow-hidden divide-y divide-cream2">
                    {history.map((tx) => {
                      const isPositive = tx.points > 0;
                      return (
                        <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-neutral-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                tx.type === 'earn'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tx.type === 'redeem'
                                  ? 'bg-amber-100 text-amber-800'
                                  : tx.type === 'reversal'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {tx.type}
                              </span>
                              <span className="font-medium text-ink">{tx.description || tx.reference_type}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-1">
                              {new Date(tx.created_at).toLocaleString()}
                              {tx.reference_id && <span className="ml-2 font-mono">Ref: {tx.reference_id.slice(0, 8)}</span>}
                            </div>
                          </div>

                          <div className={`font-serif text-base font-bold ${isPositive ? "text-emerald-700" : "text-red-700"}`}>
                            {isPositive ? `+${tx.points}` : tx.points} pts
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
