"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/tenant";
import type { CreateStaffOrderInput } from "@/lib/order";
import type { SaveRecipeInput, RecipeHeaderDetail } from "@/lib/recipe";

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
  if (status === "cancelled") {
    return { ok: false, error: "Use cancelSessionOrder to cancel an order." };
  }
  return updateSessionOrderStatus(id, status as any);
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

  if ((status as string) === "cancelled") {
    return { ok: false, error: "Use cancelSessionOrder to cancel an order." };
  }

  const allowedStatuses = ["placed", "accepted", "preparing", "ready", "served"];
  if (!allowedStatuses.includes(status)) {
    return { ok: false, error: "Invalid status transition" };
  }

  const { data: currentOrder, error: fetchErr } = await supabase
    .from("session_orders")
    .select("id, status")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (fetchErr || !currentOrder) {
    return { ok: false, error: "Order not found" };
  }

  if (currentOrder.status === "cancelled") {
    return { ok: false, error: "Cannot update status of a cancelled order" };
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

  if (status === "served") {
    const { data: consumeRes, error: consumeErr } = await supabase.rpc("consume_order_inventory", {
      p_order_id: id,
      p_user_id: auth.context.user.id,
    });
    if (consumeErr) {
      console.error("Failed to execute automatic inventory consumption:", consumeErr);
    }
  }

  revalidatePath("/admin/kitchen");
  revalidatePath("/admin/floor");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function retryOrderInventoryConsumptionAction(orderId: string) {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, user } = auth.context;

  const { data, error } = await supabase.rpc("consume_order_inventory", {
    p_order_id: orderId,
    p_user_id: user.id,
  });

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to process inventory consumption." };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/kitchen");

  return { ok: true as const, result: data };
}

export async function cancelSessionOrder(
  id: string,
  reason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId, user } = auth.context;

  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    return { ok: false, error: "Cancellation reason is required" };
  }

  const { data: order, error: fetchErr } = await supabase
    .from("session_orders")
    .select("id, status, restaurant_id")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (fetchErr || !order) {
    return { ok: false, error: "Order not found" };
  }

  if (order.status === "cancelled") {
    return { ok: false, error: "Order is already cancelled" };
  }

  if (!["placed", "accepted"].includes(order.status)) {
    return { ok: false, error: `Cannot cancel order in '${order.status}' status` };
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("session_orders")
    .update({
      status: "cancelled",
      cancellation_reason: trimmedReason,
      cancelled_at: nowIso,
      cancelled_by: user.id,
    })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/kitchen");
  revalidatePath("/admin/floor");
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

// ---------- Inventory Management Actions ----------

export type AddInventoryItemInput = {
  name: string;
  sku?: string;
  category?: string;
  unit: "kg" | "g" | "l" | "ml" | "piece" | "dozen" | "packet" | "box";
  opening_quantity?: number;
  reorder_level?: number;
  cost_per_unit?: number;
};

export async function addInventoryItem(
  input: AddInventoryItemInput
): Promise<{ ok: true; itemId: string } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId, user } = auth.context;

  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Ingredient name is required" };

  const validUnits = ["kg", "g", "l", "ml", "piece", "dozen", "packet", "box"];
  if (!input.unit || !validUnits.includes(input.unit)) {
    return { ok: false, error: "Invalid unit of measurement" };
  }

  const category = input.category?.trim() || "General";
  const sku = input.sku?.trim() || null;
  const openingQty = Number.isFinite(input.opening_quantity) ? Math.max(0, Number(input.opening_quantity)) : 0;
  const reorderLvl = Number.isFinite(input.reorder_level) ? Math.max(0, Number(input.reorder_level)) : 0;
  const costPerUnit = Number.isFinite(input.cost_per_unit) ? Math.max(0, Number(input.cost_per_unit)) : 0;

  const { data: item, error } = await supabase
    .from("inventory_items")
    .insert({
      restaurant_id: restaurantId,
      name,
      sku,
      category,
      unit: input.unit,
      quantity: openingQty,
      reorder_level: reorderLvl,
      cost_per_unit: costPerUnit,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !item) {
    return { ok: false, error: error?.message || "Failed to create inventory item" };
  }

  // If opening quantity > 0, record initial stock movement for history audit
  if (openingQty > 0) {
    await supabase.from("stock_movements").insert({
      restaurant_id: restaurantId,
      inventory_item_id: item.id,
      movement_type: "IN",
      quantity: openingQty,
      previous_quantity: 0,
      resulting_quantity: openingQty,
      reason: "Initial opening stock",
      created_by: user.id,
    });
  }

  revalidatePath("/admin/inventory");
  return { ok: true, itemId: item.id };
}

export type UpdateInventoryItemInput = {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  unit: "kg" | "g" | "l" | "ml" | "piece" | "dozen" | "packet" | "box";
  reorder_level?: number;
  cost_per_unit?: number;
  is_active?: boolean;
};

export async function updateInventoryItem(
  input: UpdateInventoryItemInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  if (!input.id) return { ok: false, error: "Inventory item ID required" };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Ingredient name is required" };

  const validUnits = ["kg", "g", "l", "ml", "piece", "dozen", "packet", "box"];
  if (!input.unit || !validUnits.includes(input.unit)) {
    return { ok: false, error: "Invalid unit of measurement" };
  }

  const patch: Record<string, unknown> = {
    name,
    category: input.category?.trim() || "General",
    unit: input.unit,
    updated_at: new Date().toISOString(),
  };

  if (input.sku !== undefined) patch.sku = input.sku?.trim() || null;
  if (Number.isFinite(input.reorder_level)) patch.reorder_level = Math.max(0, Number(input.reorder_level));
  if (Number.isFinite(input.cost_per_unit)) patch.cost_per_unit = Math.max(0, Number(input.cost_per_unit));
  if (typeof input.is_active === "boolean") patch.is_active = input.is_active;

  const { error } = await supabase
    .from("inventory_items")
    .update(patch)
    .eq("id", input.id)
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function recordStockMovementAction(input: {
  inventory_item_id: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  reason?: string;
}): Promise<{ ok: true; resultingQuantity: number } | { ok: false; error: string }> {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth.context;

  if (!input.inventory_item_id) return { ok: false, error: "Inventory item ID required" };
  if (!["IN", "OUT", "ADJUSTMENT"].includes(input.type)) {
    return { ok: false, error: "Invalid movement type" };
  }

  const qty = Number(input.quantity);
  if (!Number.isFinite(qty)) return { ok: false, error: "Invalid quantity" };
  if ((input.type === "IN" || input.type === "OUT") && qty <= 0) {
    return { ok: false, error: "Quantity must be greater than zero" };
  }
  if (input.type === "ADJUSTMENT" && qty < 0) {
    return { ok: false, error: "Adjustment quantity cannot be negative" };
  }

  const { data, error } = await supabase.rpc("record_stock_movement", {
    p_inventory_item_id: input.inventory_item_id,
    p_type: input.type,
    p_quantity: qty,
    p_reason: input.reason?.trim() || null,
  });

  if (error || !data || !data.ok) {
    return { ok: false, error: error?.message || data?.error || "Stock operation failed" };
  }

  revalidatePath("/admin/inventory");
  return { ok: true, resultingQuantity: Number(data.resulting_quantity) };
}

// ---------- Central Orders Hub Actions ----------

export interface GetAdminOrdersParams {
  status?: string;
  source?: string;
  dateRange?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminOrders(params: GetAdminOrdersParams = {}) {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("session_orders")
    .select(
      `
      *,
      dining_sessions (
        customer_name,
        phone,
        guests,
        status,
        restaurant_tables (
          label,
          section
        )
      )
    `,
      { count: "exact" }
    )
    .eq("restaurant_id", restaurantId);

  // Filter by status
  if (params.status && params.status !== "all") {
    if (params.status === "active") {
      query = query.in("status", ["placed", "accepted", "preparing", "ready"]);
    } else if (params.status === "completed") {
      query = query.eq("status", "served");
    } else if (params.status === "cancelled") {
      query = query.eq("status", "cancelled");
    } else {
      query = query.eq("status", params.status);
    }
  }

  // Filter by source
  if (params.source && params.source !== "all") {
    query = query.eq("source", params.source);
  }

  // Filter by dateRange
  if (params.dateRange && params.dateRange !== "all") {
    const now = new Date();
    if (params.dateRange === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      query = query.gte("created_at", startOfDay);
    } else if (params.dateRange === "yesterday") {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday.getTime() - 86400000).toISOString();
      query = query.gte("created_at", startOfYesterday).lt("created_at", startOfToday.toISOString());
    } else if (params.dateRange === "7days") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      query = query.gte("created_at", sevenDaysAgo);
    }
  }

  // Filter by search
  if (params.search && params.search.trim()) {
    const cleanSearch = params.search.trim();
    const sanitizedSearch = cleanSearch.replace(/[,()%\\]/g, "");
    if (sanitizedSearch) {
      const isNum = !isNaN(Number(sanitizedSearch));
      if (isNum) {
        query = query.or(`order_number.eq.${Number(sanitizedSearch)},notes.ilike.%${sanitizedSearch}%`);
      } else {
        const { data: matchedSessions } = await supabase
          .from("dining_sessions")
          .select("id, restaurant_tables!inner(label)")
          .eq("restaurant_id", restaurantId)
          .or(
            `customer_name.ilike.%${sanitizedSearch}%,phone.ilike.%${sanitizedSearch}%,restaurant_tables.label.ilike.%${sanitizedSearch}%`
          );

        const sessionIds = (matchedSessions ?? []).map((ds) => ds.id);
        if (sessionIds.length > 0) {
          query = query.or(`notes.ilike.%${sanitizedSearch}%,session_id.in.(${sessionIds.join(",")})`);
        } else {
          query = query.ilike("notes", `%${sanitizedSearch}%`);
        }
      }
    }
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return { ok: false, error: error.message };
  }

  // Calculate summary metrics for tenant
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [activeRes, todaySalesRes, cancelledRes] = await Promise.all([
    supabase
      .from("session_orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .in("status", ["placed", "accepted", "preparing", "ready"]),
    supabase
      .from("session_orders")
      .select("total, amount")
      .eq("restaurant_id", restaurantId)
      .eq("status", "served")
      .gte("created_at", startOfToday),
    supabase
      .from("session_orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("status", "cancelled"),
  ]);

  const todaySales = (todaySalesRes.data ?? []).reduce(
    (acc, curr) => acc + Number(curr.total ?? curr.amount ?? 0),
    0
  );

  return {
    ok: true as const,
    orders: data ?? [],
    totalCount: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize) || 1,
    metrics: {
      totalOrders: count ?? 0,
      activeOrders: activeRes.count ?? 0,
      todaySales,
      cancelledOrders: cancelledRes.count ?? 0,
    },
  };
}

export async function createStaffOrderAction(input: CreateStaffOrderInput) {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth.context;

  if (!input.table_id || typeof input.table_id !== "string") {
    return { ok: false, error: "Table ID is required" };
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Order items cannot be empty" };
  }

  // Sanitize item payload: only send menu_item_id, qty, notes
  const sanitizedItems = input.items.map((it) => ({
    menu_item_id: String(it.menu_item_id || ""),
    qty: Number(it.qty || 1),
    notes: it.notes ? String(it.notes).trim() : null,
  }));

  const { data, error } = await supabase.rpc("create_staff_order", {
    p_table_id: input.table_id,
    p_items: sanitizedItems,
    p_customer_name: input.customer_name?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_notes: input.notes?.trim() || null,
    p_source: input.source?.trim() || "pos_manual",
  });

  if (error || !data || !data.ok) {
    return { ok: false, error: error?.message || data?.error || "Failed to create staff order" };
  }

  revalidatePath("/admin/floor");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/kitchen");

  return { ok: true as const, result: data };
}

export async function getRecipes() {
  const auth = await requireRole(["owner", "manager", "staff"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  const { data, error } = await supabase
    .from("recipe_headers")
    .select(`
      id,
      restaurant_id,
      menu_item_id,
      name,
      yield_quantity,
      yield_unit,
      is_active,
      created_at,
      updated_at,
      menu_items!inner(id, title, category, price, available),
      recipe_ingredients(
        id,
        recipe_id,
        inventory_item_id,
        quantity,
        unit,
        created_at,
        updated_at,
        inventory_items(id, name, sku, category, unit, quantity, cost_per_unit, is_active)
      )
    `)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  const recipes = (data || []).map((r: any) => {
    let totalCost = 0;
    if (Array.isArray(r.recipe_ingredients)) {
      r.recipe_ingredients.forEach((ing: any) => {
        const itemCost = Number(ing.inventory_items?.cost_per_unit ?? 0);
        const qty = Number(ing.quantity ?? 0);
        totalCost += itemCost * qty;
      });
    }

    const yieldQty = Number(r.yield_quantity || 1);
    const costPerYield = yieldQty > 0 ? totalCost / yieldQty : totalCost;
    const menuPrice = Number(r.menu_items?.price ?? 0);
    const foodCostPercentage = menuPrice > 0 ? (costPerYield / menuPrice) * 100 : 0;

    return {
      ...r,
      total_cost: Math.round(totalCost * 100) / 100,
      cost_per_yield: Math.round(costPerYield * 100) / 100,
      food_cost_percentage: Math.round(foodCostPercentage * 100) / 100,
    } as RecipeHeaderDetail;
  });

  return { ok: true, recipes };
}

export async function saveRecipeAction(input: SaveRecipeInput) {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId, user } = auth.context;

  if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
    return { ok: false, error: "Recipe name is required." };
  }

  if (!input.menu_item_id || typeof input.menu_item_id !== "string") {
    return { ok: false, error: "Menu item selection is required." };
  }

  const yieldQty = Number(input.yield_quantity);
  if (isNaN(yieldQty) || yieldQty <= 0) {
    return { ok: false, error: "Yield quantity must be greater than zero." };
  }

  if (!Array.isArray(input.ingredients) || input.ingredients.length === 0) {
    return { ok: false, error: "A recipe must contain at least one ingredient." };
  }

  // 1. Verify menu item belongs to active restaurant
  const { data: menuItem, error: miError } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", input.menu_item_id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (miError || !menuItem) {
    return { ok: false, error: "Selected menu item does not belong to your restaurant." };
  }

  const isActive = input.is_active !== false;

  // 2. If recipe is set to active, verify no OTHER active recipe exists for this menu_item_id
  if (isActive) {
    let query = supabase
      .from("recipe_headers")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("menu_item_id", input.menu_item_id)
      .eq("is_active", true);

    if (input.id) {
      query = query.neq("id", input.id);
    }

    const { data: existingActive } = await query;
    if (existingActive && existingActive.length > 0) {
      return { ok: false, error: "An active recipe already exists for this menu item." };
    }
  }

  // 3. Verify ingredients belong to tenant and check for duplicate inventory items
  const invIds = new Set<string>();
  for (const ing of input.ingredients) {
    if (!ing.inventory_item_id || typeof ing.inventory_item_id !== "string") {
      return { ok: false, error: "Invalid ingredient selected." };
    }
    if (invIds.has(ing.inventory_item_id)) {
      return { ok: false, error: "Duplicate inventory items are not allowed in the same recipe." };
    }
    invIds.add(ing.inventory_item_id);

    const ingQty = Number(ing.quantity);
    if (isNaN(ingQty) || ingQty <= 0) {
      return { ok: false, error: "Ingredient quantity must be greater than zero." };
    }
  }

  // Verify all inventory items belong to active restaurant and are active
  const { data: invItems, error: invError } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .in("id", Array.from(invIds));

  if (invError || !invItems || invItems.length !== invIds.size) {
    return { ok: false, error: "One or more ingredients do not exist or are inactive in your restaurant." };
  }

  // 4. Save Recipe Header (Insert or Update)
  let recipeId = input.id;
  if (recipeId) {
    const { error: updateErr } = await supabase
      .from("recipe_headers")
      .update({
        name: input.name.trim(),
        yield_quantity: yieldQty,
        yield_unit: input.yield_unit?.trim() || "portion",
        is_active: isActive,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", recipeId)
      .eq("restaurant_id", restaurantId);

    if (updateErr) return { ok: false, error: updateErr.message };
  } else {
    const { data: newHeader, error: insertErr } = await supabase
      .from("recipe_headers")
      .insert({
        restaurant_id: restaurantId,
        menu_item_id: input.menu_item_id,
        name: input.name.trim(),
        yield_quantity: yieldQty,
        yield_unit: input.yield_unit?.trim() || "portion",
        is_active: isActive,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (insertErr || !newHeader) return { ok: false, error: insertErr?.message || "Failed to create recipe header" };
    recipeId = newHeader.id;
  }

  // 5. Replace ingredients atomically
  if (input.id) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  }

  const ingredientRows = input.ingredients.map((ing) => ({
    restaurant_id: restaurantId,
    recipe_id: recipeId!,
    inventory_item_id: ing.inventory_item_id,
    quantity: Number(ing.quantity),
    unit: String(ing.unit || "kg").trim(),
  }));

  const { error: ingInsertErr } = await supabase.from("recipe_ingredients").insert(ingredientRows);

  if (ingInsertErr) {
    return { ok: false, error: ingInsertErr.message };
  }

  revalidatePath("/admin/recipes");
  revalidatePath("/admin/menu");
  revalidatePath("/admin/inventory");

  return { ok: true, recipe_id: recipeId };
}

export async function toggleRecipeActiveAction(recipeId: string, isActive: boolean) {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId, user } = auth.context;

  if (isActive) {
    const { data: recipe } = await supabase
      .from("recipe_headers")
      .select("menu_item_id")
      .eq("id", recipeId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (recipe) {
      const { data: existingActive } = await supabase
        .from("recipe_headers")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("menu_item_id", recipe.menu_item_id)
        .eq("is_active", true)
        .neq("id", recipeId);

      if (existingActive && existingActive.length > 0) {
        return { ok: false, error: "Another active recipe already exists for this menu item." };
      }
    }
  }

  const { error } = await supabase
    .from("recipe_headers")
    .update({ is_active: isActive, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", recipeId)
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/recipes");
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function deleteRecipeAction(recipeId: string) {
  const auth = await requireRole(["owner", "manager"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, restaurantId } = auth.context;

  const { error } = await supabase
    .from("recipe_headers")
    .delete()
    .eq("id", recipeId)
    .eq("restaurant_id", restaurantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/recipes");
  revalidatePath("/admin/menu");
  return { ok: true };
}
