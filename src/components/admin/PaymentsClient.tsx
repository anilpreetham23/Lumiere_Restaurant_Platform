"use client";

import { useState } from "react";
import { processRefundAdminAction } from "@/actions/admin";

type RefundRecord = {
  id: string;
  restaurant_id: string;
  payment_id: string;
  provider: string;
  provider_refund_id: string;
  amount: number;
  currency: string;
  reason?: string | null;
  status: string;
  created_at: string;
};

type PaymentRow = {
  id: string;
  restaurant_id: string;
  created_at: string;
  intent_id?: string | null;
  session_id?: string | null;
  reservation_id?: string | null;
  provider: string;
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
  stripe_payment_intent?: string | null;
  amount: number;
  paid_amount: number;
  currency: string;
  payment_method_type?: string | null;
  status: string; // paid | partially_refunded | refunded | failed
  receipt_code?: string | null;
  payment_refunds?: RefundRecord[];
  dining_sessions?: {
    id: string;
    table_id: string;
    status: string;
    payment_status: string;
    receipt_code?: string | null;
    restaurant_tables?: { label: string } | null;
  } | null;
  reservations?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    deposit_status: string;
  } | null;
};

interface Props {
  initialPayments: PaymentRow[];
  userRole: string; // 'owner' | 'manager' | 'staff'
}

export default function PaymentsClient({ initialPayments, userRole }: Props) {
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected Payment Modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState<string>("");
  const [refundReasonInput, setRefundReasonInput] = useState<string>("");
  const [isFullRefund, setIsFullRefund] = useState<boolean>(true);

  const canRefund = userRole === "owner" || userRole === "manager";

  // Filtered List
  const filtered = payments.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (providerFilter !== "all" && p.provider !== providerFilter) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchCode = p.receipt_code?.toLowerCase().includes(term);
      const matchProvId = p.provider_payment_id?.toLowerCase().includes(term);
      const matchOrderId = p.provider_order_id?.toLowerCase().includes(term);
      const matchResName = p.reservations?.name?.toLowerCase().includes(term);
      const matchResPhone = p.reservations?.phone?.toLowerCase().includes(term);
      const matchTable = p.dining_sessions?.restaurant_tables?.label?.toLowerCase().includes(term);
      if (!matchCode && !matchProvId && !matchOrderId && !matchResName && !matchResPhone && !matchTable) {
        return false;
      }
    }
    return true;
  });

  // KPI Calculations
  let totalReceived = 0;
  let totalRefunded = 0;

  for (const p of payments) {
    if (p.status === "paid" || p.status === "partially_refunded" || p.status === "refunded") {
      totalReceived += Number(p.paid_amount || p.amount || 0);
    }
    const refunds = p.payment_refunds || [];
    for (const r of refunds) {
      if (r.status === "succeeded") {
        totalRefunded += Number(r.amount || 0);
      }
    }
  }

  const netRevenue = totalReceived - totalRefunded;

  const showMsg = (success?: string, error?: string) => {
    if (success) {
      setSuccessMessage(success);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
    if (error) {
      setErrorMessage(error);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const openDetailsModal = (p: PaymentRow) => {
    setSelectedPayment(p);
    const existingRefunded = (p.payment_refunds || [])
      .filter((r) => r.status === "succeeded")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const remaining = Math.max(0, Number(p.paid_amount || p.amount || 0) - existingRefunded);

    setRefundAmountInput(String(remaining));
    setIsFullRefund(true);
    setRefundReasonInput("");
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setLoading(true);
    setErrorMessage(null);

    const existingRefunded = (selectedPayment.payment_refunds || [])
      .filter((r) => r.status === "succeeded")
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const remaining = Math.max(0, Number(selectedPayment.paid_amount || selectedPayment.amount || 0) - existingRefunded);
    const targetAmount = isFullRefund ? remaining : Number(refundAmountInput);

    if (!targetAmount || targetAmount <= 0) {
      setLoading(false);
      showMsg(undefined, "Please enter a valid refund amount > 0.");
      return;
    }

    if (targetAmount > remaining) {
      setLoading(false);
      showMsg(undefined, `Refund amount (₹${targetAmount}) exceeds remaining balance (₹${remaining}).`);
      return;
    }

    const res = await processRefundAdminAction({
      paymentId: selectedPayment.id,
      amount: targetAmount,
      reason: refundReasonInput,
    });

    setLoading(false);

    if (!res.ok) {
      showMsg(undefined, res.error);
      return;
    }

    showMsg("Refund processed successfully.");

    // Update local state
    const result = res.result;
    const newRefundRow: RefundRecord = {
      id: result.refund_id || Math.random().toString(),
      restaurant_id: selectedPayment.restaurant_id,
      payment_id: selectedPayment.id,
      provider: selectedPayment.provider,
      provider_refund_id: result.provider_refund_id || "rfnd_local",
      amount: targetAmount,
      currency: selectedPayment.currency,
      reason: refundReasonInput || null,
      status: "succeeded",
      created_at: new Date().toISOString(),
    };

    const newPaymentStatus = result.payment_status || (targetAmount >= remaining ? "refunded" : "partially_refunded");

    const updatedPayment: PaymentRow = {
      ...selectedPayment,
      status: newPaymentStatus,
      payment_refunds: [...(selectedPayment.payment_refunds || []), newRefundRow],
      reservations: selectedPayment.reservations
        ? {
            ...selectedPayment.reservations,
            deposit_status: newPaymentStatus === "refunded" ? "refunded" : "partially_refunded",
          }
        : null,
    };

    setPayments((prev) => prev.map((p) => (p.id === selectedPayment.id ? updatedPayment : p)));
    setSelectedPayment(updatedPayment);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 font-medium">Paid</span>;
      case "partially_refunded":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-purple-100 text-purple-800 font-medium">Partially Refunded</span>;
      case "refunded":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-purple-200 text-purple-900 font-medium">Fully Refunded</span>;
      case "failed":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-rose-100 text-rose-800 font-medium">Failed</span>;
      default:
        return <span className="px-2.5 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 font-bold ml-4">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span>✅ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 font-bold ml-4">✕</button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-neutral-500 font-medium">Gross Payments Received</p>
          <p className="text-2xl font-semibold text-emerald-700 mt-1">₹{totalReceived.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-neutral-500 font-medium">Total Refunded</p>
          <p className="text-2xl font-semibold text-purple-700 mt-1">₹{totalRefunded.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-neutral-500 font-medium">Net Revenue</p>
          <p className="text-2xl font-semibold text-ink mt-1">₹{netRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-neutral-500 font-medium">Total Transactions</p>
          <p className="text-2xl font-semibold text-neutral-700 mt-1">{payments.length}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="Search receipt code, ref ID, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="field text-sm py-2 px-3 w-full sm:w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field text-sm py-2 px-3"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="refunded">Fully Refunded</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="field text-sm py-2 px-3"
          >
            <option value="all">All Providers</option>
            <option value="stripe">Stripe</option>
            <option value="razorpay">Razorpay</option>
            <option value="cash">Cash / POS</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-cream2 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <p className="text-base font-serif text-neutral-600">No payment records found.</p>
            <p className="text-xs mt-1">Transactions will appear here when orders or deposits are settled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-cream2 bg-neutral-50/50 text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt / Date</th>
                  <th className="py-3 px-4">Purpose & Reference</th>
                  <th className="py-3 px-4">Customer / Table</th>
                  <th className="py-3 px-4">Provider & Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream2">
                {filtered.map((p) => {
                  const refundedSum = (p.payment_refunds || [])
                    .filter((r) => r.status === "succeeded")
                    .reduce((s, r) => s + Number(r.amount || 0), 0);

                  const isDeposit = !!p.reservation_id;

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-medium text-ink">{p.receipt_code || "LM-..."}</div>
                        <div className="text-xs text-neutral-500">
                          {new Date(p.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isDeposit ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                            Reservation Deposit
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                            Dine-In Bill
                          </span>
                        )}
                        <div className="text-xs font-mono text-neutral-400 mt-1 truncate max-w-xs">
                          {p.provider_payment_id || p.provider_order_id || p.id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.reservations ? (
                          <div>
                            <div className="font-medium text-ink">{p.reservations.name}</div>
                            <div className="text-xs text-neutral-500">{p.reservations.phone}</div>
                          </div>
                        ) : p.dining_sessions?.restaurant_tables ? (
                          <div>
                            <div className="font-medium text-ink">Table {p.dining_sessions.restaurant_tables.label}</div>
                            <div className="text-xs text-neutral-500">Dine-In Session</div>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="capitalize font-medium text-neutral-800 text-xs">
                          💳 {p.provider} ({p.payment_method_type || "online"})
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink">₹{Number(p.paid_amount || p.amount).toLocaleString()}</div>
                        {refundedSum > 0 && (
                          <div className="text-xs text-purple-600">
                            -₹{refundedSum.toLocaleString()} refunded
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(p.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openDetailsModal(p)}
                          className="text-xs font-medium text-wine hover:text-ink bg-wine/5 hover:bg-wine/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Details & Refunds
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details & Refund Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-cream2 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h2 className="font-serif text-xl text-ink">
                  Payment Details: {selectedPayment.receipt_code || selectedPayment.id.slice(0, 8)}
                </h2>
                <p className="text-xs text-neutral-500">
                  {new Date(selectedPayment.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-neutral-400 hover:text-ink text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Payment Summary Box */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-xl border border-cream2 text-sm">
              <div>
                <span className="text-xs text-neutral-500 block">Status</span>
                {getStatusBadge(selectedPayment.status)}
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Gross Paid</span>
                <span className="font-semibold text-ink">₹{Number(selectedPayment.paid_amount || selectedPayment.amount).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Refunded</span>
                <span className="font-semibold text-purple-700">
                  ₹{
                    (selectedPayment.payment_refunds || [])
                      .filter((r) => r.status === "succeeded")
                      .reduce((s, r) => s + Number(r.amount || 0), 0)
                      .toLocaleString()
                  }
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Gateway Provider</span>
                <span className="font-medium capitalize">{selectedPayment.provider}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Provider Ref ID</span>
                <span className="font-mono text-xs text-neutral-700 truncate block">
                  {selectedPayment.provider_payment_id || selectedPayment.provider_order_id || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Currency</span>
                <span className="font-medium uppercase">{selectedPayment.currency}</span>
              </div>
            </div>

            {/* Refund History Table */}
            <div>
              <h3 className="font-serif text-base text-ink mb-2">Refund Audit History</h3>
              {(!selectedPayment.payment_refunds || selectedPayment.payment_refunds.length === 0) ? (
                <p className="text-xs text-neutral-400 italic bg-neutral-50 p-3 rounded-lg border border-cream2">
                  No refunds recorded for this payment.
                </p>
              ) : (
                <div className="border border-cream2 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 border-b border-cream2 text-neutral-500">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Refund ID</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Reason</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream2">
                      {selectedPayment.payment_refunds.map((ref) => (
                        <tr key={ref.id}>
                          <td className="py-2 px-3 text-neutral-500">
                            {new Date(ref.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-mono text-neutral-700">
                            {ref.provider_refund_id}
                          </td>
                          <td className="py-2 px-3 font-semibold text-purple-800">
                            ₹{Number(ref.amount).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-neutral-600">
                            {ref.reason || "—"}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {ref.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Process Refund Section */}
            {(selectedPayment.status === "paid" || selectedPayment.status === "partially_refunded") && (
              <div className="pt-4 border-t border-cream2">
                <h3 className="font-serif text-base text-ink mb-3">Process Financial Refund</h3>

                {!canRefund ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    🔒 Refund Operations are restricted to <strong>Owner</strong> and <strong>Manager</strong> roles only. Staff accounts cannot execute financial refunds.
                  </div>
                ) : (
                  <form onSubmit={handleProcessRefund} className="space-y-4 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFullRefund}
                          onChange={(e) => {
                            setIsFullRefund(e.target.checked);
                            if (e.target.checked) {
                              const existingRefunded = (selectedPayment.payment_refunds || [])
                                .filter((r) => r.status === "succeeded")
                                .reduce((s, r) => s + Number(r.amount || 0), 0);
                              const remaining = Math.max(0, Number(selectedPayment.paid_amount || selectedPayment.amount || 0) - existingRefunded);
                              setRefundAmountInput(String(remaining));
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        Full Remaining Refund
                      </label>
                    </div>

                    {!isFullRefund && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Custom Partial Refund Amount (₹) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          value={refundAmountInput}
                          onChange={(e) => setRefundAmountInput(e.target.value)}
                          className="field w-full text-sm py-2 px-3"
                          placeholder="Enter refund amount"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Refund Reason / Audit Note
                      </label>
                      <input
                        type="text"
                        value={refundReasonInput}
                        onChange={(e) => setRefundReasonInput(e.target.value)}
                        className="field w-full text-sm py-2 px-3"
                        placeholder="Customer request, reservation cancelled, quality dispute, etc."
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                      >
                        {loading ? "Processing Refund..." : "Execute Authoritative Refund"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
