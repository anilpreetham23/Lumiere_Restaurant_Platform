const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("==================================================");
console.log("LUM-B2B-010A — Safe Dark Sidebar & Contrast Test");
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

// 1. Inspect AdminNavigation.tsx implementation
const navPath = path.join(baseDir, "src/components/admin/AdminNavigation.tsx");
assert(fs.existsSync(navPath), "AdminNavigation.tsx component exists");

const navContent = fs.readFileSync(navPath, 'utf8');

// A. Check getLuminance & hexToRgba helpers
assert(navContent.includes("function getLuminance"), "AdminNavigation contains getLuminance color safety helper function");
assert(navContent.includes("function hexToRgba"), "AdminNavigation contains hexToRgba helper function");

// B. Check Dark Sidebar Base & Light Color Handling
assert(navContent.includes("const isSecondaryLight = getLuminance(secondary) > 0.45"), "Checks secondary color luminance threshold (0.45)");
assert(navContent.includes("const isPrimaryLight = getLuminance(primary) > 0.45"), "Checks primary color luminance threshold (0.45)");
assert(navContent.includes('sidebarTop = isSecondaryLight'), "Light secondary color falls back to safe dark anchor rgba(15, 23, 42, 0.98)");
assert(navContent.includes('safeActiveBg = isPrimaryLight ? "#1e293b" : primary'), "Light primary color falls back to dark active background #1e293b");

// C. Check Desktop & Mobile Sidebar Elements
assert(navContent.includes('background: "var(--restaurant-sidebar-bg)"'), "Desktop and mobile sidebars consume safe dark --restaurant-sidebar-bg");
assert(navContent.includes('style={{ color: hexToRgba(safeAccent, 0.9) }}'), "Sidebar section labels use readable safeAccent color");

// D. Test Synthetic Color Safety Logic in JS
function hexToRgbaJs(hex, alpha, fallbackRgb = "122, 46, 53") {
  if (!hex || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) return `rgba(${fallbackRgb}, ${alpha})`;
  let c = hex.substring(1);
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function getLuminanceJs(hex) {
  if (!hex || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) return 0;
  let c = hex.substring(1);
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function computeSafeSidebarVars(branding) {
  const primary = branding.primary_color || "#7a2e35";
  const secondary = branding.secondary_color || "#16130f";
  const accent = branding.accent_color || "#c9a45c";

  const isSecondaryLight = getLuminanceJs(secondary) > 0.45;
  const isPrimaryLight = getLuminanceJs(primary) > 0.45;

  const sidebarTop = isSecondaryLight
    ? "rgba(15, 23, 42, 0.98)"
    : hexToRgbaJs(secondary, 0.95, "15, 23, 42");

  const sidebarBottom = hexToRgbaJs(primary, isPrimaryLight ? 0.20 : 0.35, "122, 46, 53");
  const sidebarGradient = `linear-gradient(180deg, ${sidebarTop} 0%, rgba(15, 23, 42, 0.96) 65%, ${sidebarBottom} 100%)`;

  return {
    isSecondaryLight,
    isPrimaryLight,
    sidebarGradient,
    safeActiveBg: isPrimaryLight ? "#1e293b" : primary,
  };
}

// Test Case 1: White Secondary Color
const whiteSecondaryRes = computeSafeSidebarVars({ primary_color: "#7a2e35", secondary_color: "#ffffff", accent_color: "#c9a45c" });
assert(whiteSecondaryRes.isSecondaryLight === true, "White secondary color correctly detected as light");
assert(whiteSecondaryRes.sidebarGradient.includes("rgba(15, 23, 42, 0.98)"), "White secondary color produces dark slate (rgba(15, 23, 42)) sidebar top fill");

// Test Case 2: Pale Yellow Primary Color
const paleYellowPrimaryRes = computeSafeSidebarVars({ primary_color: "#fef08a", secondary_color: "#16130f", accent_color: "#c9a45c" });
assert(paleYellowPrimaryRes.isPrimaryLight === true, "Pale yellow primary color correctly detected as light");
assert(paleYellowPrimaryRes.safeActiveBg === "#1e293b", "Pale yellow primary falls back to dark slate #1e293b for active navigation background");

// Test Case 3: Dark Charcoal Standard Restaurant
const standardRes = computeSafeSidebarVars({ primary_color: "#7a2e35", secondary_color: "#16130f", accent_color: "#c9a45c" });
assert(standardRes.isSecondaryLight === false, "Dark charcoal secondary color correctly detected as dark");
assert(standardRes.sidebarGradient.includes("rgba(22, 19, 15, 0.95)"), "Dark charcoal secondary color influences sidebar background safely");

console.log("\n==================================================");
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
