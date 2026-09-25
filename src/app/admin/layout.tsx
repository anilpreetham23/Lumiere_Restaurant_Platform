import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveRestaurant, getRestaurantMemberships, getActiveRestaurantBranding } from "@/lib/tenant";
import { switchActiveRestaurant } from "@/actions/tenant";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { NoActiveRestaurantFallback } from "@/components/admin/NoActiveRestaurantFallback";

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
    return <NoActiveRestaurantFallback userEmail={user.email} />;
  }

  const branding = await getActiveRestaurantBranding(active.restaurant_id);

  return (
    <AdminNavigation
      restaurantId={active.restaurant_id}
      restaurantName={active.restaurant.name}
      logo={active.restaurant.logo}
      branding={branding}
      memberships={memberships}
      role={active.role}
      switchActiveRestaurantAction={switchActiveRestaurant}
      userEmail={user.email}
    >
      {children}
    </AdminNavigation>
  );
}
