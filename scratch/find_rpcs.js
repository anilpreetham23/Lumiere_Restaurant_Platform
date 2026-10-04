const { createClient } = require("@supabase/supabase-js");

const url = "https://apmwlxbdhfjbrdymvfsp.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbXdseGJkaGZqYnJkeW12ZnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTk3OTYsImV4cCI6MjA5OTgzNTc5Nn0.ty0Lq2QeBMtiZKgnqBndI9xFEXxPlY6R3t-YyNU_5e8";

const supabase = createClient(url, anonKey);

async function run() {
  const rpcs = [
    "create_public_reservation",
    "submit_public_reservation",
    "place_reservation",
    "create_reservation_with_deposit",
    "submit_verified_review_atomic",
    "create_restaurant_with_owner"
  ];
  for (const rpc of rpcs) {
    const { data, error } = await supabase.rpc(rpc, {});
    console.log(`RPC ${rpc}:`, error ? error.message : data);
  }
}

run();
