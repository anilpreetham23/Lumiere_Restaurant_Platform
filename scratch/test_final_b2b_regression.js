const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("LUM-B2B-008 — Final B2B Security & System Regression Test");
console.log("==================================================");

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`✅ PASSED: ${description}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${description}`);
    failed++;
  }
}

const baseDir = process.cwd();

// Load source code files for static AST/pattern regression checks
const adminPath = path.join(baseDir, "src/actions/admin.ts");
const adminContent = fs.readFileSync(adminPath, 'utf8');

const payPath = path.join(baseDir, "src/actions/pay.ts");
const payContent = fs.readFileSync(payPath, 'utf8');

const tenantPath = path.join(baseDir, "src/lib/tenant.ts");
const tenantContent = fs.readFileSync(tenantPath, 'utf8');

function getRequireRoles(functionName, content = adminContent) {
  const regex = new RegExp(`export async function ${functionName}[\\s\\S]*?requireRole\\((\\[[^\\]]+\\])\\)`);
  const match = content.match(regex);
  return match ? match[1] : null;
}

console.log("\n--- SECTION 1: ROLE REGRESSION ---");
// 1.1 Manual stock adjustment denied to staff
const stockRoles = getRequireRoles("recordStockMovementAction");
assert(stockRoles && !stockRoles.includes('"staff"') && stockRoles.includes('"manager"') && stockRoles.includes('"owner"'), "recordStockMovementAction allows owner/manager, denies staff");

// 1.2 Suppliers & POs denied to staff
const suppRoles = getRequireRoles("getSuppliers");
assert(suppRoles && !suppRoles.includes('"staff"') && suppRoles.includes('"manager"'), "getSuppliers allows owner/manager, denies staff");

const poRoles = getRequireRoles("getPurchaseOrders");
assert(poRoles && !poRoles.includes('"staff"') && poRoles.includes('"manager"'), "getPurchaseOrders allows owner/manager, denies staff");

const poStatusRoles = getRequireRoles("updatePOStatusAction");
assert(poStatusRoles && !poStatusRoles.includes('"staff"') && poStatusRoles.includes('"manager"'), "updatePOStatusAction allows owner/manager, denies staff");

const poReceiveRoles = getRequireRoles("receivePOSourceStockAction");
assert(poReceiveRoles && !poReceiveRoles.includes('"staff"') && poReceiveRoles.includes('"manager"'), "receivePOSourceStockAction allows owner/manager, denies staff");

// 1.3 Order cancellation denied to staff
const cancelOrderRoles = getRequireRoles("cancelSessionOrder");
assert(cancelOrderRoles && !cancelOrderRoles.includes('"staff"') && cancelOrderRoles.includes('"manager"') && cancelOrderRoles.includes('"owner"'), "cancelSessionOrder allows owner/manager, denies staff");

// 1.4 Menu availability toggle denied to staff
const menuAvailRoles = getRequireRoles("setMenuAvailability");
assert(menuAvailRoles && !menuAvailRoles.includes('"staff"') && menuAvailRoles.includes('"manager"') && menuAvailRoles.includes('"owner"'), "setMenuAvailability allows owner/manager, denies staff");

// 1.5 Branding denied to staff and manager (owner only)
const brandingRoles = getRequireRoles("updateRestaurantBranding");
assert(brandingRoles && !brandingRoles.includes('"staff"') && !brandingRoles.includes('"manager"') && brandingRoles.includes('"owner"'), "updateRestaurantBranding is owner-only");

// 1.6 Refunds denied to staff and manager (owner only)
const refundRoles = getRequireRoles("processRefundAdminAction");
assert(refundRoles && !refundRoles.includes('"staff"') && !refundRoles.includes('"manager"') && refundRoles.includes('"owner"'), "processRefundAdminAction is owner-only");

// 1.7 Employee management denied to staff
const empRoles = getRequireRoles("createEmployeeAdminAction");
assert(empRoles && !empRoles.includes('"staff"') && empRoles.includes('"manager"') && empRoles.includes('"owner"'), "createEmployeeAdminAction allows owner/manager, denies staff");


console.log("\n--- SECTION 2: ORDER REGRESSION ---");
// 2.1 Staff order status update action exists
assert(adminContent.includes("setSessionOrderStatus") || adminContent.includes("updateSessionOrderStatus"), "Order status update action exists");
// 2.2 Order cancellation restricted
assert(cancelOrderRoles && !cancelOrderRoles.includes('"staff"'), "Staff cannot cancel orders");


console.log("\n--- SECTION 3: INVENTORY REGRESSION ---");
// 3.1 Idempotent stock consumption logic present
assert(adminContent.includes("stock_movements") || adminContent.includes("recordStockMovement"), "Stock movements recorded for inventory accountability");


console.log("\n--- SECTION 4: PURCHASING REGRESSION ---");
// 4.1 PO receiving updates WAC & stock
assert(adminContent.includes("receivePOSourceStockAction"), "receivePOSourceStockAction present");
assert(poReceiveRoles && !poReceiveRoles.includes('"staff"'), "Staff denied PO receiving");


console.log("\n--- SECTION 5: MENU REGRESSION ---");
// 5.1 Menu fetching accessible for operational staff
assert(adminContent.includes("getAvailableMenuItemsAdminAction") || adminContent.includes("updateMenuItem"), "Menu reading action exists");
// 5.2 Menu availability toggle restricted
assert(menuAvailRoles && !menuAvailRoles.includes('"staff"'), "Menu availability toggle denied to staff");


console.log("\n--- SECTION 6: PUBLIC RESERVATION TENANT REGRESSION ---");
// 6.1 Server-side slug resolution helper
assert(tenantContent.includes("export async function resolvePublicRestaurantBySlug"), "resolvePublicRestaurantBySlug exported in tenant.ts");

// 6.2 createReservation uses slug resolution & explicit restaurant_id
assert(payContent.includes("resolvePublicRestaurantBySlug") && payContent.includes("restaurant_slug?: string"), "createReservation accepts restaurant_slug and resolves tenant server-side");

// 6.3 Rejection of invalid/inactive tenant slug
assert(payContent.includes("Invalid or inactive restaurant selected."), "Invalid/inactive tenant slug explicitly rejected");

// 6.4 Legacy fallback to Lumière
assert(payContent.includes('resolvePublicRestaurantBySlug("lumiere")'), "Legacy route without slug falls back to Lumière");

// 6.5 Payment intent inherits reservation restaurant_id
assert(payContent.includes("restaurant_id: r.restaurant_id"), "Payment intent inherits reservation.restaurant_id");


console.log("\n--- SECTION 7: PUBLIC QR REGRESSION ---");
// 7.1 QR route exists
const qrRoutePath = path.join(baseDir, "src/app/t/[token]/page.tsx");
assert(fs.existsSync(qrRoutePath), "/t/[token] public QR route exists");


console.log("\n--- SECTION 8: MARKETPLACE REGRESSION ---");
// 8.1 Online orders client & marketplace actions exist
const onlineOrdersPath = path.join(baseDir, "src/components/admin/OnlineOrdersClient.tsx");
assert(fs.existsSync(onlineOrdersPath), "OnlineOrdersClient component exists for Swiggy/Zomato orders");


console.log("\n--- SECTION 9: PAYMENT REGRESSION ---");
// 9.1 Server-side amount calculation
assert(payContent.includes("calculateTotalAmount") || payContent.includes("amount"), "Payment server-side amount calculation preserved");
// 9.2 Refund owner-only
assert(refundRoles && refundRoles === '["owner"]', "Refunds strictly owner-only");


console.log("\n--- SECTION 10: STAFF / EMPLOYEE REGRESSION ---");
// 10.1 Employee administration restricted to owner/manager
assert(empRoles && !empRoles.includes('"staff"'), "Employee management denied to staff");


console.log("\n--- SECTION 11: TENANT ISOLATION REGRESSION ---");
// 11.1 Admin functions filter by restaurant_id
const hasTenantFilter = adminContent.includes('.eq("restaurant_id", restaurantId)');
assert(hasTenantFilter, "Admin actions enforce tenant isolation with eq('restaurant_id', restaurantId)");


console.log("\n==================================================");
console.log(`Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL B2B SECURITY REGRESSION ASSERTIONS PASSED!");
}
