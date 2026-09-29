import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";

/**
 * Server-side Supabase client using the service-role key.
 * The service-role key bypasses Row Level Security: it must only ever live on
 * the server. The Expo app uses the anon key + RLS instead.
 */
export function createDb(env: Env): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for DB access");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
