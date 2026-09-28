const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Parse .env.local manually
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
      if (key && val) {
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing env vars:", { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

async function runBrandingIsolationTest() {
  console.log("=== BRANDING & TENANT ISOLATION TEST ===");

  // 1. Fetch public restaurants
  const { data: restaurants, error: rErr } = await client
    .from("restaurants")
    .select("id, name, slug, logo");

  if (rErr) {
    console.error("Failed to fetch restaurants:", rErr);
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants:`, restaurants.map(r => `${r.name} (${r.id})`));

  if (restaurants.length < 1) {
    console.error("No restaurants found in DB!");
    process.exit(1);
  }

  // 2. Fetch branding for each restaurant
  for (const rest of restaurants) {
    const { data: branding, error: bErr } = await client
      .from("restaurant_branding")
      .select("*")
      .eq("restaurant_id", rest.id)
      .maybeSingle();

    if (bErr) {
      console.log(`Note: RLS/query result for ${rest.name}:`, bErr.message);
    } else {
      console.log(`\n--- Branding for ${rest.name} (${rest.id}) ---`);
      if (branding) {
        console.log(`Primary Color: ${branding.primary_color}`);
        console.log(`Secondary Color: ${branding.secondary_color}`);
        console.log(`Accent Color: ${branding.accent_color}`);
        console.log(`Banner URL: ${branding.banner_url || "none"}`);
      } else {
        console.log("No custom branding row in restaurant_branding table (Using DEFAULT_RESTAURANT_BRANDING)");
      }
    }
  }

  // 3. Verify fallback behavior for getActiveRestaurantBranding simulation
  console.log("\n--- Simulating getActiveRestaurantBranding fallback ---");
  for (const rest of restaurants) {
    const { data: bData } = await client
      .from("restaurant_branding")
      .select("*")
      .eq("restaurant_id", rest.id)
      .maybeSingle();

    const resolvedBranding = {
      primary_color: bData?.primary_color || "#7a2e35",
      secondary_color: bData?.secondary_color || "#16130f",
      accent_color: bData?.accent_color || "#c9a45c",
      banner_url: bData?.banner_url || null,
      font_family: bData?.font_family || "Inter",
    };

    console.log(`Resolved branding for tenant [${rest.name}]:`, JSON.stringify(resolvedBranding, null, 2));
  }

  console.log("\nBranding isolation test complete.");
}

runBrandingIsolationTest();
