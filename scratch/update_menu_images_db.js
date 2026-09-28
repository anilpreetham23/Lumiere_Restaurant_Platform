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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

async function updateDbImages() {
  console.log("Updating Supabase menu_items image paths...");

  await supabase.from("menu_items").update({ image: "/img/menu/rayalaseema_chicken_curry.jpg" }).eq("id", "rayalaseema-chicken-curry-wjy5");
  await supabase.from("menu_items").update({ image: "/img/menu/wagyu_nigiri.jpg" }).eq("id", "wagyu-nigiri");
  await supabase.from("menu_items").update({ image: "/img/menu/risotto_tartufo.jpg" }).eq("id", "risotto-tartufo");

  console.log("✅ Database image paths updated!");
}

updateDbImages();
