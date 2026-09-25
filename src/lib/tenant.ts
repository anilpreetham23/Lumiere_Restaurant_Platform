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

export const DEFAULT_RESTAURANT_LOGO = "/Shinchan.jpg";

export type RestaurantBranding = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  logo_url?: string | null;
  background_logo_enabled?: boolean;
  background_logo_opacity?: number;
  banner_url?: string | null;
  font_family?: string;
  assets?: Record<string, unknown>;
};

export const DEFAULT_RESTAURANT_BRANDING: RestaurantBranding = {
  primary_color: "#7a2e35",
  secondary_color: "#16130f",
  accent_color: "#c9a45c",
  background_color: "#f6f0e7",
  logo_url: DEFAULT_RESTAURANT_LOGO,
  background_logo_enabled: true,
  background_logo_opacity: 0.10,
  banner_url: null,
  font_family: "Inter",
  assets: {},
};

const ACTIVE_RESTAURANT_COOKIE = "lumiere_active_restaurant";

export async function getActiveRestaurantBranding(restaurantId: string): Promise<RestaurantBranding> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurant_branding")
    .select("primary_color, secondary_color, accent_color, background_color, logo_url, background_logo_enabled, background_logo_opacity, banner_url, font_family, assets")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!data) return DEFAULT_RESTAURANT_BRANDING;

  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rawOpacity = Number(data.background_logo_opacity);
  const opacity = !isNaN(rawOpacity) && rawOpacity >= 0 && rawOpacity <= 1 ? rawOpacity : 0.10;

  return {
    primary_color: hexRegex.test(data.primary_color) ? data.primary_color : DEFAULT_RESTAURANT_BRANDING.primary_color,
    secondary_color: hexRegex.test(data.secondary_color) ? data.secondary_color : DEFAULT_RESTAURANT_BRANDING.secondary_color,
    accent_color: hexRegex.test(data.accent_color) ? data.accent_color : DEFAULT_RESTAURANT_BRANDING.accent_color,
    background_color: hexRegex.test(data.background_color) ? data.background_color : DEFAULT_RESTAURANT_BRANDING.background_color,
    logo_url: data.logo_url && data.logo_url.trim() ? data.logo_url.trim() : DEFAULT_RESTAURANT_LOGO,
    background_logo_enabled: data.background_logo_enabled ?? true,
    background_logo_opacity: opacity,
    banner_url: data.banner_url || null,
    font_family: data.font_family || "Inter",
    assets: (data.assets as Record<string, unknown>) ?? {},
  };
}

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

export type PublicRestaurant = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
  branding?: RestaurantBranding;
};

export async function resolvePublicRestaurantBySlug(slug: string): Promise<PublicRestaurant | null> {
  const normalizedSlug = slug?.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const { serviceRoleConfigured, createAdminClient } = await import("@/lib/supabase/admin");
  const client = serviceRoleConfigured() ? createAdminClient() : await createClient();
  const { data: restaurant } = await client
    .from("restaurants")
    .select("id, name, slug, logo, status")
    .eq("slug", normalizedSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!restaurant) return null;

  const { data: brandingData } = await client
    .from("restaurant_branding")
    .select("primary_color, secondary_color, accent_color, background_color, logo_url, background_logo_enabled, background_logo_opacity, banner_url, font_family, assets")
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rawOpacity = brandingData ? Number(brandingData.background_logo_opacity) : 0.10;
  const opacity = !isNaN(rawOpacity) && rawOpacity >= 0 && rawOpacity <= 1 ? rawOpacity : 0.10;

  const resolvedLogo = (brandingData?.logo_url && brandingData.logo_url.trim())
    || (restaurant.logo && restaurant.logo.trim())
    || DEFAULT_RESTAURANT_LOGO;

  const branding: RestaurantBranding = brandingData
    ? {
        primary_color: hexRegex.test(brandingData.primary_color) ? brandingData.primary_color : DEFAULT_RESTAURANT_BRANDING.primary_color,
        secondary_color: hexRegex.test(brandingData.secondary_color) ? brandingData.secondary_color : DEFAULT_RESTAURANT_BRANDING.secondary_color,
        accent_color: hexRegex.test(brandingData.accent_color) ? brandingData.accent_color : DEFAULT_RESTAURANT_BRANDING.accent_color,
        background_color: hexRegex.test(brandingData.background_color) ? brandingData.background_color : DEFAULT_RESTAURANT_BRANDING.background_color,
        logo_url: resolvedLogo,
        background_logo_enabled: brandingData.background_logo_enabled ?? true,
        background_logo_opacity: opacity,
        banner_url: brandingData.banner_url || null,
        font_family: brandingData.font_family || "Inter",
        assets: (brandingData.assets as Record<string, unknown>) ?? {},
      }
    : { ...DEFAULT_RESTAURANT_BRANDING, logo_url: resolvedLogo };

  return {
    ...restaurant,
    logo: resolvedLogo,
    branding,
  };
}