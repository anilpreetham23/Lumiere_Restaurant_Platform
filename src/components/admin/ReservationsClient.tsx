"use client";

import { useState } from "react";
import {
  createReservationAdminAction,
  updateReservationAdminAction,
  setReservationStatusAdminAction,
  seatReservationAdminAction,
} from "@/actions/admin";

type TableInfo = {
  id: string;
  label: string;
  seats?: number;
  max_capacity?: number;
  state: string;
};

type ReservationRow = {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  email: string;
  guests: string;
  date: string;
  time: string;
  requests?: string | null;
  status: string; // pending | confirmed | seated | completed | cancelled | no_show
  deposit_amount: number;
  deposit_status: string; // none | pending | paid | partially_refunded | refunded | applied | forfeited
  table_id?: string | null;
  restaurant_tables?: TableInfo | null;
  created_at: string;
};

interface Props {
  initialReservations: ReservationRow[];
  tables: TableInfo[];
}

export default function ReservationsClient({ initialReservations, tables }: Props) {
  const [reservations, setReservations] = useState<ReservationRow[]>(initialReservations);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<ReservationRow | null>(null);
  const [seatingRes, setSeatingRes] = useState<ReservationRow | null>(null);

  // Form state for Create / Edit
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    email: "",
    guests: "2",
    date: new Date().toISOString().split("T")[0],
    time: "19:00",
    table_id: "",
    requests: "",
    deposit_amount: "500",
    deposit_status: "pending",
    status: "pending",
  });

  const [selectedTableForSeating, setSelectedTableForSeating] = useState<string>("");

  // Filtered reservations
  const filtered = reservations.filter((r) => {
    if (dateFilter && r.date !== dateFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(term);
      const matchPhone = r.phone?.toLowerCase().includes(term);
      const matchEmail = r.email?.toLowerCase().includes(term);
      const matchTable = r.restaurant_tables?.label?.toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchEmail && !matchTable) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalCount = reservations.length;
  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
  const seatedCount = reservations.filter((r) => r.status === "seated").length;
  const pendingDepositsCount = reservations.filter((r) => r.deposit_status === "pending").length;
  const cancelledCount = reservations.filter((r) => r.status === "cancelled" || r.status === "no_show").length;

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

  const openCreateModal = () => {
    setFormState({
      name: "",
      phone: "",
      email: "",
      guests: "2",
      date: new Date().toISOString().split("T")[0],
      time: "19:00",
      table_id: "",
      requests: "",
      deposit_amount: "0",
      deposit_status: "none",
      status: "pending",
    });
    setEditingRes(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (res: ReservationRow) => {
    setEditingRes(res);
    setFormState({
      name: res.name || "",
      phone: res.phone || "",
      email: res.email || "",
      guests: res.guests || "2",
      date: res.date || "",
      time: res.time || "",
      table_id: res.table_id || "",
      requests: res.requests || "",
      deposit_amount: String(res.deposit_amount ?? 0),
      deposit_status: res.deposit_status || "none",
      status: res.status || "pending",
    });
    setIsCreateOpen(true);
  };

  const handleSaveReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (editingRes) {
      const res = await updateReservationAdminAction(editingRes.id, {
        name: formState.name,
        phone: formState.phone,
        email: formState.email,
        guests: formState.guests,
        date: formState.date,
        time: formState.time,
        table_id: formState.table_id || null,
        requests: formState.requests,
        deposit_amount: Number(formState.deposit_amount) || 0,
        deposit_status: formState.deposit_status,
        status: formState.status,
      });

      setLoading(false);
      if (!res.ok) {
        showMsg(undefined, res.error);
        return;
      }

      showMsg("Reservation updated successfully.");
      setIsCreateOpen(false);
      setEditingRes(null);

      // Update local state
      const targetTable = tables.find((t) => t.id === formState.table_id) || null;
      setReservations((prev) =>
        prev.map((item) =>
          item.id === editingRes.id
            ? {
                ...item,
                name: formState.name,
                phone: formState.phone,
                email: formState.email,
                guests: formState.guests,
                date: formState.date,
                time: formState.time,
                table_id: formState.table_id || null,
                requests: formState.requests,
                deposit_amount: Number(formState.deposit_amount) || 0,
                deposit_status: formState.deposit_status,
                status: formState.status,
                restaurant_tables: targetTable,
              }
            : item
        )
      );
    } else {
      const effectiveEmail = formState.email.trim() || `${formState.phone.replace(/[^0-9]/g, "") || "guest"}@reservation.local`;
      const res = await createReservationAdminAction({
        name: formState.name,
        phone: formState.phone,
        email: effectiveEmail,
        guests: formState.guests,
        date: formState.date,
        time: formState.time,
        table_id: formState.table_id || null,
        requests: formState.requests,
        deposit_amount: Number(formState.deposit_amount) || 0,
        deposit_status: formState.deposit_status,
        status: formState.status,
      });

      setLoading(false);
      if (!res.ok || !res.id) {
        showMsg(undefined, res.error);
        return;
      }

      showMsg("Reservation created successfully.");
      setIsCreateOpen(false);

      const targetTable = tables.find((t) => t.id === formState.table_id) || null;
      const newRow: ReservationRow = {
        id: res.id,
        restaurant_id: "",
        name: formState.name,
        phone: formState.phone,
        email: formState.email,
        guests: formState.guests,
        date: formState.date,
        time: formState.time,
        requests: formState.requests,
        status: formState.status,
        deposit_amount: Number(formState.deposit_amount) || 0,
        deposit_status: formState.deposit_status,
        table_id: formState.table_id || null,
        restaurant_tables: targetTable,
        created_at: new Date().toISOString(),
      };

      setReservations((prev) => [newRow, ...prev]);
    }
  };

  const handleStatusChange = async (resId: string, newStatus: string) => {
    setLoading(true);
    const res = await setReservationStatusAdminAction(resId, newStatus);
    setLoading(false);

    if (!res.ok) {
      showMsg(undefined, res.error);
      return;
    }

    showMsg(`Reservation marked as ${newStatus}.`);
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: newStatus } : r))
    );
  };

  const openSeatModal = (res: ReservationRow) => {
    setSeatingRes(res);
    setSelectedTableForSeating(res.table_id || "");
  };

  const handleSeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seatingRes) return;
    setLoading(true);
    setErrorMessage(null);

    const res = await seatReservationAdminAction(seatingRes.id, selectedTableForSeating);
    setLoading(false);

    if (!res.ok) {
      showMsg(undefined, res.error);
      return;
    }

    showMsg("Guest seated successfully.");
    const targetTable = tables.find((t) => t.id === selectedTableForSeating) || null;

    setReservations((prev) =>
      prev.map((r) =>
        r.id === seatingRes.id
          ? {
              ...r,
              status: "seated",
              table_id: selectedTableForSeating,
              restaurant_tables: targetTable,
            }
          : r
      )
    );
    setSeatingRes(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 font-medium">Confirmed</span>;
      case "seated":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">Seated</span>;
      case "completed":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-700 font-medium">Completed</span>;
      case "cancelled":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-rose-100 text-rose-800 font-medium">Cancelled</span>;
      case "no_show":
        return <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-800 font-medium">No-Show</span>;
      default:
        return <span className="px-2.5 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">Pending</span>;
    }
  };

  const getDepositBadge = (depStatus: string, amount: number) => {
    if (amount <= 0 || depStatus === "none") {
      return <span className="text-xs text-neutral-400">No Deposit</span>;
    }
    switch (depStatus) {
      case "paid":
        return <span className="px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Deposit Paid (₹{amount})</span>;
      case "refunded":
        return <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200">Refunded (₹{amount})</span>;
      case "partially_refunded":
        return <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200">Partially Refunded</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-700 border border-amber-200">Deposit Pending (₹{amount})</span>;
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-neutral-500 font-medium">Total Reservations</p>
          <p className="text-2xl font-semibold text-ink mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-emerald-600 font-medium">Confirmed</p>
          <p className="text-2xl font-semibold text-emerald-700 mt-1">{confirmedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-blue-600 font-medium">Currently Seated</p>
          <p className="text-2xl font-semibold text-blue-700 mt-1">{seatedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-amber-600 font-medium">Pending Deposits</p>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{pendingDepositsCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm">
          <p className="text-xs text-neutral-400 font-medium">Cancelled / No-Show</p>
          <p className="text-2xl font-semibold text-neutral-600 mt-1">{cancelledCount}</p>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="Search customer, phone, table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="field text-sm py-2 px-3 w-full sm:w-64"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="field text-sm py-2 px-3"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="text-xs text-neutral-500 hover:text-ink underline"
            >
              Clear Date
            </button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field text-sm py-2 px-3"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="seated">Seated</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-Show</option>
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span>+ New Reservation</span>
        </button>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-2xl border border-cream2 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <p className="text-base font-serif text-neutral-600">No reservations found.</p>
            <p className="text-xs mt-1">Try adjusting search filters or create a new reservation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-cream2 bg-neutral-50/50 text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Guests</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deposit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream2">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-ink">{r.date}</div>
                      <div className="text-xs text-neutral-500">{r.time}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-ink">{r.name}</div>
                      <div className="text-xs text-neutral-500">{r.phone} • {r.email}</div>
                      {r.requests && (
                        <div className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block max-w-xs truncate">
                          💬 {r.requests}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink">
                      👤 {r.guests} guests
                    </td>
                    <td className="py-3.5 px-4">
                      {r.restaurant_tables ? (
                        <span className="font-medium text-neutral-800 bg-neutral-100 px-2 py-1 rounded text-xs">
                          Table {r.restaurant_tables.label} ({r.restaurant_tables.max_capacity}p)
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>
                    <td className="py-3.5 px-4">{getDepositBadge(r.deposit_status, r.deposit_amount)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "pending" && (
                          <button
                            disabled={loading}
                            onClick={() => handleStatusChange(r.id, "confirmed")}
                            className="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {(r.status === "pending" || r.status === "confirmed") && (
                          <button
                            disabled={loading}
                            onClick={() => openSeatModal(r)}
                            className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                          >
                            Seat
                          </button>
                        )}
                        {r.status === "seated" && (
                          <button
                            disabled={loading}
                            onClick={() => handleStatusChange(r.id, "completed")}
                            className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        {(r.status === "pending" || r.status === "confirmed") && (
                          <button
                            disabled={loading}
                            onClick={() => handleStatusChange(r.id, "no_show")}
                            className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
                          >
                            No-Show
                          </button>
                        )}
                        {r.status !== "cancelled" && r.status !== "completed" && (
                          <button
                            disabled={loading}
                            onClick={() => handleStatusChange(r.id, "cancelled")}
                            className="text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(r)}
                          className="text-xs font-medium text-neutral-600 hover:text-ink bg-neutral-100 px-2 py-1 rounded transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Reservation */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-cream2 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cream2 pb-3 mb-4">
              <h2 className="font-serif text-xl text-ink">
                {editingRes ? "Edit Reservation" : "New Reservation"}
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-neutral-400 hover:text-ink text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReservation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="field w-full text-sm py-2 px-3"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="field w-full text-sm py-2 px-3"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="field w-full text-sm py-2 px-3"
                    placeholder="john@example.com (optional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Party Size (Guests) *</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={formState.guests}
                    onChange={(e) => setFormState({ ...formState, guests: e.target.value })}
                    className="field w-full text-sm py-2 px-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formState.date}
                    onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                    className="field w-full text-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={formState.time}
                    onChange={(e) => setFormState({ ...formState, time: e.target.value })}
                    className="field w-full text-sm py-2 px-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Table Assignment</label>
                  <select
                    value={formState.table_id}
                    onChange={(e) => setFormState({ ...formState, table_id: e.target.value })}
                    className="field w-full text-sm py-2 px-3"
                  >
                    <option value="">-- Select Table (Optional) --</option>
                    {tables
                      .filter((t) => t.state !== "out_of_service")
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Table {t.label} (Cap: {t.seats ?? t.max_capacity ?? 4}p, {t.state})
                        </option>
                      ))}
                  </select>
                </div>

                {editingRes && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Status</label>
                    <select
                      value={formState.status}
                      onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                      className="field w-full text-sm py-2 px-3"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="seated">Seated</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No-Show</option>
                    </select>
                  </div>
                )}
              </div>

              {editingRes && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Deposit Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formState.deposit_amount}
                      onChange={(e) => setFormState({ ...formState, deposit_amount: e.target.value })}
                      className="field w-full text-sm py-2 px-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Deposit Status</label>
                    <select
                      value={formState.deposit_status}
                      onChange={(e) => setFormState({ ...formState, deposit_status: e.target.value })}
                      className="field w-full text-sm py-2 px-3"
                    >
                      <option value="none">None</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="partially_refunded">Partially Refunded</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Special Requests / Notes</label>
                <textarea
                  rows={2}
                  value={formState.requests}
                  onChange={(e) => setFormState({ ...formState, requests: e.target.value })}
                  className="field w-full text-sm py-2 px-3"
                  placeholder="Window seat, anniversary celebration, etc."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm text-neutral-600 hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-2 text-sm font-medium"
                >
                  {loading ? "Saving..." : editingRes ? "Update Reservation" : "Create Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Seat Customer */}
      {seatingRes && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-cream2">
            <div className="flex items-center justify-between border-b border-cream2 pb-3 mb-4">
              <h2 className="font-serif text-xl text-ink">Seat Reservation</h2>
              <button
                onClick={() => setSeatingRes(null)}
                className="text-neutral-400 hover:text-ink text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-neutral-600 mb-4">
              Seating <strong>{seatingRes.name}</strong> ({seatingRes.guests} guests) for {seatingRes.time}.
            </p>

            <form onSubmit={handleSeatSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Select Dining Table *</label>
                <select
                  required
                  value={selectedTableForSeating}
                  onChange={(e) => setSelectedTableForSeating(e.target.value)}
                  className="field w-full text-sm py-2 px-3"
                >
                  <option value="">-- Choose a table --</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.label} (Max {t.max_capacity} guests • {t.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setSeatingRes(null)}
                  className="px-4 py-2 text-sm text-neutral-600 hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedTableForSeating}
                  className="btn-primary px-5 py-2 text-sm font-medium"
                >
                  {loading ? "Seating..." : "Confirm & Seat Guest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
