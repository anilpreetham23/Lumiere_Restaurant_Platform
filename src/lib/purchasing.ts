export type Supplier = {
  id: string;
  restaurant_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SaveSupplierInput = {
  id?: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type POStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

export type PurchaseOrderItemDetail = {
  id: string;
  restaurant_id: string;
  po_id: string;
  inventory_item_id: string;
  ordered_quantity: number;
  received_quantity: number;
  unit: string;
  unit_cost: number;
  line_total: number;
  created_at: string;
  updated_at: string;
  inventory_items?: {
    id: string;
    name: string;
    sku: string | null;
    category: string;
    unit: string;
    quantity: number;
    cost_per_unit: number;
  } | null;
};

export type PurchaseOrderDetail = {
  id: string;
  restaurant_id: string;
  po_number: number;
  supplier_id: string;
  status: POStatus;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: {
    id: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  purchase_order_items?: PurchaseOrderItemDetail[];
};

export type CreatePOItemInput = {
  inventory_item_id: string;
  ordered_quantity: number;
  unit: string;
  unit_cost: number;
};

export type CreatePOInput = {
  id?: string;
  supplier_id: string;
  expected_date?: string | null;
  notes?: string | null;
  items: CreatePOItemInput[];
  status?: "draft" | "ordered";
};

export type ReceivePOItemInput = {
  po_item_id: string;
  receive_qty: number;
};
