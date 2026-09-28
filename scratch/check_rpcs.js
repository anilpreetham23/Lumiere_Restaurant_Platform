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

async function checkRpcs() {
  // Check if settle_payment_intent_atomic exists
  const { data: settleRes, error: settleErr } = await supabase.rpc("settle_payment_intent_atomic", {
    p_intent_id: "00000000-0000-0000-0000-000000000000",
    p_provider_payment_id: "test",
    p_paid_amount: 100,
    p_currency: "INR",
    p_payment_method_type: "online",
    p_provider: "razorpay"
  });
  console.log("settle_payment_intent_atomic test:", settleRes, settleErr);
}

checkRpcs();
