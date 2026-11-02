import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin client that uses the Supabase service-role key.
 *
 * NEVER import this from a Client Component.
 * The service-role key bypasses RLS; use it only for Lead-only server
 * actions (create account, reset another user's password, delete user).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (server-only, never NEXT_PUBLIC_).",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
