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

async function testPaymentIntentInsert() {
  const { data: intent, error: intentErr } = await supabase.from("payment_intents").insert({
    restaurant_id: "00000000-0000-0000-0000-000000000001",
    purpose: "dine_in_bill",
    session_id: "d80d15bf-3a81-44be-9b7b-d92e356b1107",
    table_token: "ffeed794-5dd1-47b9-9a6f-efdc413a0aac",
    expected_amount: 700,
    currency: "INR",
    tip_amount: 100,
    provider: "razorpay",
    status: "created",
    metadata: { token: "ffeed794-5dd1-47b9-9a6f-efdc413a0aac", session_id: "d80d15bf-3a81-44be-9b7b-d92e356b1107", table_label: "T-15" }
  }).select("id").single();

  console.log("Intent Insert Data:", intent);
  console.log("Intent Insert Error:", intentErr);
}

testPaymentIntentInsert();
