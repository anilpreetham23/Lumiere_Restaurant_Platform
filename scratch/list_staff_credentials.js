import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    envVars[key] = val;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  console.log("Fetching restaurant memberships and employees...");

  const { data: restaurants } = await supabase.from("restaurants").select("id, name, slug");
  console.log("\n=== RESTAURANTS ===");
  console.table(restaurants);

  const { data: memberships } = await supabase.from("restaurant_memberships").select("*");
  console.log("\n=== MEMBERSHIPS ===");
  console.table(memberships);

  const { data: employees } = await supabase.from("employee_records").select("id, employee_code, full_name, email, department, designation, user_id, status");
  console.log("\n=== EMPLOYEES ===");
  console.table(employees);
}

main().catch(console.error);
