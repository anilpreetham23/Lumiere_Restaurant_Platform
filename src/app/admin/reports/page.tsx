import { redirect } from "next/navigation";
import { getActiveRestaurant, requireRole } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Calendar } from "lucide-react";

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
  const [ordersRes, paymentsRes, reservationsRes, reviewsRes] = await Promise.all([
    supabase.from("session_orders").select("*").eq("restaurant_id", active.restaurant_id),
    supabase.from("payments").select("*").eq("restaurant_id", active.restaurant_id),
    supabase.from("reservations").select("*").eq("restaurant_id", active.restaurant_id),
    supabase.from("customer_reviews").select("rating").eq("restaurant_id", active.restaurant_id),
  ]);

  const orders = ordersRes.data || [];
  const payments = paymentsRes.data || [];
  const reservations = reservationsRes.data || [];
  const reviews = reviewsRes.data || [];

  const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalOrders = orders.length;
  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-ink">Sales & Performance Analytics</h1>
        <p className="text-sm text-neutral-500 mt-1">
          High-level operational metrics and revenue insights for {active.restaurant.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-neutral-400">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="font-serif text-3xl text-ink mt-3">₹{totalRevenue.toLocaleString("en-IN")}</p>
          <span className="text-xs text-emerald-600 font-medium">Verified Payments</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-neutral-400">Total Orders</span>
            <ShoppingBag className="w-5 h-5 text-wine" />
          </div>
          <p className="font-serif text-3xl text-ink mt-3">{totalOrders}</p>
          <span className="text-xs text-neutral-500 font-medium">Across all channels</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-neutral-400">Reservations</span>
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <p className="font-serif text-3xl text-ink mt-3">{reservations.length}</p>
          <span className="text-xs text-amber-600 font-medium">Booked dining slots</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-neutral-400">Avg Customer Rating</span>
            <Users className="w-5 h-5 text-gold" />
          </div>
          <p className="font-serif text-3xl text-ink mt-3">{avgRating} ★</p>
          <span className="text-xs text-neutral-500 font-medium">From {reviews.length} reviews</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-xs">
        <h2 className="font-serif text-lg text-ink mb-2">Performance Summary</h2>
        <p className="text-sm text-neutral-600">
          Analytics reports are computed in real-time from canonical operational data tables including verified payments, dining sessions, and online order channels.
        </p>
      </div>
    </div>
  );
}
