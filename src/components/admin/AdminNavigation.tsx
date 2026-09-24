"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ShoppingBag, X, ChevronRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NotificationAlert = {
  id: string;
  order_number: number;
  source: "swiggy" | "zomato" | string;
  total: number;
  item_count: number;
  created_at: string;
};

type Props = {
  restaurantId: string;
  restaurantName: string;
  memberships: Array<{ restaurant_id: string; restaurant: { name: string } }>;
  switchActiveRestaurantAction: (formData: FormData) => Promise<void>;
};

export function AdminNavigation({
  restaurantId,
  restaurantName,
  memberships,
  switchActiveRestaurantAction,
}: Props) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [activeAlert, setActiveAlert] = useState<NotificationAlert | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Subscribe to real-time incoming marketplace orders
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`admin-nav-marketplace-realtime-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newOrd = payload.new;
          if (
            newOrd &&
            (newOrd.source === "swiggy" || newOrd.source === "zomato") &&
            newOrd.status === "placed"
          ) {
            if (!seenIds.has(newOrd.id)) {
              setSeenIds((prev) => new Set(prev).add(newOrd.id));
              let itemCount = 1;
              if (Array.isArray(newOrd.items)) {
                itemCount = newOrd.items.reduce((acc: number, it: any) => acc + Number(it.qty || it.quantity || 1), 0);
              }
              setActiveAlert({
                id: newOrd.id,
                order_number: newOrd.order_number || 1000,
                source: newOrd.source,
                total: Number(newOrd.total || newOrd.amount || 0),
                item_count: itemCount,
                created_at: newOrd.created_at,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId, seenIds]);

  const navGroups = [
    {
      label: "Overview",
      items: [{ href: "/admin", label: "Dashboard" }],
    },
    {
      label: "Operations",
      items: [
        { href: "/admin/orders", label: "Orders" },
        { href: "/admin/kitchen", label: "Kitchen" },
        { href: "/admin/waiter", label: "Waiter" },
        { href: "/admin/floor", label: "Floor Map & QR" },
        { href: "/admin/reservations", label: "Reservations" },
      ],
    },
    {
      label: "Online Orders",
      items: [{ href: "/admin/online-orders", label: "Online Orders", badge: "Swiggy / Zomato" }],
    },
    {
      label: "Catalog",
      items: [
        { href: "/admin/menu", label: "Menu" },
        { href: "/admin/recipes", label: "Recipes" },
      ],
    },
    {
      label: "Inventory",
      items: [
        { href: "/admin/inventory", label: "Inventory" },
        { href: "/admin/purchasing", label: "Purchasing" },
      ],
    },
    {
      label: "Sales",
      items: [{ href: "/admin/payments", label: "Payments" }],
    },
    {
      label: "Customers",
      items: [
        { href: "/admin/customers", label: "Customers" },
        { href: "/admin/reviews", label: "Reviews" },
        { href: "/admin/loyalty", label: "Loyalty" },
      ],
    },
    {
      label: "Restaurant",
      items: [
        { href: "/admin/staff", label: "Staff" },
        { href: "/admin/roles", label: "Roles" },
        { href: "/admin/settings", label: "Settings" },
      ],
    },
  ];

  function formatMoney(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <>
      {/* Realtime Marketplace Order Alert Banner */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-amber-600 via-wine to-amber-700 text-white shadow-md border-b border-amber-500/30 transition-all duration-300">
          <div className="mx-auto max-w-6xl px-5 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="p-1 rounded-full bg-white/20 animate-bounce">
                <Bell className="w-4 h-4 text-gold" />
              </span>
              <div>
                <span className="font-bold font-serif text-sm mr-2 text-gold">
                  🔔 New {activeAlert.source === "swiggy" ? "Swiggy" : "Zomato"} Order #{activeAlert.order_number}
                </span>
                <span className="opacity-90">
                  {activeAlert.item_count} {activeAlert.item_count === 1 ? "item" : "items"} • {formatMoney(activeAlert.total)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/online-orders"
                onClick={() => setActiveAlert(null)}
                className="px-3 py-1 font-semibold text-ink bg-gold hover:bg-gold-light rounded-lg shadow-xs transition flex items-center gap-1"
              >
                <span>Review Order</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveAlert(null)}
                className="p-1 hover:bg-white/20 rounded-md transition text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-cream2">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-serif text-xl font-bold text-ink">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-gold to-[#b3873a] text-ink text-sm shadow-xs">
              L
            </span>
            Lumière Console
          </Link>

          <div className="flex items-center gap-3">
            {memberships.length > 1 && (
              <form action={switchActiveRestaurantAction}>
                <label className="sr-only" htmlFor="restaurant-context">
                  Active restaurant
                </label>
                <select
                  id="restaurant-context"
                  name="restaurant_id"
                  defaultValue={restaurantId}
                  className="py-1 px-2.5 text-xs bg-neutral-50 border border-cream2 rounded-lg font-medium focus:outline-none text-neutral-700"
                >
                  {memberships.map((m) => (
                    <option key={m.restaurant_id} value={m.restaurant_id}>
                      {m.restaurant.name}
                    </option>
                  ))}
                </select>
              </form>
            )}

            <Link href="/" className="text-xs font-medium text-neutral-500 hover:text-wine transition">
              View site
            </Link>
          </div>
        </div>

        {/* Secondary Categorized Navigation Bar */}
        <div className="bg-neutral-50/90 border-t border-cream2 overflow-x-auto">
          <div className="mx-auto max-w-6xl px-5 py-2 flex items-center gap-6 text-xs whitespace-nowrap">
            {navGroups.map((group, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`py-1 px-2 rounded-md font-medium transition ${
                        isActive
                          ? "bg-wine text-white shadow-xs font-semibold"
                          : "text-neutral-600 hover:text-wine hover:bg-cream"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}
