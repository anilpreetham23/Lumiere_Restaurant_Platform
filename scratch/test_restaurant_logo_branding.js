const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("LUM-B2B-009 — Restaurant Logo & Public Brand Identity Tests");
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

// 1. Verify default Shinchan logo exists in public directory
const logoPath = path.join(baseDir, "public", "Shinchan.jpg");
assert(fs.existsSync(logoPath), "Default logo asset public/Shinchan.jpg exists");

// 2. Verify tenant.ts exports DEFAULT_RESTAURANT_LOGO and updates types
const tenantPath = path.join(baseDir, "src/lib/tenant.ts");
const tenantContent = fs.readFileSync(tenantPath, 'utf8');

assert(tenantContent.includes("DEFAULT_RESTAURANT_LOGO = \"/Shinchan.jpg\""), "DEFAULT_RESTAURANT_LOGO constant is defined as /Shinchan.jpg");
assert(tenantContent.includes("logo_url?: string | null"), "RestaurantBranding includes logo_url");
assert(tenantContent.includes("background_logo_enabled?: boolean"), "RestaurantBranding includes background_logo_enabled");
assert(tenantContent.includes("background_logo_opacity?: number"), "RestaurantBranding includes background_logo_opacity");

// 3. Verify resolvePublicRestaurantBySlug attaches branding & resolves default logo
assert(tenantContent.includes("logo_url, background_logo_enabled, background_logo_opacity"), "resolvePublicRestaurantBySlug queries logo & watermark columns");
assert(tenantContent.includes("resolvedLogo") || tenantContent.includes("DEFAULT_RESTAURANT_LOGO"), "resolvePublicRestaurantBySlug resolves logo fallback to DEFAULT_RESTAURANT_LOGO");

// 4. Verify admin.ts updates for branding
const adminPath = path.join(baseDir, "src/actions/admin.ts");
const adminContent = fs.readFileSync(adminPath, 'utf8');

assert(adminContent.includes("logo_url?: string | null"), "UpdateRestaurantBrandingInput supports logo_url");
assert(adminContent.includes("background_logo_enabled?: boolean"), "UpdateRestaurantBrandingInput supports background_logo_enabled");
assert(adminContent.includes("background_logo_opacity?: number"), "UpdateRestaurantBrandingInput supports background_logo_opacity");

// 5. Verify updateRestaurantBranding syncs logo to restaurants table
assert(adminContent.includes(".from(\"restaurants\")") && adminContent.includes(".update({ logo: logo_url"), "updateRestaurantBranding syncs logo_url to public.restaurants.logo");

// 6. Verify components exist
const watermarkComponentPath = path.join(baseDir, "src/components/RestaurantWatermark.tsx");
assert(fs.existsSync(watermarkComponentPath), "RestaurantWatermark component exists");

const logoHeaderComponentPath = path.join(baseDir, "src/components/RestaurantLogoHeader.tsx");
assert(fs.existsSync(logoHeaderComponentPath), "RestaurantLogoHeader component exists");

// 7. Verify dynamic public routes
const publicLandingRoutePath = path.join(baseDir, "src/app/(site)/[restaurantSlug]/page.tsx");
assert(fs.existsSync(publicLandingRoutePath), "Dynamic route /[restaurantSlug]/page.tsx exists");

const publicReservationsRoutePath = path.join(baseDir, "src/app/(site)/[restaurantSlug]/reservations/page.tsx");
assert(fs.existsSync(publicReservationsRoutePath), "Dynamic route /[restaurantSlug]/reservations/page.tsx exists");

// 8. Verify admin settings branding UI
const settingsPath = path.join(baseDir, "src/app/admin/settings/page.tsx");
const settingsContent = fs.readFileSync(settingsPath, 'utf8');

assert(settingsContent.includes("Restaurant Logo & Watermark"), "Admin Settings branding section rendered");
assert(settingsContent.includes("Reset to Default Logo"), "Reset to Default Logo option rendered");
assert(settingsContent.includes("Public Background Watermark"), "Background watermark toggle rendered");
assert(settingsContent.includes("Opacity:"), "Watermark opacity slider rendered");

console.log("==================================================");
console.log(`Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL RESTAURANT LOGO & BRANDING TESTS PASSED!");
}
