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

async function testStart() {
  console.log("Testing Razorpay order creation for table token:", token);
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  console.log("KEY_ID:", keyId ? keyId.slice(0, 8) + "..." : "missing");
  console.log("KEY_SECRET:", keySecret ? "configured" : "missing");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: table } = await admin.from("restaurant_tables").select("id,label,restaurant_id").eq("token", token).single();
  console.log("Table:", table);

  if (!table) return;

  const { data: sess } = await admin.from("dining_sessions").select("id,status,payment_status")
    .eq("table_id", table.id).in("status", ["open", "bill_pending"])
    .order("created_at", { ascending: false }).limit(1).single();
  console.log("Session:", sess);

  if (!sess) return;

  const { data: orders } = await admin.from("session_orders").select("amount, total, status").eq("session_id", sess.id);
  const orderTotal = (orders ?? []).filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total ?? o.amount), 0);
  console.log("Order Total:", orderTotal);

  const paise = Math.round(orderTotal * 100);

  // Call Razorpay API
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: paise,
      currency: "INR",
      notes: { token, session_id: sess.id }
    }),
  });

  console.log("Razorpay API status:", res.status);
  const body = await res.json();
  console.log("Razorpay response body:", body);
}

testStart();
