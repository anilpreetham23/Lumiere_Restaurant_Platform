const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Read .env.local manually
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

const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log("=== LUM-B2B-001 Restaurant Creation & Security Verification Suite ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Unauthenticated creation must be rejected
    const { data: unauthRes, error: unauthErr } = await anonSupabase.rpc("create_restaurant_with_owner", {
      p_name: "Unauth Bistro",
      p_slug: "unauth-bistro-test",
    });
    assert(
      unauthErr && (unauthErr.message.includes("Not authenticated") || unauthErr.message.includes("permission denied") || unauthErr.code === "42501" || unauthErr.message.includes("not_authenticated")),
      "Test A: Unauthenticated user cannot create restaurant RPC"
    );

    // 2. Sign up / Sign in test user
    const user1Email = `b2b_owner_${Date.now()}@lumiere.test`;
    const user1Password = "TestPassword123!";

    const clientUser1 = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signUpData, error: signUpErr } = await clientUser1.auth.signUp({
      email: user1Email,
      password: user1Password,
    });

    if (signUpErr) {
      console.error("SignUp error:", signUpErr.message);
    }
    assert(signUpData?.user, `User1 signed up successfully (${user1Email})`);

    // 3. Authenticated creation succeeds & creator receives owner membership
    const testSlug1 = `olive-garden-hyd-${Date.now().toString(36)}`;
    const { data: restId1, error: createErr1 } = await clientUser1.rpc("create_restaurant_with_owner", {
      p_name: "Olive Garden Hyderabad",
      p_slug: testSlug1,
      p_phone: "+91 9876543210",
      p_email: "hyd@olivegarden.test",
      p_address: "Jubilee Hills, Hyderabad",
    });

    assert(!createErr1 && restId1, `Test B1: Authenticated creation succeeds (ID: ${restId1})`);

    // Verify user can read own membership
    const { data: memb1, error: membErr1 } = await clientUser1
      .from("restaurant_memberships")
      .select("*")
      .eq("restaurant_id", restId1)
      .single();

    assert(
      !membErr1 && memb1 && memb1.role === "owner" && memb1.status === "active",
      "Test B2: Creator automatically receives 'owner' membership"
    );

    // Verify settings initialization
    const { data: settings1 } = await clientUser1
      .from("restaurant_settings")
      .select("*")
      .eq("restaurant_id", restId1)
      .single();
    assert(settings1 && settings1.restaurant_name === "Olive Garden Hyderabad", "Test B3: Default settings initialized");

    // Verify branding initialization
    const { data: branding1 } = await clientUser1
      .from("restaurant_branding")
      .select("*")
      .eq("restaurant_id", restId1)
      .single();
    assert(branding1 && branding1.primary_color === "#7a2e35", "Test B4: Default branding initialized");

    // 4. Second restaurant creation by same owner
    const testSlug2 = `olive-garden-blr-${Date.now().toString(36)}`;
    const { data: restId2, error: createErr2 } = await clientUser1.rpc("create_restaurant_with_owner", {
      p_name: "Olive Garden Bengaluru",
      p_slug: testSlug2,
      p_phone: "+91 9876543211",
      p_email: "blr@olivegarden.test",
      p_address: "Indiranagar, Bengaluru",
    });

    assert(!createErr2 && restId2, `Test C1: Second restaurant creation succeeds (ID: ${restId2})`);

    // Check user1 has memberships in both restaurants
    const { data: allMembs } = await clientUser1
      .from("restaurant_memberships")
      .select("restaurant_id, role");
    assert(allMembs && allMembs.length >= 2, "Test C2: User maintains separate memberships across both restaurants");

    // 5. Duplicate slug rejection
    const { error: dupErr } = await clientUser1.rpc("create_restaurant_with_owner", {
      p_name: "Olive Garden Duplicate",
      p_slug: testSlug1, // duplicate of testSlug1
    });
    assert(
      dupErr && dupErr.message.includes("already taken"),
      "Test E: Duplicate slug is safely rejected"
    );

    // 6. Reserved slug rejection
    const { error: resErr } = await clientUser1.rpc("create_restaurant_with_owner", {
      p_name: "Lumiere Admin",
      p_slug: "admin",
    });
    assert(
      resErr && resErr.message.includes("is reserved"),
      "Test F: Reserved slug 'admin' is safely rejected"
    );

    // 7. Invalid slug format rejection
    const { error: fmtErr } = await clientUser1.rpc("create_restaurant_with_owner", {
      p_name: "Invalid Slug Rest",
      p_slug: "Invalid_Slug!",
    });
    assert(
      fmtErr && fmtErr.message.includes("Invalid slug format"),
      "Test F2: Invalid slug format is safely rejected"
    );

  } catch (err) {
    console.error("Unexpected error during test:", err);
    failed++;
  }

  console.log(`\n=== Verification Results: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests();
