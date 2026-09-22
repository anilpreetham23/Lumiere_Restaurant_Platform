"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/tenant";

export async function setReservationStatus(id: string, status: string) {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function setOrderStatus(id: string, status: string) {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const { error } = await supabase.from("orders").update({ status }).eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ---------- Kitchen Display + menu availability ----------

export async function setSessionOrderStatus(id: string, status: string) {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const { error } = await supabase.from("session_orders").update({ status }).eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resolveServiceRequest(id: string) {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const { error } = await supabase.from("service_requests").update({ status: "done" }).eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setMenuAvailability(id: string, available: boolean) {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const { error } = await supabase.from("menu_items").update({ available }).eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function setMenuPrice(id: string, price: number) {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Bad price" };
  const { error } = await supabase.from("menu_items").update({ price }).eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function addMenuItem(input: {
  title: string; cuisine: string; price: number; prep_minutes?: number; image?: string; short?: string;
  dietary?: string[]; spice?: number;
}) {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title required" };
  if (!Number.isFinite(input.price) || input.price < 0) return { ok: false, error: "Bad price" };
  const prep_minutes = Number.isInteger(input.prep_minutes) && (input.prep_minutes ?? 0) > 0 ? input.prep_minutes : 15;
  const id =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" + Math.random().toString(36).slice(2, 6);
  const row = {
    id,
    title,
    cuisine: input.cuisine,
    price: input.price,
    prep_minutes,
    image: input.image?.trim() || "/img/menu/1.jpg",
    short: input.short?.trim() || title,
    description: input.short?.trim() || title,
    tags: [],
    dietary: input.dietary ?? [],
    spice: Number.isFinite(input.spice) ? input.spice : 0,
    sort: 999,
  };
  const { error } = await supabase.from("menu_items").insert({ ...row, restaurant_id: restaurantId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export type UpdateMenuItemInput = {
  id: string;
  title: string;
  cuisine: string;
  price: number;
  prep_minutes?: number;
  short?: string;
  image?: string;
  dietary?: string[];
  spice?: number;
  available?: boolean;
};

export async function updateMenuItem(input: UpdateMenuItemInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  if (!input.id) return { ok: false, error: "Item ID required" };
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Title required" };
  if (!Number.isFinite(input.price) || input.price < 0) return { ok: false, error: "Valid price required" };

  const prep_minutes = Number.isInteger(input.prep_minutes) && (input.prep_minutes ?? 0) > 0 ? input.prep_minutes : 15;

  const patch: Record<string, unknown> = {
    title,
    cuisine: input.cuisine?.trim() || "Main",
    price: input.price,
    prep_minutes,
    short: input.short?.trim() || title,
    description: input.short?.trim() || title,
    image: input.image?.trim() || "/img/menu/1.jpg",
    dietary: input.dietary ?? [],
    spice: Number.isFinite(input.spice) ? input.spice : 0,
  };

  if (typeof input.available === "boolean") {
    patch.available = input.available;
  }

  const { error } = await supabase
    .from("menu_items")
    .update(patch)
    .eq("id", input.id)
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export type AdminSettingsData = {
  profile: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    status: string;
  };
  branding: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    assets: Record<string, unknown>;
  };
  settings: {
    tagline: string | null;
    hours: string | null;
    currency: string;
    deposit_amount: number;
    service_charge_pct: number;
    payment_gateway: "razorpay" | "stripe";
    accepting_orders: boolean;
  };
  role: "owner" | "manager" | "staff";
};

export async function getAdminSettingsData(): Promise<
  { ok: true; data: AdminSettingsData } | { ok: false; error: string }
> {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const { supabase, restaurantId, role } = auth.context;

  const [resProfile, resBranding, resSettings] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id, name, slug, logo, phone, email, address, city, state, country, postal_code, status")
      .eq("id", restaurantId)
      .single(),
    supabase
      .from("restaurant_branding")
      .select("primary_color, secondary_color, accent_color, background_color, assets")
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    supabase
      .from("restaurant_settings")
      .select("tagline, hours, currency, deposit_amount, service_charge_pct, payment_gateway, accepting_orders")
      .eq("restaurant_id", restaurantId)
      .single(),
  ]);

  if (resProfile.error) return { ok: false, error: resProfile.error.message };
  if (resSettings.error) return { ok: false, error: resSettings.error.message };

  const defaultBranding = {
    primary_color: "#7a2e35",
    secondary_color: "#16130f",
    accent_color: "#c8a24d",
    background_color: "#ffffff",
    assets: {},
  };

  const brandingData = resBranding.data
    ? {
        primary_color: resBranding.data.primary_color || defaultBranding.primary_color,
        secondary_color: resBranding.data.secondary_color || defaultBranding.secondary_color,
        accent_color: resBranding.data.accent_color || defaultBranding.accent_color,
        background_color: resBranding.data.background_color || defaultBranding.background_color,
        assets: (resBranding.data.assets as Record<string, unknown>) ?? {},
      }
    : defaultBranding;

  return {
    ok: true,
    data: {
      profile: resProfile.data,
      branding: brandingData,
      settings: resSettings.data as AdminSettingsData["settings"],
      role,
    },
  };
}

export type UpdateRestaurantProfileInput = {
  name: string;
  logo?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
};

export async function updateRestaurantProfile(
  input: UpdateRestaurantProfileInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Restaurant name is required" };
  if (name.length > 100) return { ok: false, error: "Restaurant name must not exceed 100 characters" };

  let logo: string | null = null;
  if (input.logo) {
    const trimmedLogo = input.logo.trim();
    if (trimmedLogo) {
      if (trimmedLogo.length > 500) return { ok: false, error: "Logo URL must not exceed 500 characters" };
      if (!/^(https?:\/\/|\/)/i.test(trimmedLogo)) {
        return { ok: false, error: "Logo must be a valid URL starting with http://, https://, or /" };
      }
      logo = trimmedLogo;
    }
  }

  let email: string | null = null;
  if (input.email) {
    const trimmedEmail = input.email.trim();
    if (trimmedEmail) {
      if (trimmedEmail.length > 100) return { ok: false, error: "Email must not exceed 100 characters" };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return { ok: false, error: "Invalid email format" };
      }
      email = trimmedEmail;
    }
  }

  const phone = input.phone?.trim() ? input.phone.trim().slice(0, 30) : null;
  const address = input.address?.trim() ? input.address.trim().slice(0, 200) : null;
  const city = input.city?.trim() ? input.city.trim().slice(0, 100) : null;
  const state = input.state?.trim() ? input.state.trim().slice(0, 100) : null;
  const country = input.country?.trim() ? input.country.trim().slice(0, 100) : null;
  const postalCode = input.postal_code?.trim() ? input.postal_code.trim().slice(0, 20) : null;

  const { error } = await supabase.rpc("update_restaurant_profile", {
    p_restaurant_id: restaurantId,
    p_name: name,
    p_logo: logo,
    p_phone: phone,
    p_email: email,
    p_address: address,
    p_city: city,
    p_state: state,
    p_country: country,
    p_postal_code: postalCode,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export type UpdateRestaurantBrandingInput = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  assets?: Record<string, unknown>;
};

export async function updateRestaurantBranding(
  input: UpdateRestaurantBrandingInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  const primary_color = input.primary_color?.trim().toLowerCase();
  if (!primary_color || !hexRegex.test(primary_color)) {
    return { ok: false, error: "Primary color must be a valid hex color code (e.g. #7a2e35)" };
  }

  const secondary_color = input.secondary_color?.trim().toLowerCase();
  if (!secondary_color || !hexRegex.test(secondary_color)) {
    return { ok: false, error: "Secondary color must be a valid hex color code (e.g. #16130f)" };
  }

  const accent_color = input.accent_color?.trim().toLowerCase();
  if (!accent_color || !hexRegex.test(accent_color)) {
    return { ok: false, error: "Accent color must be a valid hex color code (e.g. #c9a45c)" };
  }

  const background_color = input.background_color?.trim().toLowerCase();
  if (!background_color || !hexRegex.test(background_color)) {
    return { ok: false, error: "Background color must be a valid hex color code (e.g. #f6f0e7)" };
  }

  let assets: Record<string, unknown> = {};
  if (input.assets !== undefined) {
    if (typeof input.assets !== "object" || input.assets === null || Array.isArray(input.assets)) {
      return { ok: false, error: "Assets must be a valid object" };
    }
    assets = input.assets;
  }

  const { error } = await supabase
    .from("restaurant_branding")
    .update({
      primary_color,
      secondary_color,
      accent_color,
      background_color,
      assets,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export type UpdateRestaurantSettingsInput = {
  tagline?: string;
  hours?: string;
  currency?: string;
  deposit_amount?: number;
  service_charge_pct?: number;
  payment_gateway?: "razorpay" | "stripe";
  accepting_orders?: boolean;
};

const ALLOWED_SETTING_KEYS: (keyof UpdateRestaurantSettingsInput)[] = [
  "tagline",
  "hours",
  "currency",
  "deposit_amount",
  "service_charge_pct",
  "payment_gateway",
  "accepting_orders",
];

export async function updateRestaurantSettings(
  input: UpdateRestaurantSettingsInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Invalid settings input" };
  }

  const keys = Object.keys(input) as (keyof UpdateRestaurantSettingsInput)[];
  for (const k of keys) {
    if (!ALLOWED_SETTING_KEYS.includes(k)) {
      return { ok: false, error: `Property "${k}" is not allowed in restaurant settings` };
    }
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.tagline !== undefined) {
    const trimmed = input.tagline.trim();
    if (trimmed.length > 150) return { ok: false, error: "Tagline must not exceed 150 characters" };
    patch.tagline = trimmed;
  }

  if (input.hours !== undefined) {
    const trimmed = input.hours.trim();
    if (trimmed.length > 100) return { ok: false, error: "Opening hours must not exceed 100 characters" };
    patch.hours = trimmed;
  }

  if (input.currency !== undefined) {
    const uppercaseCurrency = input.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(uppercaseCurrency)) {
      return { ok: false, error: "Currency must be a valid 3-letter ISO code (e.g. INR)" };
    }
    patch.currency = uppercaseCurrency;
  }

  if (input.deposit_amount !== undefined) {
    if (!Number.isFinite(input.deposit_amount) || input.deposit_amount < 0) {
      return { ok: false, error: "Reservation deposit must be a non-negative number" };
    }
    patch.deposit_amount = input.deposit_amount;
  }

  if (input.service_charge_pct !== undefined) {
    if (!Number.isFinite(input.service_charge_pct) || input.service_charge_pct < 0 || input.service_charge_pct > 100) {
      return { ok: false, error: "Service charge percentage must be between 0 and 100" };
    }
    patch.service_charge_pct = input.service_charge_pct;
  }

  if (input.payment_gateway !== undefined) {
    if (input.payment_gateway !== "razorpay" && input.payment_gateway !== "stripe") {
      return { ok: false, error: 'Payment gateway must be either "razorpay" or "stripe"' };
    }
    patch.payment_gateway = input.payment_gateway;
  }

  if (input.accepting_orders !== undefined) {
    if (typeof input.accepting_orders !== "boolean") {
      return { ok: false, error: "Accepting orders must be a boolean" };
    }
    patch.accepting_orders = input.accepting_orders;
  }

  const { error } = await supabase.from("restaurant_settings").update(patch).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function updateSettings(patch: Record<string, unknown>) {
  const typedInput: UpdateRestaurantSettingsInput = {};
  if (typeof patch.tagline === "string") typedInput.tagline = patch.tagline;
  if (typeof patch.hours === "string") typedInput.hours = patch.hours;
  if (typeof patch.currency === "string") typedInput.currency = patch.currency;
  if (typeof patch.deposit_amount === "number") typedInput.deposit_amount = patch.deposit_amount;
  if (typeof patch.service_charge_pct === "number") typedInput.service_charge_pct = patch.service_charge_pct;
  if (patch.payment_gateway === "razorpay" || patch.payment_gateway === "stripe") {
    typedInput.payment_gateway = patch.payment_gateway;
  }
  if (typeof patch.accepting_orders === "boolean") typedInput.accepting_orders = patch.accepting_orders;

  if (typeof patch.restaurant_name === "string" && patch.restaurant_name.trim()) {
    const profRes = await updateRestaurantProfile({
      name: String(patch.restaurant_name),
      phone: typeof patch.phone === "string" ? patch.phone : undefined,
      email: typeof patch.email === "string" ? patch.email : undefined,
      address: typeof patch.address === "string" ? patch.address : undefined,
    });
    if (!profRes.ok) return profRes;
  }

  return updateRestaurantSettings(typedInput);
}

export async function setTableState(id: string, state: "free" | "reserved" | "occupied" | "bill_pending") {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const allowed = ["free", "reserved", "occupied", "bill_pending"];
  if (!allowed.includes(state)) return { ok: false, error: "Invalid table state" };
  const patch: Record<string, unknown> = { state };
  if (state === "free") patch.current_session_id = null;
  const { error } = await supabase.from("restaurant_tables").update(patch).eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/floor");
  revalidatePath("/admin/tables");
  return { ok: true };
}

export type AddTableInput = {
  label: string;
  seats: number;
  section?: string;
  pos_x?: number;
  pos_y?: number;
};

export async function addRestaurantTable(
  input: AddTableInput
): Promise<{ ok: true; tableId: string } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  const label = input.label?.trim();
  if (!label) return { ok: false, error: "Table label is required" };
  if (label.length > 50) return { ok: false, error: "Table label must not exceed 50 characters" };

  const seats = Number(input.seats);
  if (!Number.isInteger(seats) || seats < 1 || seats > 50) {
    return { ok: false, error: "Seats must be an integer between 1 and 50" };
  }

  const section = input.section?.trim() || "Main Dining";
  if (section.length > 50) return { ok: false, error: "Section must not exceed 50 characters" };

  const posX = Number.isFinite(input.pos_x) ? Math.max(0, Math.min(2000, Number(input.pos_x))) : 0;
  const posY = Number.isFinite(input.pos_y) ? Math.max(0, Math.min(2000, Number(input.pos_y))) : 0;

  const token = crypto.randomUUID();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({
      restaurant_id: restaurantId,
      label,
      seats,
      section,
      pos_x: posX,
      pos_y: posY,
      token,
      state: "free",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message || "Failed to add table" };

  revalidatePath("/admin/floor");
  revalidatePath("/admin/tables");
  return { ok: true, tableId: data.id };
}

export async function updateTablePosition(
  id: string,
  posX: number,
  posY: number,
  section?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  if (!id || typeof id !== "string") return { ok: false, error: "Table ID required" };
  const validX = Math.max(0, Math.min(2000, Math.round(Number(posX) || 0)));
  const validY = Math.max(0, Math.min(2000, Math.round(Number(posY) || 0)));

  const patch: Record<string, unknown> = {
    pos_x: validX,
    pos_y: validY,
  };
  if (typeof section === "string" && section.trim()) {
    patch.section = section.trim().slice(0, 50);
  }

  const { error } = await supabase
    .from("restaurant_tables")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/floor");
  return { ok: true };
}

export async function updateSessionOrderStatus(
  id: string,
  status: "placed" | "accepted" | "preparing" | "ready" | "served"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  const allowedStatuses = ["placed", "accepted", "preparing", "ready", "served"];
  if (!allowedStatuses.includes(status)) {
    return { ok: false, error: "Invalid status transition" };
  }

  const patch: Record<string, unknown> = { status };
  const nowIso = new Date().toISOString();

  if (status === "preparing") {
    patch.started_at = nowIso;
  } else if (status === "ready" || status === "served") {
    patch.completed_at = nowIso;
  }

  const { error } = await supabase
    .from("session_orders")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/kitchen");
  return { ok: true };
}

export async function acceptServiceRequest(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  const { error } = await supabase
    .from("service_requests")
    .update({ status: "accepted" })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/kitchen");
  revalidatePath("/admin/waiter");
  return { ok: true };
}

export async function deleteMenuItem(id: string) {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const { error } = await supabase.from("menu_items").delete().eq("id", id).eq("restaurant_id", restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

// Cashier: settle + free the table.
export async function settleSession(sessionId: string, method: "cash" | "online") {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;
  const { data: sess, error: e1 } = await supabase
    .from("dining_sessions")
    .update({ status: "paid", payment_status: "paid", payment_method: method, closed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("restaurant_id", restaurantId)
    .select("table_id")
    .single();
  if (e1) return { ok: false, error: e1.message };
  if (sess?.table_id) {
    await supabase
      .from("restaurant_tables")
      .update({ state: "free", current_session_id: null })
      .eq("id", sess.table_id)
      .eq("restaurant_id", restaurantId);
  }
  revalidatePath("/admin/floor");
  return { ok: true };
}
