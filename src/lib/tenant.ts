import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
};

export type RestaurantMembership = {
  restaurant_id: string;
  role: "owner" | "manager" | "staff";
  restaurant: Restaurant;
};

const ACTIVE_RESTAURANT_COOKIE = "lumiere_active_restaurant";

export async function getRestaurantMemberships(): Promise<RestaurantMembership[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("restaurant_memberships")
    .select("restaurant_id, role, restaurant:restaurants!inner(id, name, slug, logo, status)")
    .eq("user_id", user.id)
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

export { ACTIVE_RESTAURANT_COOKIE };