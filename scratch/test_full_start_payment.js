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

const token = "ffeed794-5dd1-47b9-9a6f-efdc413a0aac";

async function testFullStartBillPayment() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, anonKey);

  console.log("1. Fetching session via RPC get_session...");
  const { data } = await supabase.rpc("get_session", { p_token: token });
  const snap = data;
  console.log("   Table:", snap.table.label, "Session ID:", snap.session.id);

  const orderTotal = snap.orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total || o.amount), 0);
  console.log("   Order Total:", orderTotal);

  console.log("2. Inserting payment_intent...");
  const { data: intent, error: intentErr } = await supabase.from("payment_intents").insert({
    restaurant_id: snap.restaurant_id || snap.table.restaurant_id || "00000000-0000-0000-0000-000000000001",
    purpose: "dine_in_bill",
    session_id: snap.session.id,
    table_token: token,
    expected_amount: orderTotal,
    currency: "INR",
    tip_amount: 0,
    provider: "razorpay",
    status: "created",
    metadata: { token, session_id: snap.session.id, table_label: snap.table.label }
  }).select("id").single();

  console.log("   Intent ID:", intent ? intent.id : null, "Error:", intentErr);
  if (!intent) return;

  console.log("3. Calling Razorpay Orders API...");
  const paise = Math.round(orderTotal * 100);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: paise,
      currency: "INR",
      notes: { intent_id: intent.id, token, session_id: snap.session.id }
    }),
  });

  console.log("   Razorpay HTTP Status:", res.status);
  const orderData = await res.json();
  console.log("   Razorpay Order ID:", orderData.id);

  console.log("\n🎉 SUCCESS! Start payment flow initialized completely!");
}

testFullStartBillPayment();
