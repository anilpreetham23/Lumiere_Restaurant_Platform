import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "manager" | "staff";

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
};

export type RestaurantMembership = {
  restaurant_id: string;
  role: Role;
  status: string;
  restaurant: Restaurant;
};

const ACTIVE_RESTAURANT_COOKIE = "lumiere_active_restaurant";

export async function getRestaurantMemberships(): Promise<RestaurantMembership[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("restaurant_memberships")
    .select("restaurant_id, role, status, restaurant:restaurants!inner(id, name, slug, logo, status)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("restaurant.status", "active")
    .order("created_at");

  return (data ?? []) as unknown as RestaurantMembership[];
}

export async function getActiveRestaurant(): Promise<RestaurantMembership | null> {
  const memberships = await getRestaurantMemberships();
  if (!memberships.length) return null;

  const cookieStore = await cookies();
  const selected = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value;
  return memberships.find((membership) => membership.restaurant_id === selected) ?? memberships[0];
}

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>>["data"]["user"]>;
  membership: RestaurantMembership;
  restaurantId: string;
  role: Role;
};

export type RequireRoleResult =
  | { ok: true; context: AuthContext }
  | { ok: false; error: string };

export async function requireRole(
  allowedRoles: Role[] = ["owner", "manager", "staff"]
): Promise<RequireRoleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authorised" };
  }

  const active = await getActiveRestaurant();
  if (!active) {
    return { ok: false, error: "No active restaurant membership" };
  }

  if (!allowedRoles.includes(active.role)) {
    return { ok: false, error: "Insufficient permissions" };
  }

  return {
    ok: true,
    context: {
      supabase,
      user,
      membership: active,
      restaurantId: active.restaurant_id,
      role: active.role,
    },
  };
}

export { ACTIVE_RESTAURANT_COOKIE };