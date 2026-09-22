"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_RESTAURANT_COOKIE, getActiveRestaurant } from "@/lib/tenant";

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

export type CreateRestaurantInput = {
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  address?: string;
};

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<{ ok: true; restaurantId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authorised" };
  }

  const name = input.name?.trim();
  if (!name) {
    return { ok: false, error: "Restaurant name is required" };
  }

  const slug = input.slug?.toLowerCase().trim();
  if (!slug) {
    return { ok: false, error: "Restaurant slug is required" };
  }

  if (slug.length < 3 || slug.length > 50) {
    return { ok: false, error: "Restaurant slug must be between 3 and 50 characters" };
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, error: "Slug must contain only lowercase letters, numbers, and hyphens" };
  }

  const reservedSlugs = ["admin", "api", "system", "auth", "public", "lumiere"];
  if (reservedSlugs.includes(slug)) {
    return { ok: false, error: `Restaurant slug "${slug}" is reserved` };
  }

  const { data: restaurantId, error } = await supabase.rpc("create_restaurant_with_owner", {
    p_name: name,
    p_slug: slug,
    p_phone: input.phone?.trim() || null,
    p_email: input.email?.trim() || null,
    p_address: input.address?.trim() || null,
  });

  if (error || !restaurantId) {
    return { ok: false, error: error?.message || "Failed to create restaurant" };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_RESTAURANT_COOKIE, restaurantId as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  revalidatePath("/admin", "layout");
  return { ok: true, restaurantId: restaurantId as string };
}