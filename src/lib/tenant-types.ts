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
  assets?: Record<string, unknown>;
};

export const DEFAULT_RESTAURANT_BRANDING: RestaurantBranding = {
  primary_color: "#7a2e35",
  secondary_color: "#16130f",
  accent_color: "#c9a45c",
  background_color: "#f6f0e7",
  assets: {},
};
