"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  X,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  LayoutGrid,
  UserCheck,
  CalendarDays,
  Globe,
  BookOpen,
  ChefHat,
  Package,
  Truck,
  CreditCard,
  RotateCcw,
  BarChart3,
  Users,
  Star,
  UserCog,
  ShieldCheck,
  Settings,
  Menu as MenuIcon,
  ExternalLink,
  Store,
  Sparkles,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AdminLogout from "@/components/AdminLogout";
import { CreateRestaurantModal } from "@/components/admin/CreateRestaurantModal";
import { RestaurantBranding, DEFAULT_RESTAURANT_BRANDING, Role } from "@/lib/tenant-types";
import { hasPermission } from "@/lib/permissions";

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
  logo?: string | null;
  branding?: RestaurantBranding;
  memberships: Array<{ restaurant_id: string; restaurant: { name: string; logo?: string | null } }>;
  role?: Role;
  switchActiveRestaurantAction: (formData: FormData) => Promise<void>;
  userEmail?: string | null;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function hexToRgba(hex: string | undefined, alpha: number, fallbackRgb = "122, 46, 53"): string {
  if (!hex || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
    return `rgba(${fallbackRgb}, ${alpha})`;
  }
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function getLuminance(hex: string | undefined): number {
  if (!hex || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) return 0;
  let c = hex.substring(1);
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function AdminNavigation({
  restaurantId,
  restaurantName,
  logo,
  branding,
  memberships,
  role,
  switchActiveRestaurantAction,
  userEmail,
  children,
}: Props) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [activeAlert, setActiveAlert] = useState<NotificationAlert | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const activeBranding = useMemo(() => {
    return branding || DEFAULT_RESTAURANT_BRANDING;
  }, [branding]);

  const primary = activeBranding.primary_color || "#7a2e35";
  const secondary = activeBranding.secondary_color || "#16130f";
  const accent = activeBranding.accent_color || "#c9a45c";

  // Luminance & Safety Derivations
  const isSecondaryLight = getLuminance(secondary) > 0.45;
  const isPrimaryLight = getLuminance(primary) > 0.45;
  const isAccentTooDark = getLuminance(accent) < 0.25;

  const safeAccent = isAccentTooDark ? "#c9a45c" : accent;
  const safeActiveBg = isPrimaryLight ? "#1e293b" : primary;
  const safeActiveText = isPrimaryLight ? primary : "#ffffff";
  const safeActiveIcon = isPrimaryLight ? primary : safeAccent;

  // Always dark sidebar base foundation
  const sidebarTop = isSecondaryLight
    ? "rgba(15, 23, 42, 0.98)"
    : hexToRgba(secondary, 0.95, "15, 23, 42");

  const sidebarBottom = hexToRgba(primary, isPrimaryLight ? 0.20 : 0.35, "122, 46, 53");

  const sidebarGradient = `linear-gradient(180deg, ${sidebarTop} 0%, rgba(15, 23, 42, 0.96) 65%, ${sidebarBottom} 100%)`;

  const themeVars = useMemo(() => {
    return {
      "--restaurant-primary": primary,
      "--restaurant-secondary": secondary,
      "--restaurant-accent": accent,
      "--restaurant-surface": "#f8f7f4",
      "--restaurant-surface-muted": hexToRgba(primary, 0.04),
      "--restaurant-primary-rgba10": hexToRgba(primary, 0.10),
      "--restaurant-primary-rgba20": hexToRgba(primary, 0.20),
      "--restaurant-accent-rgba20": hexToRgba(safeAccent, 0.20),
      "--restaurant-accent-rgba30": hexToRgba(safeAccent, 0.30),
      "--restaurant-sidebar-bg": sidebarGradient,
      "--restaurant-sidebar-border": hexToRgba(safeAccent, 0.22),
      "--restaurant-sidebar-hover": hexToRgba(safeAccent, 0.12),
      "--restaurant-border": hexToRgba(primary, 0.18),
      "--restaurant-workspace-glow": `radial-gradient(ellipse 90% 50% at 50% -10%, ${hexToRgba(primary, 0.07)}, transparent 70%)`,
    } as React.CSSProperties;
  }, [primary, secondary, accent, sidebarGradient, safeAccent]);

  // Deduplicate restaurant memberships by unique restaurant_id
  const uniqueMemberships = useMemo(() => {
    const map = new Map<string, (typeof memberships)[0]>();
    for (const m of memberships) {
      if (m?.restaurant_id && !map.has(m.restaurant_id)) {
        map.set(m.restaurant_id, m);
      }
    }
    return Array.from(map.values());
  }, [memberships]);

  // Subscribe to real-time incoming marketplace orders
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`admin-sidebar-marketplace-realtime-${restaurantId}`)
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
                itemCount = newOrd.items.reduce(
                  (acc: number, it: any) => acc + Number(it.qty || it.quantity || 1),
                  0
                );
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

  const navGroups: NavGroup[] = [
    {
      label: "OVERVIEW",
      items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "OPERATIONS",
      items: [
        { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
        { href: "/admin/kitchen", label: "Kitchen", icon: UtensilsCrossed },
        { href: "/admin/floor", label: "Floor & Tables", icon: LayoutGrid },
        { href: "/admin/waiter", label: "Waiter", icon: UserCheck },
        { href: "/admin/reservations", label: "Reservations", icon: CalendarDays },
      ],
    },
    {
      label: "ONLINE ORDERS",
      items: [
        {
          href: "/admin/online-orders",
          label: "Online Orders",
          icon: Globe,
          badge: "Swiggy / Zomato",
        },
      ],
    },
    {
      label: "CATALOG",
      items: [
        { href: "/admin/menu", label: "Menu", icon: BookOpen },
        { href: "/admin/recipes", label: "Recipes", icon: ChefHat },
      ],
    },
    {
      label: "INVENTORY",
      items: [
        { href: "/admin/inventory", label: "Inventory", icon: Package },
        { href: "/admin/purchasing", label: "Purchasing", icon: Truck },
      ],
    },
    {
      label: "SALES",
      items: [
        { href: "/admin/payments", label: "Payments", icon: CreditCard },
        { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
        { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      ],
    },
    {
      label: "CUSTOMERS",
      items: [
        { href: "/admin/customers", label: "Customers", icon: Users },
        { href: "/admin/reviews", label: "Reviews", icon: Star },
      ],
    },
    {
      label: "RESTAURANT",
      items: [
        { href: "/admin/staff", label: "Staff & Employees", icon: UserCog },
        { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  const userRole: Role = role || "staff";

  const filteredNavGroups = useMemo(() => {
    return navGroups
      .map((group) => {
        const items = group.items.filter((item) => {
          if (item.href === "/admin/refunds") return hasPermission(userRole, "process_refunds");
          if (item.href === "/admin/purchasing") return hasPermission(userRole, "view_purchasing");
          if (item.href === "/admin/payments") return hasPermission(userRole, "view_payments");
          if (item.href === "/admin/reports") return userRole === "owner" || userRole === "manager";
          if (item.href === "/admin/staff") return hasPermission(userRole, "view_staff");
          if (item.href === "/admin/roles") return hasPermission(userRole, "assign_roles") || userRole === "owner" || userRole === "manager";
          if (item.href === "/admin/settings") return hasPermission(userRole, "view_settings");
          return true;
        });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [userRole, navGroups]);

  function isRouteActive(itemHref: string): boolean {
    if (itemHref === "/admin") {
      return pathname === "/admin";
    }
    return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
  }

  function formatMoney(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  const renderNavGroup = (group: NavGroup, isCollapsedSidebar: boolean) => (
    <div key={group.label} className="mb-4">
      {!isCollapsedSidebar ? (
        <div
          className="px-3 pt-2 pb-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors"
          style={{ color: hexToRgba(safeAccent, 0.9) }}
        >
          {group.label}
        </div>
      ) : (
        <div className="my-2 border-t" style={{ borderColor: "var(--restaurant-sidebar-border)" }} />
      )}
      <div className="space-y-1">
        {group.items.map((item) => {
          const isActive = isRouteActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              title={isCollapsedSidebar ? `${group.label}: ${item.label}` : undefined}
              style={
                isActive
                  ? {
                      backgroundColor: safeActiveBg,
                      color: safeActiveText,
                      borderLeftColor: safeAccent,
                      boxShadow: `0 2px 8px ${hexToRgba(primary, 0.35)}`,
                    }
                  : undefined
              }
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "font-semibold shadow-sm border-l-2"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              } ${isCollapsedSidebar ? "justify-center px-0" : ""}`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "" : "text-slate-400"}`}
                style={isActive ? { color: safeActiveIcon } : undefined}
              />
              {!isCollapsedSidebar && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded border whitespace-nowrap"
                      style={{
                        backgroundColor: hexToRgba(safeAccent, 0.2),
                        color: safeAccent,
                        borderColor: hexToRgba(safeAccent, 0.35),
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans transition-all duration-300" style={themeVars}>
      {/* Realtime Marketplace Order Alert Banner */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-amber-600 via-wine to-amber-700 text-white shadow-md border-b border-amber-500/30 transition-all duration-300 z-50">
          <div className="mx-auto max-w-7xl px-4 py-2.5 flex items-center justify-between text-xs">
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

      <div className="flex flex-1 min-h-screen relative">
        {/* Mobile Drawer (Overlay) */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileOpen(false)}
            />
            <aside
              className="relative w-72 max-w-[80vw] text-slate-300 h-full flex flex-col shadow-2xl z-50 transition-all duration-300"
              style={{
                background: "var(--restaurant-sidebar-bg)",
                borderRight: "1px solid var(--restaurant-sidebar-border)",
              }}
            >
              <div
                className="h-16 px-4 flex items-center justify-between border-b"
                style={{ borderColor: "var(--restaurant-sidebar-border)" }}
              >
                <Link
                  href="/admin"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-2.5 font-serif text-lg font-bold text-white min-w-0"
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt={restaurantName}
                      className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0 bg-white/10"
                    />
                  ) : (
                    <span
                      className="grid place-items-center w-8 h-8 rounded-lg text-white font-bold text-xs shadow-xs shrink-0 font-serif"
                      style={{ backgroundColor: safeActiveBg }}
                    >
                      {restaurantName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="flex flex-col min-w-0 truncate">
                    <span className="truncate text-sm font-bold text-white leading-tight">
                      {restaurantName}
                    </span>
                    <span
                      className="text-[10px] font-medium tracking-wide flex items-center gap-1 uppercase"
                      style={{ color: hexToRgba(safeAccent, 0.9) }}
                    >
                      Lumière B2B •{" "}
                      <span
                        className="font-bold text-white px-1 py-0.2 rounded leading-none"
                        style={{ backgroundColor: hexToRgba(safeAccent, 0.25) }}
                      >
                        {userRole}
                      </span>
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {filteredNavGroups.map((g) => renderNavGroup(g, false))}
              </div>
            </aside>
          </div>
        )}

        {/* Desktop Collapsible Left Sidebar */}
        <aside
          className={`hidden lg:flex flex-col text-slate-300 border-r transition-all duration-300 ease-in-out z-30 shrink-0 ${
            isCollapsed ? "w-20" : "w-64"
          }`}
          style={{
            background: "var(--restaurant-sidebar-bg)",
            borderColor: "var(--restaurant-sidebar-border)",
          }}
        >
          {/* Sidebar Header */}
          <div
            className="h-16 px-4 flex items-center justify-between border-b transition-colors"
            style={{ borderColor: "var(--restaurant-sidebar-border)" }}
          >
            <Link
              href="/admin"
              className={`flex items-center gap-2.5 font-serif text-lg font-bold text-white overflow-hidden transition-all ${
                isCollapsed ? "justify-center w-full" : ""
              }`}
            >
              {logo ? (
                <img
                  src={logo}
                  alt={restaurantName}
                  className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0 bg-white/10"
                />
              ) : (
                <span
                  className="grid place-items-center w-8 h-8 rounded-lg text-white font-bold text-xs shadow-xs shrink-0 font-serif"
                  style={{ backgroundColor: safeActiveBg }}
                >
                  {restaurantName.charAt(0).toUpperCase()}
                </span>
              )}
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 truncate">
                  <span className="truncate text-sm font-bold text-white leading-tight">
                    {restaurantName}
                  </span>
                  <span
                    className="text-[10px] font-medium tracking-wide flex items-center gap-1 uppercase"
                    style={{ color: hexToRgba(safeAccent, 0.9) }}
                  >
                    Workspace •{" "}
                    <span
                      className="font-bold text-white px-1 py-0.2 rounded leading-none"
                      style={{ backgroundColor: hexToRgba(safeAccent, 0.25) }}
                    >
                      {userRole}
                    </span>
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Sidebar Navigation Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {filteredNavGroups.map((g) => renderNavGroup(g, isCollapsed))}
          </div>

          {/* Sidebar Footer with Collapse Toggle */}
          <div
            className="p-3 border-t flex items-center justify-between transition-colors"
            style={{ borderColor: "var(--restaurant-sidebar-border)" }}
          >
            {!isCollapsed && userEmail && (
              <span className="text-[11px] text-slate-400 truncate max-w-[140px]" title={userEmail}>
                {userEmail}
              </span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition ${
                isCollapsed ? "mx-auto" : ""
              }`}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* Main Content Wrapper */}
        <div
          className="flex-1 flex flex-col min-w-0 relative transition-all duration-300"
          style={{
            backgroundColor: "#f8f7f4",
            backgroundImage: "var(--restaurant-workspace-glow)",
          }}
        >
          {/* Top Bar Header */}
          <header
            className="h-16 bg-white/95 backdrop-blur-xs border-b px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs transition-colors duration-300"
            style={{ borderColor: hexToRgba(primary, 0.15) }}
          >
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg text-neutral-600 hover:text-ink hover:bg-neutral-100 transition"
              >
                <MenuIcon className="w-5 h-5" />
              </button>

              {/* Desktop Toggle Button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-2 rounded-lg text-neutral-500 hover:text-ink hover:bg-neutral-100 transition"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2.5">
                {logo ? (
                  <img
                    src={logo}
                    alt={restaurantName}
                    className="w-6 h-6 rounded object-cover border border-neutral-200 shrink-0"
                  />
                ) : (
                  <span
                    className="w-6 h-6 rounded grid place-items-center text-white text-[11px] font-bold font-serif shadow-2xs shrink-0"
                    style={{ backgroundColor: safeActiveBg }}
                  >
                    {restaurantName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="font-serif font-bold text-ink text-sm sm:text-base truncate max-w-[180px] sm:max-w-xs">
                  {restaurantName}
                </span>
                <span
                  className="hidden md:inline-flex px-2.5 py-0.5 text-[10px] font-bold rounded-full border shadow-2xs shrink-0 transition-colors"
                  style={{
                    backgroundColor: hexToRgba(primary, 0.08),
                    color: isPrimaryLight ? "#1e293b" : primary,
                    borderColor: hexToRgba(primary, 0.25),
                  }}
                >
                  Active Workspace
                </span>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Marketplace Notification Pill if present */}
              {activeAlert && (
                <Link
                  href="/admin/online-orders"
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/30 rounded-full text-xs font-semibold hover:bg-amber-500/20 transition animate-pulse"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Marketplace Order</span>
                </Link>
              )}

              {/* Multi-Restaurant Switcher */}
              <div className="flex items-center gap-1.5">
                {uniqueMemberships.length > 0 && (
                  <form action={switchActiveRestaurantAction} className="flex items-center">
                    <label className="sr-only" htmlFor="restaurant-context">
                      Active restaurant
                    </label>
                    <select
                      id="restaurant-context"
                      name="restaurant_id"
                      defaultValue={restaurantId}
                      onChange={(e) => {
                        if (e.target.value === "__add_restaurant__") {
                          e.target.value = restaurantId;
                          setIsCreateModalOpen(true);
                        } else {
                          e.target.form?.requestSubmit();
                        }
                      }}
                      className="py-1.5 px-2.5 text-xs bg-neutral-50/90 border rounded-lg font-medium focus:outline-none text-neutral-700 shadow-2xs cursor-pointer max-w-[140px] sm:max-w-[190px] truncate transition-all"
                      style={{
                        borderColor: hexToRgba(primary, 0.25),
                      }}
                    >
                      <optgroup label="Your Restaurants">
                        {uniqueMemberships.map((m) => (
                          <option key={m.restaurant_id} value={m.restaurant_id}>
                            {m.restaurant.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Actions">
                        <option value="__add_restaurant__">+ Add Restaurant...</option>
                      </optgroup>
                    </select>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  title="Create new restaurant"
                  className="px-2.5 py-1.5 bg-cream hover:bg-cream2 text-wine rounded-lg text-xs font-semibold transition border border-cream2 shadow-2xs flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-wine" />
                  <span className="hidden sm:inline text-[11px]">Add Restaurant</span>
                </button>
              </div>

              {/* View Site Link */}
              <Link
                href="/"
                target="_blank"
                className="hidden sm:flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-wine transition"
              >
                <span>View site</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              <div className="h-4 w-px bg-neutral-200 hidden sm:block" />

              {/* User Account / Logout */}
              <AdminLogout />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 px-4 lg:px-8 py-8 max-w-7xl w-full mx-auto relative z-10">{children}</main>

          {/* Optional Subtle Logo Watermark (Requirement 8) */}
          {activeBranding.background_logo_enabled && (logo || activeBranding.logo_url) && (
            <div
              className="pointer-events-none fixed right-8 bottom-8 z-0 opacity-[0.035] transition-opacity duration-300 hidden md:block select-none"
              aria-hidden="true"
            >
              <img
                src={logo || activeBranding.logo_url || ""}
                alt=""
                className="w-72 h-72 object-contain grayscale"
              />
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Creation Modal */}
      <CreateRestaurantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
