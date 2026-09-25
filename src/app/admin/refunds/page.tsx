import { redirect } from "next/navigation";
import { getActiveRestaurant, requireRole } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import PaymentsClient from "@/components/admin/PaymentsClient";

export default async function AdminRefundsPage() {
  const auth = await requireRole(["owner"]);
  if (!auth.ok) {
    redirect("/admin");
  }

  const active = await getActiveRestaurant();
  if (!active) {
    redirect("/admin");
  }

  const userRole = auth.context.role;
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      payment_refunds(*),
      dining_sessions(id, table_id, status, payment_status, receipt_code, restaurant_tables(label)),
      reservations(id, name, phone, email, date, time, deposit_status)
    `)
    .eq("restaurant_id", active.restaurant_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream2 pb-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Authoritative Refunds</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Review completed transactions, inspect refund logs, and process partial or full refunds.
          </p>
        </div>
      </div>

      <PaymentsClient
        initialPayments={payments || []}
        userRole={userRole}
      />
    </div>
  );
}
