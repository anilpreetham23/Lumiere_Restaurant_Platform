"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  GlassWater,
  ReceiptText,
  UtensilsCrossed,
  HelpCircle,
  Check,
  CheckCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { acceptServiceRequest, resolveServiceRequest } from "@/actions/admin";
import { getActiveRestaurantId } from "@/actions/tenant";

type TableRow = { id: string; label: string; seats: number; state: string };

type ServiceReq = {
  id: string;
  table_id: string;
  type: string;
  status: string;
  message?: string | null;
  created_at: string;
};

const REQ_ICON: Record<string, React.ReactNode> = {
  waiter: <BellRing size={18} className="text-wine" />,
  water: <GlassWater size={18} className="text-cyan-600" />,
  bill: <ReceiptText size={18} className="text-emerald-600" />,
  cutlery: <UtensilsCrossed size={18} className="text-amber-600" />,
  assistance: <HelpCircle size={18} className="text-indigo-600" />,
};

const REQ_TITLE: Record<string, string> = {
  waiter: "Call Waiter",
  water: "Water Requested",
  bill: "Bill Requested",
  cutlery: "Cutlery Needed",
  assistance: "Assistance Requested",
};

export default function WaiterDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<ServiceReq[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted">("all");

  const [nowTs, setNowTs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const restaurantId = await getActiveRestaurantId();
    if (!restaurantId) {
      setRequests([]);
      setTables([]);
      setLoading(false);
      return;
    }

    const [r, t] = await Promise.all([
      supabase
        .from("service_requests")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .neq("status", "done")
        .order("created_at", { ascending: true }),
      supabase
        .from("restaurant_tables")
        .select("id, label, seats, state")
        .eq("restaurant_id", restaurantId),
    ]);

    setRequests((r.data ?? []) as ServiceReq[]);
    setTables((t.data ?? []) as TableRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("waiter-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, load]);

  const tableLabelOf = useCallback(
    (tableId: string) => tables.find((t) => t.id === tableId)?.label ?? "Table —",
    [tables]
  );

  async function handleAccept(id: string) {
    setBusy(id);
    await acceptServiceRequest(id);
    await load();
    setBusy(null);
  }

  async function handleResolve(id: string) {
    setBusy(id);
    await resolveServiceRequest(id);
    await load();
    setBusy(null);
  }

  const pendingReqs = requests.filter((r) => r.status === "pending");
  const acceptedReqs = requests.filter((r) => r.status === "accepted" || r.status === "in_progress");

  const displayedReqs = useMemo(() => {
    if (filter === "pending") return pendingReqs;
    if (filter === "accepted") return acceptedReqs;
    return requests;
  }, [filter, requests, pendingReqs, acceptedReqs]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink flex items-center gap-2.5">
            <BellRing className="text-wine" size={28} /> Waiter Dashboard
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Manage table service calls, assistance, and bill requests live
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Cards / Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === "all"
              ? "bg-ink text-white border-ink shadow-sm"
              : "bg-white text-ink border-cream2 hover:bg-cream"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">All Active Requests</div>
          <div className="font-serif text-3xl font-bold mt-1">{requests.length}</div>
        </button>

        <button
          onClick={() => setFilter("pending")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === "pending"
              ? "bg-wine text-white border-wine shadow-sm"
              : "bg-red-50 text-wine border-red-200 hover:bg-red-100/60"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 flex items-center justify-between">
            <span>Pending (Urgent)</span>
            {pendingReqs.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />}
          </div>
          <div className="font-serif text-3xl font-bold mt-1">{pendingReqs.length}</div>
        </button>

        <button
          onClick={() => setFilter("accepted")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === "accepted"
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/60"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 flex items-center justify-between">
            <span>In Progress</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="font-serif text-3xl font-bold mt-1">{acceptedReqs.length}</div>
        </button>
      </div>

      {/* Requests List Grid */}
      {displayedReqs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-cream2 space-y-3">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
          <h3 className="font-serif text-lg font-semibold text-ink">All clear! No active service requests</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            When guests call a waiter, request water or the bill, their alerts will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedReqs.map((r) => {
            const tableLabel = tableLabelOf(r.table_id);
            const icon = REQ_ICON[r.type] || <BellRing size={18} className="text-wine" />;
            const reqTitle = REQ_TITLE[r.type] || (r.type.toUpperCase() + " Request");
            const isPending = r.status === "pending";

            // Elapsed time calculation
            const createdMs = new Date(r.created_at).getTime();
            const elapsedSecs = Math.max(0, Math.floor((nowTs - createdMs) / 1000));
            const elapsedMins = Math.floor(elapsedSecs / 60);

            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border-2 p-4 shadow-xs flex flex-col justify-between transition-all ${
                  isPending
                    ? "border-red-400 bg-red-50/30"
                    : "border-amber-300 bg-amber-50/20"
                }`}
              >
                <div>
                  {/* Card Header: Table + Status */}
                  <div className="flex items-center justify-between border-b border-cream2 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-white border border-black/10 shadow-2xs">
                        {icon}
                      </div>
                      <div>
                        <div className="font-serif text-2xl font-bold text-ink">{tableLabel}</div>
                        <div className="text-[11px] font-medium text-neutral-500">{reqTitle}</div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isPending
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {isPending ? "Pending" : "In Progress"}
                    </span>
                  </div>

                  {/* Details / Message */}
                  {r.message && (
                    <div className="text-xs text-neutral-700 bg-white/80 p-2.5 rounded-xl border border-cream2 mb-3">
                      <span className="font-semibold text-neutral-500 block text-[10px] uppercase">Message:</span>
                      {r.message}
                    </div>
                  )}

                  {/* Timestamp & Elapsed */}
                  <div className="flex items-center justify-between text-xs text-neutral-500 font-mono mb-4">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`font-semibold ${elapsedMins >= 5 ? "text-red-600" : "text-neutral-600"}`}>
                      {elapsedMins === 0 ? "Just now" : `${elapsedMins} min ago`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-cream2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleAccept(r.id)}
                        disabled={busy === r.id}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        <Check size={14} /> Accept Request
                      </button>
                      <button
                        onClick={() => handleResolve(r.id)}
                        disabled={busy === r.id}
                        className="btn-wine text-xs py-2 px-3 font-bold disabled:opacity-60"
                        title="Directly resolve"
                      >
                        <CheckCheck size={14} /> Resolve
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleResolve(r.id)}
                      disabled={busy === r.id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <CheckCheck size={14} /> Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
