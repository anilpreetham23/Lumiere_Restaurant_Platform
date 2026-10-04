const { createClient } = require("@supabase/supabase-js");

const url = "https://apmwlxbdhfjbrdymvfsp.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbXdseGJkaGZqYnJkeW12ZnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTk3OTYsImV4cCI6MjA5OTgzNTc5Nn0.ty0Lq2QeBMtiZKgnqBndI9xFEXxPlY6R3t-YyNU_5e8";

const supabase = createClient(url, anonKey);

async function run() {
  console.log("Checking RPCs...");
  // Try rpc submit reservation
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_reservation", {
    p_name: "Test", p_phone: "123", p_email: "a@b.com", p_guests: "2", p_date: "2026-10-05", p_time: "19:00"
  });
  console.log("RPC create_reservation:", { rpcRes, rpcErr });

  // Try rpc submit_reservation
  const { data: rpcRes2, error: rpcErr2 } = await supabase.rpc("submit_reservation", {
    p_name: "Test", p_phone: "123", p_email: "a@b.com", p_guests: "2", p_date: "2026-10-05", p_time: "19:00"
  });
  console.log("RPC submit_reservation:", { rpcRes2, rpcErr2 });

  // Try place_public_online_order to see if RPCs work
  const { data: orderRes, error: orderErr } = await supabase.rpc("place_public_online_order", {
    p_restaurant_id: "00000000-0000-0000-0000-000000000001",
    p_customer_name: "Test", p_email: "test@example.com", p_phone: "9876543210",
    p_items: [{ id: "1", title: "Dish", price: 100, qty: 1 }]
  });
  console.log("RPC place_public_online_order:", { orderRes, orderErr });
}

run();
