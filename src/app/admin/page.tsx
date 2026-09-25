import { createClient } from "@/lib/supabase/server";
import { getActiveRestaurant } from "@/lib/tenant";
import { getOnlineOrdersAdminAction, getSuppliers, getPurchaseOrders } from "@/actions/admin";
import OwnerDashboard from "@/components/admin/dashboards/OwnerDashboard";
import ManagerDashboard from "@/components/admin/dashboards/ManagerDashboard";
import StaffDashboard from "@/components/admin/dashboards/StaffDashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const active = await getActiveRestaurant();
  if (!active) return null;

  const restaurantId = active.restaurant_id;
  const role = active.role;

  // Execute tenant-scoped queries concurrently
  const [
    ordersRes,
    onlineRes,
    resvRes,
    invRes,
    serviceRes,
    membershipsRes,
    reviewsRes,
    tablesRes,
    poRes,
  ] = await Promise.all([
    supabase
      .from("session_orders")
      .select("*, dining_sessions(customer_name, phone)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    getOnlineOrdersAdminAction(),
    supabase
      .from("reservations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory_items")
      .select("id, name, quantity, unit, min_reorder_level, is_active")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true }),
    supabase
      .from("service_requests")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("restaurant_memberships")
      .select("id, role, status, user_id")
      .eq("restaurant_id", restaurantId)
      .eq("status", "active"),
    supabase
      .from("dish_ratings")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("restaurant_tables")
      .select("id, table_number, capacity, status")
      .eq("restaurant_id", restaurantId)
      .order("table_number", { ascending: true }),
    (role === "owner" || role === "manager") ? getPurchaseOrders() : Promise.resolve({ ok: true, purchaseOrders: [] }),
  ]);

  const orders = ordersRes.data ?? [];
  const marketplaceOrders = onlineRes.ok ? onlineRes.data : [];
  const reservations = resvRes.data ?? [];
  const inventoryItems = invRes.data ?? [];
  const serviceRequests = serviceRes.data ?? [];
  const memberships = membershipsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const tables = tablesRes.data ?? [];
  const purchaseOrders = poRes.ok ? (poRes.purchaseOrders as any[]) : [];

  const restaurantName = active.restaurant?.name || "Lumière Bistro";

  if (role === "owner") {
    return (
      <OwnerDashboard
        restaurantName={restaurantName}
        orders={orders}
        marketplaceOrders={marketplaceOrders}
        reservations={reservations}
        inventoryItems={inventoryItems}
        serviceRequests={serviceRequests}
        memberships={memberships}
        reviews={reviews}
        tables={tables}
        purchaseOrders={purchaseOrders}
      />
    );
  }

  if (role === "manager") {
    return (
      <ManagerDashboard
        restaurantName={restaurantName}
        orders={orders}
        marketplaceOrders={marketplaceOrders}
        reservations={reservations}
        inventoryItems={inventoryItems}
        serviceRequests={serviceRequests}
        memberships={memberships}
        reviews={reviews}
        tables={tables}
      />
    );
  }

  // Fallback to task-oriented Staff Workspace
  return (
    <StaffDashboard
      restaurantName={restaurantName}
      orders={orders}
      reservations={reservations}
      serviceRequests={serviceRequests}
      tables={tables}
    />
  );
}
