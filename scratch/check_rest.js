const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, "..", ".env.local");
let envText = fs.readFileSync(envPath, "utf8");

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : process.env[key];
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRest() {
  const { data: rest, error: rErr } = await supabase.from("restaurants").select("id, slug, name");
  console.log("Restaurants:", rest, rErr);

  const { data: items, error: iErr } = await supabase.from("menu_items").select("*");
  console.log("Current menu_items count:", items?.length, "error:", iErr);
  if (items && items.length > 0) {
    console.log("Sample current item:", items[0]);
  }
}

checkRest();
