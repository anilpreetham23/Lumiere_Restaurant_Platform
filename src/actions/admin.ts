"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveRestaurant } from "@/lib/tenant";

export async function setReservationStatus(id: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authorised" };
  const active = await getActiveRestaurant();
  if (!active) return { ok: false, error: "No restaurant selected" };
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id).eq("restaurant_id", active.restaurant_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function setOrderStatus(id: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authorised" };
  const active = await getActiveRestaurant();
  if (!active) return { ok: false, error: "No restaurant selected" };
  const { error } = await supabase.from("orders").update({ status }).eq("id", id).eq("restaurant_id", active.restaurant_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ---------- Kitchen Display + menu availability ----------

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const active = user ? await getActiveRestaurant() : null;
  return user && active ? { supabase, restaurantId: active.restaurant_id } : null;
}

export async function setSessionOrderStatus(id: string, status: string) {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  const { error } = await staff.supabase.from("session_orders").update({ status }).eq("id", id).eq("restaurant_id", staff.restaurantId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resolveServiceRequest(id: string) {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  const { error } = await staff.supabase.from("service_requests").update({ status: "done" }).eq("id", id).eq("restaurant_id", staff.restaurantId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setMenuAvailability(id: string, available: boolean) {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  const { error } = await staff.supabase.from("menu_items").update({ available }).eq("id", id).eq("restaurant_id", staff.restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function setMenuPrice(id: string, price: number) {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Bad price" };
  const { error } = await staff.supabase.from("menu_items").update({ price }).eq("id", id).eq("restaurant_id", staff.restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function addMenuItem(input: {
  title: string; cuisine: string; price: number; image?: string; short?: string;
  dietary?: string[]; spice?: number;
}) {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title required" };
  if (!Number.isFinite(input.price) || input.price < 0) return { ok: false, error: "Bad price" };
  const id =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" + Math.random().toString(36).slice(2, 6);
  const row = {
    id,
    title,
    cuisine: input.cuisine,
    price: input.price,
    image: input.image?.trim() || "/img/menu/1.jpg",
    short: input.short?.trim() || title,
    description: input.short?.trim() || title,
    tags: [],
    dietary: input.dietary ?? [],
    spice: Number.isFinite(input.spice) ? input.spice : 0,
    sort: 999,
  };
  const { error } = await staff.supabase.from("menu_items").insert({ ...row, restaurant_id: staff.restaurantId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function updateSettings(patch: Record<string, unknown>) {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  const { error } = await staff.supabase.from("restaurant_settings").update(patch).eq("restaurant_id", staff.restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function setTableState(id: string, state: "free" | "reserved" | "occupied") {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  const patch: Record<string, unknown> = { state };
  if (state === "free") patch.current_session_id = null;
  const { error } = await staff.supabase.from("restaurant_tables").update(patch).eq("id", id).eq("restaurant_id", staff.restaurantId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteMenuItem(id: string) {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  const { error } = await staff.supabase.from("menu_items").delete().eq("id", id).eq("restaurant_id", staff.restaurantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

// Cashier: settle + free the table.
export async function settleSession(sessionId: string, method: "cash" | "online") {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "Not authorised" };
  const { data: sess, error: e1 } = await staff.supabase
    .from("dining_sessions")
    .update({ status: "paid", payment_status: "paid", payment_method: method, closed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("restaurant_id", staff.restaurantId)
    .select("table_id")
    .single();
  if (e1) return { ok: false, error: e1.message };
  if (sess?.table_id) {
    await staff.supabase
      .from("restaurant_tables")
      .update({ state: "free", current_session_id: null })
      .eq("id", sess.table_id)
      .eq("restaurant_id", staff.restaurantId);
  }
  return { ok: true };
}
