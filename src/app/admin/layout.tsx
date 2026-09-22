import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLogout from "@/components/AdminLogout";
import { getActiveRestaurant, getRestaurantMemberships } from "@/lib/tenant";
import { switchActiveRestaurant } from "@/actions/tenant";

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
    return <div className="min-h-screen grid place-items-center bg-cream px-5 text-center"><div><h1 className="font-serif text-2xl">No restaurant access</h1><p className="text-sm text-neutral-500 mt-2">Ask a platform administrator to add your restaurant membership.</p></div></div>;
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-cream2">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-serif text-xl">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-gold to-[#b3873a] text-ink text-sm">L</span>
            Lumiere Console
          </Link>
          <div className="flex items-center gap-4">
            {memberships.length > 1 && (
              <form action={switchActiveRestaurant}>
                <label className="sr-only" htmlFor="restaurant-context">Active restaurant</label>
                <select id="restaurant-context" name="restaurant_id" defaultValue={active.restaurant_id} className="field py-1.5 text-xs">
                  {memberships.map((membership) => <option key={membership.restaurant_id} value={membership.restaurant_id}>{membership.restaurant.name}</option>)}
                </select>
              </form>
            )}
            <Link href="/admin" className="text-sm text-neutral-600 hover:text-wine">Dashboard</Link>
            <Link href="/admin/floor" className="text-sm text-neutral-600 hover:text-wine">Floor Map & QR</Link>
            <Link href="/admin/kitchen" className="text-sm text-neutral-600 hover:text-wine">Kitchen</Link>
            <Link href="/admin/waiter" className="text-sm text-neutral-600 hover:text-wine">Waiter</Link>
            <Link href="/admin/menu" className="text-sm text-neutral-600 hover:text-wine">Menu</Link>
            <Link href="/admin/inventory" className="text-sm text-neutral-600 hover:text-wine">Inventory</Link>
            <Link href="/admin/settings" className="text-sm text-neutral-600 hover:text-wine">Settings</Link>
            <Link href="/" className="text-sm text-neutral-600 hover:text-wine">View site</Link>
            <AdminLogout />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
