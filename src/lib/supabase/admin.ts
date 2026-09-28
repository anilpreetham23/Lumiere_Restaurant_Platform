import { createClient } from "@supabase/supabase-js";

// Server-only. Uses the service-role key to bypass RLS for trusted operations
// (settling a paid bill, verifying a receipt). NEVER import into client code.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export const serviceRoleConfigured = () =>
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;
