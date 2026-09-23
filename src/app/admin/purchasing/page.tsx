"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Truck,
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Edit2,
  Eye,
  Check,
  X,
  ChevronRight,
  PackageCheck,
  Sliders,
  DollarSign,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Boxes,
  Loader2
} from "lucide-react";
import {
  getSuppliers,
  saveSupplierAction,
  toggleSupplierActiveAction,
  getPurchaseOrders,
  savePurchaseOrderAction,
  updatePOStatusAction,
  receivePOSourceStockAction
} from "@/actions/admin";
import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/actions/tenant";
import type { Supplier, PurchaseOrderDetail, POStatus } from "@/lib/purchasing";

type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  quantity: number;
  cost_per_unit: number;
  is_active: boolean;
};

export default function PurchasingAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  // Primary navigation tabs: "orders" | "suppliers"
  const [activeTab, setActiveTab] = useState<"orders" | "suppliers">("orders");

  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDetail[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Supplier filter & search
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // PO filter & search
  const [poSearch, setPOSearch] = useState("");
  const [poStatusFilter, setPOStatusFilter] = useState<"all" | POStatus>("all");
  const [poSupplierFilter, setPOSupplierFilter] = useState<string>("all");

  // Supplier Add/Edit Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    is_active: true,
  });
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // Supplier Detail View Modal
  const [viewSupplierDetail, setViewSupplierDetail] = useState<Supplier | null>(null);

  // Purchase Order Add/Edit Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrderDetail | null>(null);
  const [poForm, setPOForm] = useState<{
    supplier_id: string;
    expected_date: string;
    notes: string;
    items: Array<{
      inventory_item_id: string;
      ordered_quantity: string;
      unit: string;
      unit_cost: string;
    }>;
  }>({
    supplier_id: "",
    expected_date: "",
    notes: "",
    items: [],
  });
  const [savingPO, setSavingPO] = useState(false);
  const [poError, setPOError] = useState<string | null>(null);

  // Purchase Order Detail Modal
  const [viewPODetail, setViewPODetail] = useState<PurchaseOrderDetail | null>(null);

  // Receive Stock Modal
  const [receivingPO, setReceivingPO] = useState<PurchaseOrderDetail | null>(null);
  const [receiveInputs, setReceiveInputs] = useState<Record<string, string>>({});
  const [submittingReceive, setSubmittingReceive] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Load overall data
  const loadData = useCallback(async () => {
    setLoading(true);
    const restaurantId = await getActiveRestaurantId();
    if (!restaurantId) {
      setSuppliers([]);
      setPurchaseOrders([]);
      setInventoryItems([]);
      setLoading(false);
      return;
    }

    const [supRes, poRes, invRes] = await Promise.all([
      getSuppliers(),
      getPurchaseOrders(),
      supabase
        .from("inventory_items")
        .select("id, name, sku, category, unit, quantity, cost_per_unit, is_active")
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true }),
    ]);

    if (supRes.ok) setSuppliers(supRes.suppliers as Supplier[]);
    if (poRes.ok) setPurchaseOrders((poRes.purchaseOrders as unknown) as PurchaseOrderDetail[]);
    if (invRes.data) setInventoryItems(invRes.data as InventoryItem[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Realtime subscriptions
    const ch = supabase
      .channel("purchasing-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_order_items" }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, loadData]);

  // Handle URL query parameters for Low Stock integration (?action=new_po&inventory_item_id=XXX)
  useEffect(() => {
    const action = searchParams.get("action");
    const itemId = searchParams.get("inventory_item_id");

    if (action === "new_po" && inventoryItems.length > 0) {
      const targetItem = inventoryItems.find((i) => i.id === itemId);
      openAddPOModal(targetItem);
    }
  }, [searchParams, inventoryItems]);

  // Derived filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = supplierSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q));

      let matchStatus = true;
      if (supplierStatusFilter === "active") matchStatus = s.is_active;
      if (supplierStatusFilter === "inactive") matchStatus = !s.is_active;

      return matchSearch && matchStatus;
    });
  }, [suppliers, supplierSearch, supplierStatusFilter]);

  // Derived filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = poSearch.toLowerCase().trim();
      const poNumStr = `PO-${po.po_number}`;
      const supName = po.suppliers?.name || "";

      const matchSearch =
        !q ||
        poNumStr.toLowerCase().includes(q) ||
        String(po.po_number).includes(q) ||
        supName.toLowerCase().includes(q) ||
        (po.notes && po.notes.toLowerCase().includes(q));

      let matchStatus = true;
      if (poStatusFilter !== "all") matchStatus = po.status === poStatusFilter;

      let matchSupplier = true;
      if (poSupplierFilter !== "all") matchSupplier = po.supplier_id === poSupplierFilter;

      return matchSearch && matchStatus && matchSupplier;
    });
  }, [purchaseOrders, poSearch, poStatusFilter, poSupplierFilter]);

  // --- Supplier Modal Handlers ---
  function openAddSupplierModal() {
    setEditingSupplier(null);
    setSupplierForm({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      is_active: true,
    });
    setSupplierError(null);
    setShowSupplierModal(true);
  }

  function openEditSupplierModal(s: Supplier) {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      contact_person: s.contact_person || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || "",
      is_active: s.is_active,
    });
    setSupplierError(null);
    setShowSupplierModal(true);
  }

  async function handleSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (savingSupplier) return;
    setSupplierError(null);

    const name = supplierForm.name.trim();
    if (!name) {
      setSupplierError("Supplier name is required.");
      return;
    }

    setSavingSupplier(true);
    const res = await saveSupplierAction({
      id: editingSupplier?.id,
      name,
      contact_person: supplierForm.contact_person,
      phone: supplierForm.phone,
      email: supplierForm.email,
      address: supplierForm.address,
      notes: supplierForm.notes,
      is_active: supplierForm.is_active,
    });
    setSavingSupplier(false);

    if (res.ok) {
      setShowSupplierModal(false);
      loadData();
    } else {
      setSupplierError(res.error || "Failed to save supplier");
    }
  }

  async function handleToggleSupplierActive(supplierId: string, currentActive: boolean) {
    const res = await toggleSupplierActiveAction(supplierId, !currentActive);
    if (res.ok) {
      loadData();
    } else {
      alert(res.error);
    }
  }

  // --- Purchase Order Modal Handlers ---
  function openAddPOModal(preselectItem?: InventoryItem) {
    setEditingPO(null);
    const activeSups = suppliers.filter((s) => s.is_active);
    const defaultSupId = activeSups.length > 0 ? activeSups[0].id : "";

    const initialItems = preselectItem
      ? [
          {
            inventory_item_id: preselectItem.id,
            ordered_quantity: "10",
            unit: preselectItem.unit,
            unit_cost: String(preselectItem.cost_per_unit || "0"),
          },
        ]
      : [];

    setPOForm({
      supplier_id: defaultSupId,
      expected_date: "",
      notes: "",
      items: initialItems,
    });
    setPOError(null);
    setShowPOModal(true);
  }

  function openEditPOModal(po: PurchaseOrderDetail) {
    if (po.status !== "draft") {
      alert("Only draft purchase orders can be edited.");
      return;
    }
    setEditingPO(po);
    setPOForm({
      supplier_id: po.supplier_id,
      expected_date: po.expected_date ? po.expected_date.split("T")[0] : "",
      notes: po.notes || "",
      items: (po.purchase_order_items || []).map((it) => ({
        inventory_item_id: it.inventory_item_id,
        ordered_quantity: String(it.ordered_quantity),
        unit: it.unit,
        unit_cost: String(it.unit_cost),
      })),
    });
    setPOError(null);
    setShowPOModal(true);
  }

  function addPOLineItem() {
    const activeInv = inventoryItems.filter((i) => i.is_active);
    if (activeInv.length === 0) return;

    // Pick first item not already in list
    const usedIds = new Set(poForm.items.map((i) => i.inventory_item_id));
    const nextItem = activeInv.find((i) => !usedIds.has(i.id)) || activeInv[0];

    setPOForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventory_item_id: nextItem.id,
          ordered_quantity: "10",
          unit: nextItem.unit,
          unit_cost: String(nextItem.cost_per_unit || "0"),
        },
      ],
    }));
  }

  function removePOLineItem(index: number) {
    setPOForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function updatePOLineItem(index: number, field: string, value: string) {
    setPOForm((prev) => {
      const newItems = [...prev.items];
      const target = { ...newItems[index], [field]: value };

      if (field === "inventory_item_id") {
        const itemObj = inventoryItems.find((i) => i.id === value);
        if (itemObj) {
          target.unit = itemObj.unit;
          target.unit_cost = String(itemObj.cost_per_unit || "0");
        }
      }

      newItems[index] = target;
      return { ...prev, items: newItems };
    });
  }

  async function handlePOSubmit(targetStatus: "draft" | "ordered") {
    if (savingPO) return;
    setPOError(null);

    if (!poForm.supplier_id) {
      setPOError("Please select a supplier.");
      return;
    }

    if (poForm.items.length === 0) {
      setPOError("Purchase order must contain at least one line item.");
      return;
    }

    // Validate line items client side
    for (let i = 0; i < poForm.items.length; i++) {
      const it = poForm.items[i];
      const qty = Number(it.ordered_quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setPOError(`Item #${i + 1}: Ordered quantity must be greater than zero.`);
        return;
      }
      const cost = Number(it.unit_cost);
      if (!Number.isFinite(cost) || cost < 0) {
        setPOError(`Item #${i + 1}: Unit cost cannot be negative.`);
        return;
      }
    }

    setSavingPO(true);
    const res = await savePurchaseOrderAction({
      id: editingPO?.id,
      supplier_id: poForm.supplier_id,
      expected_date: poForm.expected_date || null,
      notes: poForm.notes,
      status: targetStatus,
      items: poForm.items.map((it) => ({
        inventory_item_id: it.inventory_item_id,
        ordered_quantity: Number(it.ordered_quantity),
        unit: it.unit,
        unit_cost: Number(it.unit_cost),
      })),
    });
    setSavingPO(false);

    if (res.ok) {
      setShowPOModal(false);
      loadData();
    } else {
      setPOError(res.error || "Failed to save purchase order");
    }
  }

  async function handleUpdatePOStatus(poId: string, newStatus: "ordered" | "cancelled") {
    if (!confirm(`Are you sure you want to change PO status to '${newStatus}'?`)) return;

    const res = await updatePOStatusAction(poId, newStatus);
    if (res.ok) {
      if (viewPODetail?.id === poId) {
        setViewPODetail(null);
      }
      loadData();
    } else {
      alert(res.error);
    }
  }

  // --- Receive Stock Modal Handlers ---
  function openReceiveModal(po: PurchaseOrderDetail) {
    setReceivingPO(po);
    const initialInputs: Record<string, string> = {};

    (po.purchase_order_items || []).forEach((it) => {
      const remaining = Number(it.ordered_quantity) - Number(it.received_quantity);
      if (remaining > 0) {
        initialInputs[it.id] = String(remaining);
      }
    });

    setReceiveInputs(initialInputs);
    setReceiveError(null);
  }

  async function handleReceiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receivingPO || submittingReceive) return;
    setReceiveError(null);

    const itemsToReceive: Array<{ po_item_id: string; receive_qty: number }> = [];

    for (const [poItemId, qtyStr] of Object.entries(receiveInputs)) {
      const qty = Number(qtyStr);
      if (qtyStr.trim() !== "" && !isNaN(qty) && qty > 0) {
        // Validate against remaining
        const lineItem = receivingPO.purchase_order_items?.find((i) => i.id === poItemId);
        if (lineItem) {
          const remaining = Number(lineItem.ordered_quantity) - Number(lineItem.received_quantity);
          if (qty > remaining + 0.0001) {
            setReceiveError(
              `Cannot receive ${qty} ${lineItem.unit} for ${
                lineItem.inventory_items?.name || "item"
              }. Max receivable remaining is ${remaining} ${lineItem.unit}.`
            );
            return;
          }
          itemsToReceive.push({ po_item_id: poItemId, receive_qty: qty });
        }
      }
    }

    if (itemsToReceive.length === 0) {
      setReceiveError("Please enter a valid receive quantity greater than 0 for at least one item.");
      return;
    }

    setSubmittingReceive(true);
    const res = await receivePOSourceStockAction(receivingPO.id, itemsToReceive);
    setSubmittingReceive(false);

    if (res.ok) {
      setReceivingPO(null);
      if (viewPODetail?.id === receivingPO.id) {
        setViewPODetail(null);
      }
      loadData();
    } else {
      setReceiveError(res.error);
    }
  }

  // Calculations for PO modal summary
  const poModalSubtotal = useMemo(() => {
    return poForm.items.reduce((acc, curr) => {
      const q = Number(curr.ordered_quantity) || 0;
      const c = Number(curr.unit_cost) || 0;
      return acc + q * c;
    }, 0);
  }, [poForm.items]);

  // Status badge helper
  function getPOStatusBadge(status: POStatus) {
    switch (status) {
      case "draft":
        return { label: "Draft", bg: "bg-neutral-100 text-neutral-700 border-neutral-300" };
      case "ordered":
        return { label: "Ordered", bg: "bg-blue-50 text-blue-800 border-blue-300 font-semibold" };
      case "partially_received":
        return { label: "Partially Received", bg: "bg-amber-50 text-amber-800 border-amber-300 font-semibold" };
      case "received":
        return { label: "Received", bg: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" };
      case "cancelled":
        return { label: "Cancelled", bg: "bg-red-50 text-red-700 border-red-300" };
      default:
        return { label: status, bg: "bg-neutral-100 text-neutral-700 border-neutral-300" };
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink flex items-center gap-2.5">
            <Truck className="text-wine" size={28} /> Suppliers & Purchasing
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Manage vendor relations, issue purchase orders, and receive inventory stock safely
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openAddPOModal()}
            className="btn-wine text-xs py-2 px-4 shadow-xs flex items-center gap-1.5"
          >
            <Plus size={16} /> New Purchase Order
          </button>
          <button
            onClick={openAddSupplierModal}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Building2 size={15} /> Add Supplier
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-cream2 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("orders")}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "orders" ? "bg-wine text-white shadow-xs" : "text-neutral-600 hover:bg-cream"
            }`}
          >
            <ShoppingCart size={14} /> Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "suppliers" ? "bg-wine text-white shadow-xs" : "text-neutral-600 hover:bg-cream"
            }`}
          >
            <Building2 size={14} /> Suppliers ({suppliers.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-neutral-400" size={16} />
                <input
                  type="text"
                  value={poSearch}
                  onChange={(e) => setPOSearch(e.target.value)}
                  placeholder="Search PO #, supplier name, notes..."
                  className="field text-xs pl-9 pr-8 py-2"
                />
                {poSearch && (
                  <button
                    onClick={() => setPOSearch("")}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status & Supplier Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-neutral-500 font-medium">Status:</span>
                  <select
                    value={poStatusFilter}
                    onChange={(e) => setPOStatusFilter(e.target.value as typeof poStatusFilter)}
                    className="field py-1.5 text-xs w-36"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="ordered">Ordered</option>
                    <option value="partially_received">Partially Received</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-neutral-500 font-medium">Supplier:</span>
                  <select
                    value={poSupplierFilter}
                    onChange={(e) => setPOSupplierFilter(e.target.value)}
                    className="field py-1.5 text-xs w-40"
                  >
                    <option value="all">All Suppliers</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* PO Table */}
          {loading && purchaseOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
              <Loader2 className="animate-spin text-gold" size={28} />
              <span className="text-sm font-medium">Loading purchase orders…</span>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-cream2 space-y-3">
              <ShoppingCart size={36} className="mx-auto text-neutral-300" />
              <h3 className="font-serif text-lg font-semibold text-ink">No purchase orders found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {poSearch || poStatusFilter !== "all" || poSupplierFilter !== "all"
                  ? "Try clearing search or filters to see all purchase orders."
                  : "Create your first purchase order to begin purchasing stock from suppliers."}
              </p>
              <button onClick={() => openAddPOModal()} className="btn-wine text-xs py-2 px-4 mx-auto">
                <Plus size={14} /> New Purchase Order
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-cream2 shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-cream/40 text-neutral-500 border-b border-cream2 uppercase font-semibold">
                    <th className="py-3 px-4">PO #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Expected Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Total Value</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream2">
                  {filteredPOs.map((po) => {
                    const badge = getPOStatusBadge(po.status);
                    const canReceive = po.status === "ordered" || po.status === "partially_received";
                    const canEdit = po.status === "draft";
                    const canCancel = po.status === "draft" || po.status === "ordered";

                    return (
                      <tr key={po.id} className="hover:bg-cream/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sm text-ink">
                          PO-{po.po_number}
                        </td>
                        <td className="py-3 px-4 font-semibold text-ink">
                          {po.suppliers?.name || "Unknown Supplier"}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 font-mono">
                          {new Date(po.order_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 font-mono">
                          {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-wine text-sm">
                          ₹{Number(po.total).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewPODetail(po)}
                              className="px-2.5 py-1 text-[11px] text-neutral-600 hover:text-wine bg-cream/50 hover:bg-cream rounded-lg border border-cream2 transition-colors flex items-center gap-1 whitespace-nowrap"
                            >
                              <Eye size={13} /> View
                            </button>

                            {canEdit && (
                              <button
                                onClick={() => openEditPOModal(po)}
                                className="px-2.5 py-1 text-[11px] text-neutral-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 font-semibold transition-colors whitespace-nowrap"
                              >
                                <Edit2 size={12} className="inline mr-1" /> Edit
                              </button>
                            )}

                            {canReceive && (
                              <button
                                onClick={() => openReceiveModal(po)}
                                className="px-2.5 py-1 text-[11px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 font-bold transition-colors whitespace-nowrap"
                              >
                                <PackageCheck size={13} className="inline mr-1" /> Receive Stock
                              </button>
                            )}

                            {canCancel && (
                              <button
                                onClick={() => handleUpdatePOStatus(po.id, "cancelled")}
                                className="px-2 py-1 text-[11px] text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                                title="Cancel Purchase Order"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-cream2 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-neutral-400" size={16} />
                <input
                  type="text"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  placeholder="Search supplier name, contact, phone, email..."
                  className="field text-xs pl-9 pr-8 py-2"
                />
                {supplierSearch && (
                  <button
                    onClick={() => setSupplierSearch("")}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-neutral-500 font-medium">Status:</span>
                <select
                  value={supplierStatusFilter}
                  onChange={(e) => setSupplierStatusFilter(e.target.value as typeof supplierStatusFilter)}
                  className="field py-1.5 text-xs w-36"
                >
                  <option value="all">All Suppliers</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Suppliers Table */}
          {loading && suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
              <Loader2 className="animate-spin text-gold" size={28} />
              <span className="text-sm font-medium">Loading suppliers…</span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-cream2 space-y-3">
              <Building2 size={36} className="mx-auto text-neutral-300" />
              <h3 className="font-serif text-lg font-semibold text-ink">No suppliers found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {supplierSearch || supplierStatusFilter !== "all"
                  ? "Try adjusting your search query or status filter."
                  : "Add vendor suppliers to begin creating purchase orders."}
              </p>
              <button onClick={openAddSupplierModal} className="btn-wine text-xs py-2 px-4 mx-auto">
                <Plus size={14} /> Add Supplier
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-cream2 shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-cream/40 text-neutral-500 border-b border-cream2 uppercase font-semibold">
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream2">
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-cream/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        <div>{s.name}</div>
                        {s.address && <div className="text-[10px] text-neutral-400 font-mono truncate max-w-xs">{s.address}</div>}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{s.contact_person || "—"}</td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{s.phone || "—"}</td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{s.email || "—"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border ${
                            s.is_active
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-neutral-100 text-neutral-500 border-neutral-300"
                          }`}
                        >
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewSupplierDetail(s)}
                            className="px-2.5 py-1 text-[11px] text-neutral-600 hover:text-wine bg-cream/50 hover:bg-cream rounded-lg border border-cream2 transition-colors flex items-center gap-1"
                          >
                            <Eye size={12} /> View History
                          </button>
                          <button
                            onClick={() => openEditSupplierModal(s)}
                            className="px-2.5 py-1 text-[11px] text-neutral-700 bg-cream/50 hover:bg-cream rounded-lg border border-cream2 font-semibold transition-colors"
                          >
                            <Edit2 size={12} className="inline mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => handleToggleSupplierActive(s.id, s.is_active)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                              s.is_active
                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            }`}
                          >
                            {s.is_active ? "Deactivate" : "Activate"}
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
      )}

      {/* MODAL 1: ADD / EDIT SUPPLIER */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-cream2 space-y-5">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <h3 className="font-serif font-bold text-xl text-ink flex items-center gap-2">
                <Building2 className="text-wine" size={22} />
                {editingSupplier ? "Edit Supplier" : "Add Supplier"}
              </h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="text-neutral-400 hover:text-ink p-1"
              >
                <X size={20} />
              </button>
            </div>

            {supplierError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs font-semibold">
                {supplierError}
              </div>
            )}

            <form onSubmit={handleSupplierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Metro Wholesale Foods"
                  className="field w-full text-xs py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="field w-full text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="field w-full text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Email Address</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="e.g. sales@metrowholesale.com"
                  className="field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Physical Address</label>
                <textarea
                  rows={2}
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="e.g. Plot 42, Food Park Industrial Estate, Bengaluru"
                  className="field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  placeholder="e.g. Net 30 payment terms, Thursday delivery schedule"
                  className="field w-full text-xs py-2"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="supplier_active_chk"
                  checked={supplierForm.is_active}
                  onChange={(e) => setSupplierForm({ ...supplierForm, is_active: e.target.checked })}
                  className="rounded border-cream2 text-wine focus:ring-wine"
                />
                <label htmlFor="supplier_active_chk" className="font-semibold text-ink cursor-pointer">
                  Supplier is active for new purchase orders
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="btn-outline py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="btn-wine py-2 px-5 text-xs shadow-xs"
                >
                  {savingSupplier ? "Saving..." : editingSupplier ? "Update Supplier" : "Create Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT PURCHASE ORDER */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-cream2 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <h3 className="font-serif font-bold text-xl text-ink flex items-center gap-2">
                <ShoppingCart className="text-wine" size={22} />
                {editingPO ? `Edit Draft PO-${editingPO.po_number}` : "Create Purchase Order"}
              </h3>
              <button onClick={() => setShowPOModal(false)} className="text-neutral-400 hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            {poError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs font-semibold">
                {poError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Top fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={poForm.supplier_id}
                    onChange={(e) => setPOForm({ ...poForm, supplier_id: e.target.value })}
                    className="field w-full text-xs py-2"
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers
                      .filter((s) => s.is_active || s.id === poForm.supplier_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {!s.is_active ? "(Inactive)" : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poForm.expected_date}
                    onChange={(e) => setPOForm({ ...poForm, expected_date: e.target.value })}
                    className="field w-full text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Order Notes</label>
                <input
                  type="text"
                  value={poForm.notes}
                  onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
                  placeholder="e.g. Urgent delivery needed for weekend buffet"
                  className="field w-full text-xs py-2"
                />
              </div>

              {/* Line Items Table */}
              <div className="border border-cream2 rounded-xl p-4 bg-cream/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-ink text-sm flex items-center gap-1.5">
                    <Boxes size={16} className="text-wine" /> Line Items ({poForm.items.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addPOLineItem}
                    className="btn-wine py-1.5 px-3 text-[11px] shadow-xs flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                {poForm.items.length === 0 ? (
                  <p className="text-neutral-400 py-6 text-center text-xs">
                    No line items added yet. Click &quot;Add Line Item&quot; to begin.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {poForm.items.map((item, idx) => {
                      const lineTotal =
                        (Number(item.ordered_quantity) || 0) * (Number(item.unit_cost) || 0);

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-cream2 grid sm:grid-cols-12 gap-2 items-center"
                        >
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-0.5">
                              Inventory Item
                            </label>
                            <select
                              value={item.inventory_item_id}
                              onChange={(e) => updatePOLineItem(idx, "inventory_item_id", e.target.value)}
                              className="field w-full text-xs py-1.5"
                            >
                              {inventoryItems
                                .filter((i) => i.is_active || i.id === item.inventory_item_id)
                                .map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.name} ({i.unit})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-0.5">
                              Qty ({item.unit})
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              value={item.ordered_quantity}
                              onChange={(e) => updatePOLineItem(idx, "ordered_quantity", e.target.value)}
                              className="field w-full text-xs py-1.5 text-right font-mono"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-0.5">
                              Unit Cost (₹)
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.unit_cost}
                              onChange={(e) => updatePOLineItem(idx, "unit_cost", e.target.value)}
                              className="field w-full text-xs py-1.5 text-right font-mono"
                            />
                          </div>

                          <div className="sm:col-span-2 text-right">
                            <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-0.5">
                              Line Total
                            </label>
                            <span className="font-mono font-bold text-sm text-wine block py-1.5">
                              ₹{lineTotal.toFixed(2)}
                            </span>
                          </div>

                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => removePOLineItem(idx)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Line Item"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subtotal Summary */}
                <div className="pt-2 border-t border-cream2 flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-600">Calculated PO Subtotal:</span>
                  <span className="font-mono text-base font-bold text-wine">
                    ₹{poModalSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="btn-outline py-2 px-4 text-xs"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingPO}
                    onClick={() => handlePOSubmit("draft")}
                    className="btn-outline py-2 px-4 text-xs font-semibold"
                  >
                    {savingPO ? "Saving..." : "Save as Draft"}
                  </button>
                  <button
                    type="button"
                    disabled={savingPO}
                    onClick={() => handlePOSubmit("ordered")}
                    className="btn-wine py-2 px-5 text-xs shadow-xs font-bold"
                  >
                    {savingPO ? "Saving..." : "Save & Place Order"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW PO DETAIL */}
      {viewPODetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-cream2 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h3 className="font-serif font-bold text-xl text-ink flex items-center gap-2">
                  <ShoppingCart className="text-wine" size={22} />
                  Purchase Order PO-{viewPODetail.po_number}
                </h3>
                <span
                  className={`inline-block mt-1 text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border ${
                    getPOStatusBadge(viewPODetail.status).bg
                  }`}
                >
                  {getPOStatusBadge(viewPODetail.status).label}
                </span>
              </div>
              <button onClick={() => setViewPODetail(null)} className="text-neutral-400 hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            {/* Header Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-cream/20 p-4 rounded-xl border border-cream2 text-xs">
              <div>
                <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Supplier</span>
                <span className="font-bold text-ink">{viewPODetail.suppliers?.name || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Order Date</span>
                <span className="font-mono text-ink">{new Date(viewPODetail.order_date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Expected Date</span>
                <span className="font-mono text-ink">
                  {viewPODetail.expected_date ? new Date(viewPODetail.expected_date).toLocaleDateString() : "—"}
                </span>
              </div>
              {viewPODetail.notes && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Notes</span>
                  <span className="text-neutral-700">{viewPODetail.notes}</span>
                </div>
              )}
            </div>

            {/* PO Line Items Table */}
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-ink text-sm">Ordered Items</h4>
              <div className="border border-cream2 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-cream/40 text-neutral-500 border-b border-cream2 uppercase font-semibold">
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 font-right text-right">Ordered Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      <th className="py-2.5 px-3 text-right">Received Qty</th>
                      <th className="py-2.5 px-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream2 font-mono">
                    {(viewPODetail.purchase_order_items || []).map((it) => {
                      const ordered = Number(it.ordered_quantity);
                      const received = Number(it.received_quantity);
                      const remaining = Math.max(0, ordered - received);

                      return (
                        <tr key={it.id}>
                          <td className="py-2.5 px-3 font-sans font-semibold text-ink">
                            {it.inventory_items?.name || "Ingredient"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {ordered} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right">₹{Number(it.unit_cost).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-wine">
                            ₹{Number(it.line_total).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            {received} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                            {remaining} {it.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-cream2">
              <span className="font-serif font-bold text-sm text-ink">Total Order Amount:</span>
              <span className="font-mono text-xl font-bold text-wine">
                ₹{Number(viewPODetail.total).toFixed(2)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream2">
              <button
                type="button"
                onClick={() => setViewPODetail(null)}
                className="btn-outline py-2 px-4 text-xs"
              >
                Close
              </button>

              {(viewPODetail.status === "ordered" || viewPODetail.status === "partially_received") && (
                <button
                  type="button"
                  onClick={() => {
                    openReceiveModal(viewPODetail);
                  }}
                  className="btn-wine py-2 px-5 text-xs shadow-xs font-bold flex items-center gap-1.5"
                >
                  <PackageCheck size={14} /> Receive Incoming Stock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECEIVE STOCK WORKFLOW */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-cream2 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h3 className="font-serif font-bold text-xl text-ink flex items-center gap-2">
                  <PackageCheck className="text-emerald-600" size={22} /> Receive Stock — PO-{receivingPO.po_number}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Supplier: <b>{receivingPO.suppliers?.name}</b>
                </p>
              </div>
              <button onClick={() => setReceivingPO(null)} className="text-neutral-400 hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            {receiveError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs font-semibold">
                {receiveError}
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
              <p className="text-neutral-600">
                Specify the exact quantities received in this shipment batch. Inventory quantities and weighted average cost per unit will update automatically upon confirmation.
              </p>

              <div className="border border-cream2 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-cream/40 text-neutral-500 border-b border-cream2 uppercase font-semibold">
                      <th className="py-2.5 px-3">Ingredient</th>
                      <th className="py-2.5 px-3 text-right">Ordered</th>
                      <th className="py-2.5 px-3 text-right">Received</th>
                      <th className="py-2.5 px-3 text-right">Remaining</th>
                      <th className="py-2.5 px-3 text-right w-32">Receive Now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream2">
                    {(receivingPO.purchase_order_items || []).map((it) => {
                      const ordered = Number(it.ordered_quantity);
                      const received = Number(it.received_quantity);
                      const remaining = Math.max(0, ordered - received);

                      return (
                        <tr key={it.id}>
                          <td className="py-2.5 px-3 font-semibold text-ink">
                            {it.inventory_items?.name || "Ingredient"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                            {ordered} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                            {received} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-bold">
                            {remaining} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {remaining <= 0 ? (
                              <span className="text-[10px] uppercase font-mono text-emerald-700 font-bold">
                                Complete
                              </span>
                            ) : (
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max={remaining}
                                value={receiveInputs[it.id] || ""}
                                onChange={(e) =>
                                  setReceiveInputs({ ...receiveInputs, [it.id]: e.target.value })
                                }
                                placeholder="0"
                                className="field text-xs py-1 px-2 text-right font-mono w-24 border-emerald-300 focus:border-emerald-600"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" /> Atomic Transaction Protocol
                </div>
                <div>
                  Receiving stock locks rows atomically, updates inventory stock, recalculates weighted average unit cost, creates an immutable IN stock movement, and updates the PO status.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setReceivingPO(null)}
                  className="btn-outline py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReceive}
                  className="btn-wine bg-emerald-700 hover:bg-emerald-800 py-2 px-5 text-xs shadow-xs font-bold flex items-center gap-1.5"
                >
                  {submittingReceive ? "Receiving..." : "Confirm & Receive Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: VIEW SUPPLIER HISTORY DETAIL */}
      {viewSupplierDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-cream2 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-cream2 pb-3">
              <div>
                <h3 className="font-serif font-bold text-xl text-ink flex items-center gap-2">
                  <Building2 className="text-wine" size={22} />
                  {viewSupplierDetail.name}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Contact: {viewSupplierDetail.contact_person || "N/A"} · {viewSupplierDetail.phone || "No phone"} · {viewSupplierDetail.email || "No email"}
                </p>
              </div>
              <button onClick={() => setViewSupplierDetail(null)} className="text-neutral-400 hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            {/* Supplier Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-cream/30 p-3 rounded-xl border border-cream2 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-neutral-400">Total Purchase Orders</span>
                <div className="font-serif text-2xl font-bold text-ink">
                  {purchaseOrders.filter((po) => po.supplier_id === viewSupplierDetail.id).length}
                </div>
              </div>
              <div className="bg-cream/30 p-3 rounded-xl border border-cream2 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-neutral-400">Total Value Purchased</span>
                <div className="font-serif text-2xl font-bold text-wine">
                  ₹
                  {purchaseOrders
                    .filter((po) => po.supplier_id === viewSupplierDetail.id && po.status !== "cancelled")
                    .reduce((acc, po) => acc + Number(po.total), 0)
                    .toFixed(2)}
                </div>
              </div>
              <div className="bg-cream/30 p-3 rounded-xl border border-cream2 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-neutral-400">Open POs</span>
                <div className="font-serif text-2xl font-bold text-blue-700">
                  {
                    purchaseOrders.filter(
                      (po) =>
                        po.supplier_id === viewSupplierDetail.id &&
                        (po.status === "ordered" || po.status === "partially_received")
                    ).length
                  }
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-ink text-sm">Purchase History</h4>
              <div className="border border-cream2 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-cream/40 text-neutral-500 border-b border-cream2 uppercase font-semibold">
                      <th className="py-2.5 px-3">PO #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream2 font-mono">
                    {purchaseOrders
                      .filter((po) => po.supplier_id === viewSupplierDetail.id)
                      .map((po) => (
                        <tr key={po.id}>
                          <td className="py-2.5 px-3 font-bold text-ink">PO-{po.po_number}</td>
                          <td className="py-2.5 px-3 text-neutral-600">
                            {new Date(po.order_date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                                getPOStatusBadge(po.status).bg
                              }`}
                            >
                              {getPOStatusBadge(po.status).label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-wine">
                            ₹{Number(po.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-cream2">
              <button
                type="button"
                onClick={() => setViewSupplierDetail(null)}
                className="btn-outline py-2 px-4 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
