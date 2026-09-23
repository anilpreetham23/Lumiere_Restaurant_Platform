// Shared types + helpers for the QR table-ordering flow.
// All customer writes go through the SECURITY DEFINER rpcs (price-safe).

export type MenuItem = {
  id: string;
  title: string;
  cuisine: string;
  price: number;
  image: string;
  short: string;
  description: string;
  tags: string[];
  badge: string | null;
  rating: number;
  reviews: number;
  prep_minutes: number;
  available: boolean;
  sort: number;
  wine_pairing?: string | null;
  origin?: string | null;
  dietary?: string[] | null;
  spice?: number | null;
};

export type OrderLine = {
  menu_item_id: string;
  title: string;
  price: number;
  qty: number;
  notes?: string | null;
};

export type OrderSource = "dine_in" | "takeaway" | "delivery" | "pos_manual" | "swiggy" | "zomato";

export type SessionOrder = {
  id: string;
  created_at: string;
  restaurant_id?: string;
  session_id: string;
  order_number: number;
  items: OrderLine[];
  amount: number;
  subtotal: number;
  discount: number;
  tax: number;
  service_charge: number;
  total: number;
  notes: string | null;
  kind: string;
  source: OrderSource;
  status: "placed" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  target_prep_mins?: number | null;
};

export type DiningSession = {
  id: string;
  created_at: string;
  table_id: string;
  customer_name: string | null;
  phone: string | null;
  guests: number;
  status: "open" | "bill_pending" | "paid" | "closed";
  payment_method: string | null;
  payment_status: "unpaid" | "paid";
  tip: number;
  receipt_code: string | null;
};

export type TableInfo = { id: string; label: string; seats: number; state: string };

export type SessionSnapshot = {
  restaurant_id?: string;
  table: TableInfo;
  session: DiningSession | null;
  orders: SessionOrder[];
  requests?: { id: string; type: string; status: string }[];
} | null;

export const ORDER_STEPS = ["placed", "accepted", "preparing", "ready", "served"] as const;

export const STATUS_LABEL: Record<string, string> = {
  placed: "Order received",
  accepted: "Confirmed by kitchen",
  preparing: "Being prepared",
  ready: "Ready to serve",
  served: "Served",
  cancelled: "Cancelled",
};

export function sessionTotal(orders: SessionOrder[]): number {
  return orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total ?? o.amount), 0);
}

export type StaffOrderItemInput = {
  menu_item_id: string;
  qty: number;
  notes?: string;
};

export type CreateStaffOrderInput = {
  table_id: string;
  items: StaffOrderItemInput[];
  customer_name?: string;
  phone?: string;
  notes?: string;
  source?: OrderSource;
};
