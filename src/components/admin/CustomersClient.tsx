"use client";

import { useState } from "react";
import { getCustomerDetailAdminAction, updateCustomerAdminAction } from "@/actions/admin";

interface CustomersClientProps {
  initialCustomers: any[];
  initialStats: {
    totalCustomers: number;
    totalVisits: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function CustomersClient({ initialCustomers, initialStats, pagination }: CustomersClientProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  async function handleSelectCustomer(customer: any) {
    setSelectedCustomer(customer);
    setEditMode(false);
    setLoadingDetail(true);
    setErrorMsg("");

    setEditName(customer.name || "");
    setEditEmail(customer.email || "");
    setEditPhone(customer.phone || "");
    setEditBirthday(customer.birthday || "");
    setEditNotes(customer.notes || "");

    const res = await getCustomerDetailAdminAction(customer.id);
    if (res.ok && res.data) {
      setDetailData(res.data);
    } else {
      setErrorMsg(res.error || "Failed to load customer details");
    }
    setLoadingDetail(false);
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSaving(true);
    setErrorMsg("");

    const res = await updateCustomerAdminAction(selectedCustomer.id, {
      name: editName,
      email: editEmail,
      phone: editPhone,
      birthday: editBirthday,
      notes: editNotes,
    });

    if (res.ok) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? { ...c, name: editName, email: editEmail, phone: editPhone, birthday: editBirthday, notes: editNotes }
            : c
        )
      );
      setSelectedCustomer((prev: any) => ({
        ...prev,
        name: editName,
        email: editEmail,
        phone: editPhone,
        birthday: editBirthday,
        notes: editNotes,
      }));
      setEditMode(false);
    } else {
      setErrorMsg(res.error || "Failed to update customer.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Customer Management</h1>
          <p className="text-sm text-neutral-500">
            Tenant-isolated customer profiles, visit history, and total spending analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-cream2 rounded-xl px-4 py-2.5 text-center shadow-sm">
            <span className="text-xs uppercase text-neutral-400 font-semibold block">Total Customers</span>
            <span className="font-serif text-xl text-ink font-bold">{initialStats.totalCustomers}</span>
          </div>
          <div className="bg-white border border-cream2 rounded-xl px-4 py-2.5 text-center shadow-sm">
            <span className="text-xs uppercase text-neutral-400 font-semibold block">Total Visits</span>
            <span className="font-serif text-xl text-ink font-bold">{initialStats.totalVisits}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-cream2 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-gold"
          />
          <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-xs text-neutral-500">
          Showing {filteredCustomers.length} of {pagination.totalCount} customers
        </span>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List Column */}
        <div className="lg:col-span-1 bg-white border border-cream2 rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-serif text-lg text-ink pb-2 border-b border-cream2">Customers</h2>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-sm">
              No customer records found.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                const balance = cust.loyalty_accounts?.[0]?.balance || 0;
                return (
                  <button
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-gold bg-amber-50/40 shadow-sm"
                        : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-ink text-sm">
                          {cust.name || "Guest Customer"}
                        </div>
                        <div className="text-xs text-neutral-500 font-mono mt-0.5">
                          {cust.phone}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark border border-gold/20">
                        {cust.visits || 1} {cust.visits === 1 ? "visit" : "visits"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-100 pt-2">
                      <span>Loyalty: <strong className="text-ink">{balance} pts</strong></span>
                      <span>
                        {cust.last_visit_at
                          ? new Date(cust.last_visit_at).toLocaleDateString()
                          : "First visit"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Detail Column */}
        <div className="lg:col-span-2 bg-white border border-cream2 rounded-xl p-6 shadow-sm">
          {!selectedCustomer ? (
            <div className="text-center py-16 text-neutral-400">
              <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-sm font-medium">Select a customer from the left list to view details</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="flex items-start justify-between pb-4 border-b border-cream2">
                <div>
                  <h2 className="font-serif text-2xl text-ink">
                    {selectedCustomer.name || "Guest Customer"}
                  </h2>
                  <p className="text-sm font-mono text-neutral-500 mt-1">
                    Phone: {selectedCustomer.phone}
                  </p>
                  {selectedCustomer.email && (
                    <p className="text-xs text-neutral-400 mt-0.5">Email: {selectedCustomer.email}</p>
                  )}
                </div>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                >
                  {editMode ? "Cancel Editing" : "Edit Profile"}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
                  {errorMsg}
                </div>
              )}

              {/* Edit Mode Form */}
              {editMode ? (
                <form onSubmit={handleSaveCustomer} className="space-y-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                  <h3 className="font-semibold text-sm text-ink">Edit Customer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-gold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-gold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-gold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Birthday</label>
                      <input
                        type="date"
                        value={editBirthday}
                        onChange={(e) => setEditBirthday(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-gold bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Internal Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      placeholder="VIP customer preferences, allergy alerts, table choices..."
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-gold bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 text-xs text-neutral-600 hover:text-neutral-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 text-xs font-medium text-white bg-gold hover:bg-gold-dark rounded-lg shadow-sm disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Aggregated Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                  <span className="text-xs text-amber-800/70 uppercase font-semibold block">Total Spending</span>
                  <span className="font-serif text-2xl text-amber-900 font-bold mt-1 block">
                    ₹{detailData?.stats?.totalSpend ? detailData.stats.totalSpend.toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                  <span className="text-xs text-emerald-800/70 uppercase font-semibold block">Total Orders</span>
                  <span className="font-serif text-2xl text-emerald-900 font-bold mt-1 block">
                    {detailData?.stats?.orderCount || 0}
                  </span>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <span className="text-xs text-blue-800/70 uppercase font-semibold block">Avg Order Value</span>
                  <span className="font-serif text-2xl text-blue-900 font-bold mt-1 block">
                    ₹{detailData?.stats?.avgOrderValue ? detailData.stats.avgOrderValue.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>

              {/* Loyalty Account Summary */}
              {selectedCustomer.loyalty_accounts?.[0] && (
                <div className="bg-neutral-900 text-white rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase text-gold font-semibold tracking-wider block">Loyalty Membership</span>
                    <span className="font-serif text-2xl font-bold mt-0.5 block">
                      {selectedCustomer.loyalty_accounts[0].balance} Points Balance
                    </span>
                  </div>
                  <div className="text-right text-xs text-neutral-400">
                    <div>Lifetime Earned: <strong className="text-white">{selectedCustomer.loyalty_accounts[0].lifetime_points} pts</strong></div>
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {selectedCustomer.notes && (
                <div className="bg-cream rounded-xl p-4 border border-cream2">
                  <h4 className="text-xs uppercase font-semibold text-neutral-500 mb-1">Customer Notes</h4>
                  <p className="text-sm text-ink italic">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Recent Orders History */}
              <div className="space-y-3">
                <h3 className="font-serif text-lg text-ink">Recent Order History</h3>

                {loadingDetail ? (
                  <div className="text-center py-6 text-xs text-neutral-400">Loading order history...</div>
                ) : !detailData?.recentOrders || detailData.recentOrders.length === 0 ? (
                  <div className="text-center py-6 text-xs text-neutral-400 bg-neutral-50 rounded-lg">
                    No order history recorded for this customer.
                  </div>
                ) : (
                  <div className="border border-cream2 rounded-xl overflow-hidden divide-y divide-cream2">
                    {detailData.recentOrders.map((ord: any) => (
                      <div key={ord.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-neutral-50">
                        <div>
                          <div className="font-semibold text-ink">
                            Order #{ord.order_number || ord.id.slice(0, 8)}
                            {ord.table_label && <span className="ml-2 font-normal text-neutral-500">Table {ord.table_label}</span>}
                          </div>
                          <div className="text-neutral-400 mt-0.5">
                            {new Date(ord.created_at || ord.session_created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-ink">₹{Number(ord.total || ord.amount || 0).toFixed(2)}</div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                            ord.status === 'served' || ord.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    ))}
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
