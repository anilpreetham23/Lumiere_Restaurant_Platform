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
  logo_url: "/Shinchan.jpg",
  background_logo_enabled: true,
  background_logo_opacity: 0.10,
  banner_url: null,
  font_family: "Inter",
  assets: {},
};
