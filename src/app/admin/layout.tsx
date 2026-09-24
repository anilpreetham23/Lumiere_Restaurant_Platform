import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLogout from "@/components/AdminLogout";
import { getActiveRestaurant, getRestaurantMemberships } from "@/lib/tenant";
import { switchActiveRestaurant } from "@/actions/tenant";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // login page renders without chrome
  if (!user) {
    return <>{children}</>;
  }

  const [active, memberships] = await Promise.all([getActiveRestaurant(), getRestaurantMemberships()]);
  if (!active) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream px-5 text-center">
        <div>
          <h1 className="font-serif text-2xl">No restaurant access</h1>
          <p className="text-sm text-neutral-500 mt-2">
            Ask a platform administrator to add your restaurant membership.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminNavigation
        restaurantId={active.restaurant_id}
        restaurantName={active.restaurant.name}
        memberships={memberships}
        switchActiveRestaurantAction={switchActiveRestaurant}
      />
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
