import { redirect } from "next/navigation";
import { getActiveRestaurant, requireRole } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "@/components/admin/ReportsClient";

export const metadata = {
  title: "Reports & Analytics | Lumière Admin",
  description: "Comprehensive sales analytics, item bestseller reports, calendar duration filters, and revenue diagrams.",
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) {
    redirect("/admin");
  }

  const active = await getActiveRestaurant();
  if (!active) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [ordersRes, menuRes, reservationsRes, reviewsRes] = await Promise.all([
    supabase
      .from("session_orders")
      .select("id, restaurant_id, order_number, source, status, items, total, amount, subtotal, created_at")
      .eq("restaurant_id", active.restaurant_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("menu_items")
      .select("id, title, price, cuisine, image, short")
      .eq("restaurant_id", active.restaurant_id),
    supabase
      .from("reservations")
      .select("id")
      .eq("restaurant_id", active.restaurant_id),
    supabase
      .from("customer_reviews")
      .select("rating")
      .eq("restaurant_id", active.restaurant_id),
  ]);

  const orders = ordersRes.data || [];
  const menuItems = menuRes.data || [];
  const reservations = reservationsRes.data || [];
  const reviews = reviewsRes.data || [];

  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length).toFixed(1)
    : "4.9";

  return (
    <ReportsClient
      restaurantName={active.restaurant.name}
      initialOrders={orders}
      initialMenuItems={menuItems}
      initialReservationsCount={reservations.length}
      initialReviewsCount={reviews.length}
      initialAvgRating={avgRating}
    />
  );
}
