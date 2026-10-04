const { createClient } = require("@supabase/supabase-js");

const url = "https://apmwlxbdhfjbrdymvfsp.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbXdseGJkaGZqYnJkeW12ZnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTk3OTYsImV4cCI6MjA5OTgzNTc5Nn0.ty0Lq2QeBMtiZKgnqBndI9xFEXxPlY6R3t-YyNU_5e8";

const supabase = createClient(url, anonKey);

async function run() {
  const { data: rests } = await supabase.from("restaurants").select("id, name, slug");
  console.log("Restaurants in DB:", rests);

  if (rests && rests.length > 0) {
    const targetId = rests[0].id;
    console.log("Trying insert with real restaurant id:", targetId);
    const res = await supabase.from("reservations").insert({
      restaurant_id: targetId,
      name: "Test User",
      phone: "9346543338",
      email: "test@example.com",
      guests: "2",
      date: "2026-10-05",
      time: "19:00",
    }).select("id").single();
    console.log("Result with real restaurant id:", res);
  }
}

run();
