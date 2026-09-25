import { Role } from "@/lib/tenant-types";

export type ModuleCategory =
  | "Dashboard"
  | "Orders"
  | "Kitchen"
  | "Waiter"
  | "Floor & Tables"
  | "Menu"
  | "Recipes"
  | "Inventory"
  | "Purchasing"
  | "Reservations"
  | "Payments"
  | "Customers"
  | "Reviews"
  | "Staff"
  | "Settings";

export type Permission =
  | "view_dashboard"
  | "view_orders"
  | "create_orders"
  | "update_order_status"
  | "cancel_orders"
  | "view_kitchen"
  | "update_kitchen_status"
  | "view_service_requests"
  | "resolve_service_requests"
  | "view_floor"
  | "manage_tables"
  | "manage_qr"
  | "view_menu"
  | "manage_menu"
  | "view_recipes"
  | "manage_recipes"
  | "view_inventory"
  | "manage_inventory"
  | "adjust_stock"
  | "view_purchasing"
  | "manage_suppliers"
  | "manage_purchase_orders"
  | "receive_stock"
  | "view_reservations"
  | "manage_reservations"
  | "view_payments"
  | "process_refunds"
  | "view_customers"
  | "manage_customers"
  | "view_reviews"
  | "moderate_reviews"
  | "view_staff"
  | "manage_staff"
  | "invite_staff"
  | "assign_roles"
  | "view_settings"
  | "manage_settings"
  | "manage_branding";

export type PermissionDefinition = {
  key: Permission;
  label: string;
  category: ModuleCategory;
  roles: {
    owner: boolean;
    manager: boolean;
    staff: boolean;
  };
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Dashboard
  { key: "view_dashboard", label: "View Analytics & Dashboard", category: "Dashboard", roles: { owner: true, manager: true, staff: true } },

  // Orders
  { key: "view_orders", label: "View Live Orders", category: "Orders", roles: { owner: true, manager: true, staff: true } },
  { key: "create_orders", label: "Create POS Orders", category: "Orders", roles: { owner: true, manager: true, staff: true } },
  { key: "update_order_status", label: "Update Order Status", category: "Orders", roles: { owner: true, manager: true, staff: true } },
  { key: "cancel_orders", label: "Cancel Active Orders", category: "Orders", roles: { owner: true, manager: true, staff: false } },

  // Kitchen
  { key: "view_kitchen", label: "View KDS Display", category: "Kitchen", roles: { owner: true, manager: true, staff: true } },
  { key: "update_kitchen_status", label: "Update Cooking Status", category: "Kitchen", roles: { owner: true, manager: true, staff: true } },

  // Waiter
  { key: "view_service_requests", label: "View Table Service Requests", category: "Waiter", roles: { owner: true, manager: true, staff: true } },
  { key: "resolve_service_requests", label: "Resolve Service Requests", category: "Waiter", roles: { owner: true, manager: true, staff: true } },

  // Floor & Tables
  { key: "view_floor", label: "View Floor Plan & QR Codes", category: "Floor & Tables", roles: { owner: true, manager: true, staff: true } },
  { key: "manage_tables", label: "Manage Tables & Layout", category: "Floor & Tables", roles: { owner: true, manager: true, staff: false } },
  { key: "manage_qr", label: "Regenerate Table QR Codes", category: "Floor & Tables", roles: { owner: true, manager: true, staff: false } },

  // Menu
  { key: "view_menu", label: "View Menu Items", category: "Menu", roles: { owner: true, manager: true, staff: true } },
  { key: "manage_menu", label: "Create/Edit Menu & Prices", category: "Menu", roles: { owner: true, manager: true, staff: false } },

  // Recipes
  { key: "view_recipes", label: "View Recipes & BOM", category: "Recipes", roles: { owner: true, manager: true, staff: true } },
  { key: "manage_recipes", label: "Manage Ingredients & BOM", category: "Recipes", roles: { owner: true, manager: true, staff: false } },

  // Inventory
  { key: "view_inventory", label: "View Stock Levels & Movement", category: "Inventory", roles: { owner: true, manager: true, staff: true } },
  { key: "manage_inventory", label: "Manage Inventory Catalog", category: "Inventory", roles: { owner: true, manager: true, staff: false } },
  { key: "adjust_stock", label: "Manual Stock Adjustment", category: "Inventory", roles: { owner: true, manager: true, staff: false } },

  // Purchasing
  { key: "view_purchasing", label: "View Suppliers & Purchase Orders", category: "Purchasing", roles: { owner: true, manager: true, staff: false } },
  { key: "manage_suppliers", label: "Create & Edit Suppliers", category: "Purchasing", roles: { owner: true, manager: true, staff: false } },
  { key: "manage_purchase_orders", label: "Create & Issue Purchase Orders", category: "Purchasing", roles: { owner: true, manager: true, staff: false } },
  { key: "receive_stock", label: "Receive Goods & Fulfill POs", category: "Purchasing", roles: { owner: true, manager: true, staff: false } },

  // Reservations
  { key: "view_reservations", label: "View Table Reservations", category: "Reservations", roles: { owner: true, manager: true, staff: true } },
  { key: "manage_reservations", label: "Create & Manage Reservations", category: "Reservations", roles: { owner: true, manager: true, staff: true } },

  // Payments
  { key: "view_payments", label: "View Payment Ledger", category: "Payments", roles: { owner: true, manager: true, staff: false } },
  { key: "process_refunds", label: "Process Payment Refunds", category: "Payments", roles: { owner: true, manager: false, staff: false } },

  // Customers
  { key: "view_customers", label: "View Customer Profiles", category: "Customers", roles: { owner: true, manager: true, staff: true } },
  { key: "manage_customers", label: "Edit Customer Notes & Details", category: "Customers", roles: { owner: true, manager: true, staff: false } },

  // Reviews
  { key: "view_reviews", label: "View Customer Reviews & Ratings", category: "Reviews", roles: { owner: true, manager: true, staff: true } },
  { key: "moderate_reviews", label: "Respond & Moderate Reviews", category: "Reviews", roles: { owner: true, manager: true, staff: false } },


  // Staff
  { key: "view_staff", label: "View Staff List & Roles", category: "Staff", roles: { owner: true, manager: true, staff: false } },
  { key: "manage_staff", label: "Manage Staff Membership Status", category: "Staff", roles: { owner: true, manager: true, staff: false } },
  { key: "invite_staff", label: "Send Staff Invitations", category: "Staff", roles: { owner: true, manager: true, staff: false } },
  { key: "assign_roles", label: "Assign & Modify Roles", category: "Staff", roles: { owner: true, manager: true, staff: false } },

  // Settings
  { key: "view_settings", label: "View Restaurant Settings", category: "Settings", roles: { owner: true, manager: true, staff: false } },
  { key: "manage_settings", label: "Edit Operational Settings", category: "Settings", roles: { owner: true, manager: true, staff: false } },
  { key: "manage_branding", label: "Manage Theme & Logos", category: "Settings", roles: { owner: true, manager: false, staff: false } },
];

export function hasPermission(role: Role, permission: Permission): boolean {
  const def = PERMISSION_DEFINITIONS.find((p) => p.key === permission);
  if (!def) return false;
  return def.roles[role] ?? false;
}

export function getRolePermissions(role: Role): Permission[] {
  return PERMISSION_DEFINITIONS.filter((p) => p.roles[role]).map((p) => p.key);
}
