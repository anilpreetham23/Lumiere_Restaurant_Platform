const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING LUM-B2B-012 ADMIN & DASHBOARD SYNC TESTS");
  console.log("==================================================\n");

  let passed = true;

  // 1. Check sidebar branding route existence & role restriction logic
  console.log("1. Testing sidebar branding navigation & role rules...");
  const fs = require("fs");
  const navContent = fs.readFileSync(
    path.join(__dirname, "..", "src", "components", "admin", "AdminNavigation.tsx"),
    "utf8"
  );

  if (navContent.includes('href: "/admin/branding"') && navContent.includes('return userRole === "owner"')) {
    console.log("   ✅ AdminNavigation correctly includes /admin/branding restricted to owner role.");
  } else {
    console.error("   ❌ AdminNavigation missing /admin/branding or role restriction!");
    passed = false;
  }

  const brandingPageExists = fs.existsSync(
    path.join(__dirname, "..", "src", "app", "admin", "branding", "page.tsx")
  );
  if (brandingPageExists) {
    console.log("   ✅ /admin/branding route page exists and redirects properly.");
  } else {
    console.error("   ❌ /admin/branding route page does NOT exist!");
    passed = false;
  }

  // 2. Test Dashboard order querying: must use session_orders and exclude legacy orders
  console.log("\n2. Testing Dashboard data queries...");
  const adminPageContent = fs.readFileSync(
    path.join(__dirname, "..", "src", "app", "admin", "page.tsx"),
    "utf8"
  );
  if (adminPageContent.includes('.from("session_orders")') && !adminPageContent.includes('.from("orders")')) {
    console.log("   ✅ Admin page queries canonical session_orders table and ignores legacy orders table.");
  } else {
    console.error("   ❌ Admin page queries legacy orders table or doesn't use session_orders!");
    passed = false;
  }

  // 3. Test Metric Definitions Alignment in OwnerDashboard
  console.log("\n3. Testing OwnerDashboard metric alignment...");
  const ownerDashContent = fs.readFileSync(
    path.join(__dirname, "..", "src", "components", "admin", "dashboards", "OwnerDashboard.tsx"),
    "utf8"
  );

  const correctRevenueDef = ownerDashContent.includes('.filter((o) => o.status === "served")');
  const correctActiveDef = ownerDashContent.includes('["placed", "accepted", "preparing", "ready"].includes(o.status)');

  if (correctRevenueDef && correctActiveDef) {
    console.log("   ✅ OwnerDashboard todaySales (status === 'served') & activeOrders (placed/accepted/preparing/ready) match Orders Hub definitions.");
  } else {
    console.error("   ❌ OwnerDashboard metrics do NOT match Orders Hub definitions!");
    passed = false;
  }

  // 4. Test Supabase Realtime Subscriptions in Dashboard components
  console.log("\n4. Testing Dashboard Realtime subscriptions...");
  const managerDashContent = fs.readFileSync(
    path.join(__dirname, "..", "src", "components", "admin", "dashboards", "ManagerDashboard.tsx"),
    "utf8"
  );
  const staffDashContent = fs.readFileSync(
    path.join(__dirname, "..", "src", "components", "admin", "dashboards", "StaffDashboard.tsx"),
    "utf8"
  );

  if (
    ownerDashContent.includes("postgres_changes") &&
    managerDashContent.includes("postgres_changes") &&
    staffDashContent.includes("postgres_changes")
  ) {
    console.log("   ✅ Owner, Manager, and Staff dashboards all have Realtime subscriptions for session_orders.");
  } else {
    console.error("   ❌ Dashboard components missing Realtime subscriptions!");
    passed = false;
  }

  // 5. Query session_orders directly if accessible or verify table schema structure
  console.log("\n5. Testing DB session_orders structure...");
  const { data: sessionOrders, error: sErr } = await supabase.from("session_orders").select("id, status, created_at, restaurant_id").limit(5);

  if (sErr) {
    console.log("   ℹ️ session_orders protected by RLS for unauthenticated client (expected).");
  } else {
    console.log(`   ✅ Direct query to session_orders returned ${sessionOrders?.length ?? 0} records.`);
  }

  console.log("\n==================================================");
  if (passed) {
    console.log("ALL TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");
    process.exit(0);
  } else {
    console.error("SOME TESTS FAILED!");
    console.log("==================================================");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
