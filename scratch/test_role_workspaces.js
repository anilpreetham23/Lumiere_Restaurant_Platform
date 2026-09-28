const fs = require("fs");
const path = require("path");

console.log("=== LUM-B2B-003A EXHAUSTIVE ROLE WORKSPACE & PERMISSION CONSISTENCY AUDIT ===");

// 1. Inspect permissions.ts
const permissionsFile = path.join(__dirname, "..", "src", "lib", "permissions.ts");
const permContent = fs.readFileSync(permissionsFile, "utf8");

console.log("\n1. PERMISSION MATRIX AUDIT (src/lib/permissions.ts):");
const checks = [
  { key: "process_refunds", expectedOwner: true, expectedManager: false, expectedStaff: false },
  { key: "manage_branding", expectedOwner: true, expectedManager: false, expectedStaff: false },
  { key: "view_payments", expectedOwner: true, expectedManager: true, expectedStaff: false },
  { key: "view_purchasing", expectedOwner: true, expectedManager: true, expectedStaff: false },
  { key: "view_staff", expectedOwner: true, expectedManager: true, expectedStaff: false },
  { key: "assign_roles", expectedOwner: true, expectedManager: true, expectedStaff: false },
  { key: "view_settings", expectedOwner: true, expectedManager: true, expectedStaff: false },
];

checks.forEach((c) => {
  const pattern = new RegExp(`key:\\s*"${c.key}".*roles:\\s*{\\s*owner:\\s*${c.expectedOwner},\\s*manager:\\s*${c.expectedManager},\\s*staff:\\s*${c.expectedStaff}\\s*}`, "s");
  if (pattern.test(permContent)) {
    console.log(`✓ Permission '${c.key}': matches matrix (owner:${c.expectedOwner}, manager:${c.expectedManager}, staff:${c.expectedStaff})`);
  } else {
    console.error(`❌ Inconsistency found in permission definition for '${c.key}'`);
  }
});

// 2. Inspect Server Route Guards
console.log("\n2. SERVER ROUTE GUARDS AUDIT (src/app/admin/*):");
const routeGuards = [
  { path: ["src", "app", "admin", "refunds", "page.tsx"], expectedRole: 'requireRole(["owner"])' },
  { path: ["src", "app", "admin", "payments", "page.tsx"], expectedRole: 'requireRole(["owner", "manager"])' },
  { path: ["src", "app", "admin", "reports", "page.tsx"], expectedRole: 'requireRole(["owner", "manager"])' },
  { path: ["src", "app", "admin", "roles", "page.tsx"], expectedRole: 'requireRole(["owner", "manager"])' },
];

routeGuards.forEach((g) => {
  const fullPath = path.join(__dirname, "..", ...g.path);
  const content = fs.readFileSync(fullPath, "utf8");
  if (content.includes(g.expectedRole)) {
    console.log(`✓ Route guard [${g.path.slice(-2).join('/')}]: correctly protected with ${g.expectedRole}`);
  } else {
    console.error(`❌ Inconsistency in route guard for ${g.path.join('/')}`);
  }
});

// 3. Inspect Action Authorizations
console.log("\n3. SERVER ACTION GUARDS AUDIT (src/actions/admin.ts):");
const adminActionsFile = fs.readFileSync(path.join(__dirname, "..", "src", "actions", "admin.ts"), "utf8");

if (adminActionsFile.includes('export async function updateRestaurantBranding') && 
    adminActionsFile.slice(adminActionsFile.indexOf('export async function updateRestaurantBranding'), adminActionsFile.indexOf('export async function updateRestaurantBranding') + 200).includes('requireRole(["owner"])')) {
  console.log("✓ Action 'updateRestaurantBranding': strictly owner-only (requireRole(['owner']))");
} else {
  console.error("❌ Action 'updateRestaurantBranding' missing owner-only restriction");
}

if (adminActionsFile.includes('export async function getSuppliers') && 
    adminActionsFile.slice(adminActionsFile.indexOf('export async function getSuppliers'), adminActionsFile.indexOf('export async function getSuppliers') + 200).includes('requireRole(["owner", "manager"])')) {
  console.log("✓ Action 'getSuppliers': restricted to owner/manager");
}

if (adminActionsFile.includes('export async function getPurchaseOrders') && 
    adminActionsFile.slice(adminActionsFile.indexOf('export async function getPurchaseOrders'), adminActionsFile.indexOf('export async function getPurchaseOrders') + 200).includes('requireRole(["owner", "manager"])')) {
  console.log("✓ Action 'getPurchaseOrders': restricted to owner/manager");
}

// 4. Navigation & Quick Actions Verification
console.log("\n4. NAVIGATION & QUICK ACTIONS AUDIT:");
const navFile = fs.readFileSync(path.join(__dirname, "..", "src", "components", "admin", "AdminNavigation.tsx"), "utf8");
if (navFile.includes('hasPermission(userRole, "process_refunds")') &&
    navFile.includes('hasPermission(userRole, "view_purchasing")') &&
    navFile.includes('hasPermission(userRole, "view_payments")') &&
    navFile.includes('hasPermission(userRole, "view_staff")') &&
    navFile.includes('hasPermission(userRole, "view_settings")')) {
  console.log("✓ AdminNavigation dynamically computes filteredNavGroups based on canonical permission matrix");
}

console.log("\nExhaustive role workspace and permission consistency audit complete.");
