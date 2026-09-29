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

const RESTAURANTS = [
  "00000000-0000-0000-0000-000000000001", // Lumiere
  "2d708951-bb5f-4bbc-92f6-f4ac6dc7fcb3"  // Sri Divya Family Restaurant
];

const CREDENTIALS_TO_PROVISION = [
  {
    email: "owner@lumiere.com",
    password: "Password123!",
    role: "owner",
    fullName: "Lumière Restaurant Owner",
  },
  {
    email: "manager@lumiere.com",
    password: "Password123!",
    role: "manager",
    fullName: "Sophia Vance (General Manager)",
    empCode: "EMP-1008"
  },
  {
    email: "chef@lumiere.com",
    password: "Password123!",
    role: "manager", // Head Chef / Chief Kitchen Lead
    fullName: "Antoine Laurent (Master Chef)",
    empCode: "EMP-1001"
  },
  {
    email: "waiter@lumiere.com",
    password: "Password123!",
    role: "staff",
    fullName: "Matteo Rossi (Head Waiter)",
    empCode: "EMP-1009"
  },
  {
    email: "store@lumiere.com",
    password: "Password123!",
    role: "manager",
    fullName: "Elena Rostova (Inventory Manager)",
    empCode: "EMP-1006"
  }
];

async function main() {
  console.log("Provisioning Staff Auth Credentials & Memberships in Supabase...\n");

  for (const cred of CREDENTIALS_TO_PROVISION) {
    console.log(`Processing: ${cred.email} (${cred.role})...`);

    // 1. Try to sign in first to get user ID if account exists
    let userId = null;
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: cred.email,
      password: cred.password,
    });

    if (signInData?.user) {
      userId = signInData.user.id;
      console.log(`  ✓ Existing Auth Account Found: ${userId}`);
    } else {
      // Sign up new user
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cred.email,
        password: cred.password,
        options: {
          data: { full_name: cred.fullName }
        }
      });

      if (signUpErr) {
        console.error(`  ✕ Error signing up ${cred.email}:`, signUpErr.message);
        continue;
      }

      userId = signUpData.user?.id;
      console.log(`  ✓ Created New Auth Account: ${userId}`);
    }

    if (!userId) continue;

    // 2. Ensure restaurant memberships exist for all active restaurants
    for (const restId of RESTAURANTS) {
      const { data: existingMem } = await supabase
        .from("restaurant_memberships")
        .select("id, role")
        .eq("restaurant_id", restId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingMem) {
        const { error: memErr } = await supabase.from("restaurant_memberships").insert({
          restaurant_id: restId,
          user_id: userId,
          role: cred.role,
          status: "active"
        });
        if (memErr) {
          console.error(`  ✕ Failed to add membership for ${restId}:`, memErr.message);
        } else {
          console.log(`  ✓ Created Membership for restaurant ${restId} as ${cred.role}`);
        }
      } else {
        console.log(`  ✓ Existing Membership verified for restaurant ${restId} (${existingMem.role})`);
      }
    }

    // 3. Link employee_records if empCode provided
    if (cred.empCode) {
      const { error: empErr } = await supabase
        .from("employee_records")
        .update({ user_id: userId, status: "active", updated_at: new Date().toISOString() })
        .eq("employee_code", cred.empCode);

      if (empErr) {
        console.error(`  ✕ Failed to link employee record ${cred.empCode}:`, empErr.message);
      } else {
        console.log(`  ✓ Linked employee record ${cred.empCode} to user ${userId}`);
      }
    }
  }

  console.log("\n=== ALL CREATION & MEMBERSHIP ASSIGNMENTS COMPLETE ===");
}

main().catch(console.error);
