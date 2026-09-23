import { redirect } from "next/navigation";
import { getActiveRestaurant, requireRole } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import ReservationsClient from "@/components/admin/ReservationsClient";

export default async function AdminReservationsPage() {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) {
    redirect("/admin");
  }

  const active = await getActiveRestaurant();
  if (!active) {
    redirect("/admin");
  }

  const supabase = await createClient();

  // Fetch reservations
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, restaurant_tables(id, label, max_capacity, state)")
    .eq("restaurant_id", active.restaurant_id)
    .order("date", { ascending: false })
    .order("time", { ascending: true });

  // Fetch tables for assignment dropdown
  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("id, label, max_capacity, state")
    .eq("restaurant_id", active.restaurant_id)
    .order("label", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream2 pb-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Reservations</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage table bookings, customer details, seating, and deposit statuses.
          </p>
        </div>
      </div>

      <ReservationsClient
        initialReservations={reservations || []}
        tables={tables || []}
      />
    </div>
  );
}
