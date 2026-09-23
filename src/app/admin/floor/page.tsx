"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  RefreshCw,
  Plus,
  QrCode,
  Copy,
  Printer,
  Check,
  X,
  Move,
  Users,
  Grid,
  MapPin,
  Loader2,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/data/menu";
import {
  setTableState,
  settleSession,
  addRestaurantTable,
  updateTablePosition,
  type AddTableInput
} from "@/actions/admin";
import { getActiveRestaurantId } from "@/actions/tenant";

type TableRow = {
  id: string;
  label: string;
  seats: number;
  state: string;
  token: string;
  section: string;
  pos_x: number;
  pos_y: number;
  current_session_id: string | null;
};

type SessionRow = { id: string; table_id: string; status: string };
type OrderRow = { session_id: string; amount: number };

const STATE_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  free: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", label: "Available" },
  occupied: { bg: "bg-wine/10", border: "border-wine/40", text: "text-wine", label: "Occupied" },
  reserved: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", label: "Reserved" },
  bill_pending: { bg: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-800", label: "Bill Requested" },
};

export default function FloorPage() {
  const supabase = useMemo(() => createClient(), []);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("All");

  // Mode: "map" | "grid" | "position"
  const [viewMode, setViewMode] = useState<"map" | "grid" | "position">("map");

  // Add Table Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newSeats, setNewSeats] = useState(4);
  const [newSection, setNewSection] = useState("Main Dining");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // QR Modal State
  const [qrTable, setQrTable] = useState<{ table: TableRow; dataUrl: string; fullUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const restaurantId = await getActiveRestaurantId();
    if (!restaurantId) {
      setTables([]);
      setSessions([]);
      setOrders([]);
      setLoading(false);
      return;
    }

    const [t, s, o] = await Promise.all([
      supabase
        .from("restaurant_tables")
        .select("id, label, seats, state, token, section, pos_x, pos_y, current_session_id")
        .eq("restaurant_id", restaurantId)
        .order("created_at"),
      supabase
        .from("dining_sessions")
        .select("id, table_id, status")
        .eq("restaurant_id", restaurantId)
        .in("status", ["open", "bill_pending"]),
      supabase
        .from("session_orders")
        .select("session_id, amount")
        .eq("restaurant_id", restaurantId)
        .neq("status", "served")
        .neq("status", "cancelled"),

    ]);

    setTables((t.data ?? []) as TableRow[]);
    setSessions((s.data ?? []) as SessionRow[]);
    setOrders((o.data ?? []) as OrderRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("floor-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "dining_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_orders" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, load]);

  const sections = useMemo(() => {
    const list = Array.from(new Set(tables.map((t) => t.section || "Main Dining")));
    return ["All", ...list];
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (activeSection === "All") return tables;
    return tables.filter((t) => (t.section || "Main Dining") === activeSection);
  }, [tables, activeSection]);

  const sessionOf = (tableId: string) => sessions.find((s) => s.table_id === tableId);

  const totalOf = (sessionId?: string) =>
    sessionId
      ? orders.filter((o) => o.session_id === sessionId).reduce((s, o) => s + Number(o.amount), 0)
      : 0;

  async function act(fn: () => Promise<unknown>, key: string) {
    setBusy(key);
    await fn();
    await load();
    setBusy(null);
  }

  // Handle Add Table Submit
  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    if (addSaving) return;

    setAddSaving(true);
    setAddError(null);

    const input: AddTableInput = {
      label: newLabel,
      seats: Number(newSeats),
      section: newSection,
      pos_x: Math.floor(Math.random() * 4) * 160 + 20,
      pos_y: Math.floor(Math.random() * 3) * 160 + 20,
    };

    const res = await addRestaurantTable(input);
    setAddSaving(false);

    if (res.ok) {
      setShowAddModal(false);
      setNewLabel("");
      setNewSeats(4);
      load();
    } else {
      setAddError(res.error);
    }
  }

  // Open QR Modal
  async function openQrModal(table: TableRow) {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const fullUrl = `${siteUrl}/t/${table.token}`;
    const dataUrl = await QRCode.toDataURL(fullUrl, {
      margin: 1,
      width: 300,
      color: { dark: "#16130f", light: "#ffffff" },
    });
    setQrTable({ table, dataUrl, fullUrl });
    setCopied(false);
  }

  function copyQrUrl() {
    if (!qrTable) return;
    navigator.clipboard.writeText(qrTable.fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function printQrCode() {
    if (!qrTable) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - Table ${qrTable.table.label}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: grid; place-items: center; height: 100vh; margin: 0; }
            .card { text-align: center; border: 2px solid #16130f; padding: 24px; border-radius: 16px; max-width: 280px; }
            h1 { font-size: 28px; margin: 0 0 8px 0; }
            img { width: 220px; height: 220px; }
            p { font-size: 12px; color: #666; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Table ${qrTable.table.label}</h1>
            <img src="${qrTable.dataUrl}" />
            <p>Scan to order & pay</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Move table in Position mode
  async function moveTable(table: TableRow, deltaX: number, deltaY: number) {
    const newX = Math.max(0, Math.min(1200, (table.pos_x || 0) + deltaX));
    const newY = Math.max(0, Math.min(1200, (table.pos_y || 0) + deltaY));

    // Optimistic UI update
    setTables((prev) =>
      prev.map((t) => (t.id === table.id ? { ...t, pos_x: newX, pos_y: newY } : t))
    );

    await updateTablePosition(table.id, newX, newY, table.section);
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">Floor Map & Tables</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Visual table map, live status, and table QR code generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-wine text-xs py-2 px-4 shadow-xs"
          >
            <Plus size={16} /> Add Table
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Control Toolbar & Section Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-cream2 shadow-xs">
        {/* Sections Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                activeSection === sec
                  ? "bg-wine text-white shadow-xs"
                  : "bg-cream text-neutral-600 hover:bg-cream2"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-cream rounded-xl p-1 shrink-0">
          <button
            onClick={() => setViewMode("map")}
            className={`text-xs font-medium px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === "map" ? "bg-white text-ink shadow-xs" : "text-neutral-500"
            }`}
          >
            <MapPin size={13} /> Floor Layout
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`text-xs font-medium px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === "grid" ? "bg-white text-ink shadow-xs" : "text-neutral-500"
            }`}
          >
            <Grid size={13} /> Compact Grid
          </button>
          <button
            onClick={() => setViewMode("position")}
            className={`text-xs font-medium px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === "position" ? "bg-white text-ink shadow-xs" : "text-neutral-500"
            }`}
          >
            <Move size={13} /> Position Mode
          </button>
        </div>
      </div>

      {/* State Legend Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {Object.entries(STATE_STYLE).map(([key, style]) => (
          <span
            key={key}
            className={`px-3 py-1 rounded-full border font-medium flex items-center gap-1.5 ${style.bg} ${style.border} ${style.text}`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            {style.label}
          </span>
        ))}
      </div>

      {/* Main Floor Container */}
      {loading && tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
          <Loader2 className="animate-spin text-gold" size={28} />
          <span className="text-sm font-medium">Loading floor map…</span>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-cream2 space-y-3">
          <MapPin size={32} className="mx-auto text-neutral-300" />
          <h3 className="font-serif text-lg font-semibold text-ink">No tables found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Get started by adding your first table to the floor plan.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-wine text-xs py-2 px-4 mx-auto"
          >
            <Plus size={14} /> Add Table
          </button>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: FLOOR MAP (POSITIONAL SPATIAL CANVAS) */}
          {viewMode === "map" && (
            <div className="bg-white rounded-2xl border border-cream2 p-6 min-h-[460px] shadow-xs relative overflow-auto">
              <div className="absolute top-3 right-3 text-[11px] text-neutral-400 font-mono">
                Canvas Grid Mode · {filteredTables.length} Tables
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredTables.map((t) => {
                  const sess = sessionOf(t.id);
                  const total = totalOf(sess?.id);
                  const stateKey = sess ? sess.status : t.state;
                  const style = STATE_STYLE[stateKey] ?? STATE_STYLE.free;

                  return (
                    <div
                      key={t.id}
                      className={`rounded-2xl border p-4 transition-all duration-200 shadow-xs flex flex-col justify-between ${style.bg} ${style.border}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-serif font-bold text-xl text-ink">
                            {t.label}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}
                          >
                            {style.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs opacity-80 mt-1">
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {t.seats} seats
                          </span>
                          <span>·</span>
                          <span className="truncate">{t.section || "Main"}</span>
                        </div>

                        {sess && total > 0 && (
                          <div className="font-serif font-semibold text-sm mt-2.5 text-wine flex items-center gap-1">
                            <DollarSign size={14} /> {money(total)}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-2">
                        {/* QR Trigger */}
                        <button
                          onClick={() => openQrModal(t)}
                          className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-neutral-700 border border-black/10 transition-colors"
                          title="View & Print QR"
                        >
                          <QrCode size={15} />
                        </button>

                        {/* State Actions */}
                        <div className="flex items-center gap-1.5">
                          {sess ? (
                            <button
                              onClick={() => act(() => settleSession(sess.id, "cash"), t.id)}
                              disabled={busy === t.id}
                              className="text-xs px-2.5 py-1 rounded-full bg-wine text-white font-medium shadow-xs disabled:opacity-60"
                            >
                              Settle
                            </button>
                          ) : t.state === "reserved" ? (
                            <button
                              onClick={() => act(() => setTableState(t.id, "free"), t.id)}
                              disabled={busy === t.id}
                              className="text-xs px-2.5 py-1 rounded-full bg-white text-neutral-700 border font-medium hover:bg-cream"
                            >
                              Free
                            </button>
                          ) : (
                            <button
                              onClick={() => act(() => setTableState(t.id, "reserved"), t.id)}
                              disabled={busy === t.id}
                              className="text-xs px-2.5 py-1 rounded-full bg-white text-neutral-700 border font-medium hover:bg-cream"
                            >
                              Reserve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: COMPACT GRID VIEW */}
          {viewMode === "grid" && (
            <div className="bg-white rounded-2xl border border-cream2 p-4 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {filteredTables.map((t) => {
                  const sess = sessionOf(t.id);
                  const stateKey = sess ? sess.status : t.state;
                  const style = STATE_STYLE[stateKey] ?? STATE_STYLE.free;

                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border text-center transition-all ${style.bg} ${style.border}`}
                    >
                      <div className="font-serif font-bold text-lg text-ink">{t.label}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">{t.seats} Seats</div>
                      <span
                        className={`inline-block text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded-full mt-1.5 border ${style.bg} ${style.border} ${style.text}`}
                      >
                        {style.label}
                      </span>
                      <div className="mt-2.5 flex items-center justify-center gap-1">
                        <button
                          onClick={() => openQrModal(t)}
                          className="p-1 rounded bg-white border text-neutral-600 hover:text-wine"
                        >
                          <QrCode size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 3: POSITIONING MODE */}
          {viewMode === "position" && (
            <div className="bg-white rounded-2xl border border-cream2 p-6 shadow-xs space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
                <span>
                  <b>Position Relocation Mode:</b> Use arrow buttons to adjust physical table placement coordinates for visual floor mapping.
                </span>
                <span className="font-mono text-[10px] bg-amber-200 px-2 py-0.5 rounded">Auto-saved</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTables.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl border border-cream2 bg-cream/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-base">{t.label}</span>
                      <span className="text-xs text-neutral-500 font-mono">
                        X: {t.pos_x || 0}, Y: {t.pos_y || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => moveTable(t, -20, 0)}
                        className="btn-outline text-xs px-2.5 py-1"
                        title="Move Left"
                      >
                        ← Left
                      </button>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveTable(t, 0, -20)}
                          className="btn-outline text-xs px-2.5 py-0.5"
                          title="Move Up"
                        >
                          ↑ Up
                        </button>
                        <button
                          onClick={() => moveTable(t, 0, 20)}
                          className="btn-outline text-xs px-2.5 py-0.5"
                          title="Move Down"
                        >
                          ↓ Down
                        </button>
                      </div>
                      <button
                        onClick={() => moveTable(t, 20, 0)}
                        className="btn-outline text-xs px-2.5 py-1"
                        title="Move Right"
                      >
                        Right →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD TABLE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lg border border-cream2 space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <h3 className="font-serif font-semibold text-lg text-ink">Add New Table</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 text-neutral-700">Table Number / Label *</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Table 12 or T-12"
                  className="field text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-neutral-700">Seating Capacity *</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newSeats}
                  onChange={(e) => setNewSeats(Number(e.target.value))}
                  className="field"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-neutral-700">Section / Area</label>
                <input
                  type="text"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  placeholder="e.g. Main Dining, Patio, VIP"
                  className="field"
                />
              </div>

              {addError && <p className="text-wine font-medium">{addError}</p>}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="btn-wine py-2 px-5 disabled:opacity-60"
                >
                  {addSaving ? <Loader2 className="animate-spin" size={14} /> : "Save Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL / DRAWER */}
      {qrTable && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-lg border border-cream2 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <span className="font-serif font-bold text-xl text-ink">
                Table {qrTable.table.label}
              </span>
              <button
                onClick={() => setQrTable(null)}
                className="text-neutral-400 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-cream/40 p-4 rounded-xl border border-cream2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrTable.dataUrl}
                alt={`QR code for Table ${qrTable.table.label}`}
                className="w-56 h-56 mx-auto rounded-lg shadow-xs"
              />
            </div>

            <div className="text-xs text-neutral-500 font-mono break-all line-clamp-1">
              {qrTable.fullUrl}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <button
                onClick={copyQrUrl}
                className="btn-outline justify-center py-2 px-3"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>

              <button
                onClick={printQrCode}
                className="btn-wine justify-center py-2 px-3"
              >
                <Printer size={14} /> Print QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
