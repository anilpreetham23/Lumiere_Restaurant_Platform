"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_RESTAURANT_COOKIE } from "@/lib/tenant";
import { getActiveRestaurant } from "@/lib/tenant";

export async function switchActiveRestaurant(formData: FormData): Promise<void> {
  const restaurantId = String(formData.get("restaurant_id") ?? "");
  if (!restaurantId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: membership, error } = await supabase
    .from("restaurant_memberships")
    .select("restaurant_id, restaurant:restaurants!inner(status)")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .eq("restaurant.status", "active")
    .maybeSingle();
  if (error || !membership) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_RESTAURANT_COOKIE, membership.restaurant_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidatePath("/admin", "layout");
}

export async function getActiveRestaurantId(): Promise<string | null> {
  const active = await getActiveRestaurant();
  return active?.restaurant_id ?? null;
}