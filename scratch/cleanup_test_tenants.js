const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Read .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectRestaurants() {
  console.log("=== INSPECTING CURRENT RESTAURANTS IN DATABASE ===");
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, status, created_at")
    .order("created_at");

  if (error) {
    console.error("Failed to query restaurants:", error.message);
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants:\n`);
  restaurants.forEach((r) => {
    console.log(`- ID: ${r.id}`);
    console.log(`  Name: ${r.name}`);
    console.log(`  Slug: ${r.slug}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Created: ${r.created_at}\n`);
  });
}

inspectRestaurants();
