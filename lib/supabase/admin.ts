import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function getEnvValue(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseAdminClient() {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(
    getEnvValue("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvValue("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return cachedClient;
}
