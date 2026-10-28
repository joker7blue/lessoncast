// Server-side Supabase client with the secret key, shared by Next.js routes and Trigger.dev tasks.
// The "server-only" package doesn't load in Trigger.dev, so the browser check happens at call time.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function supabase(): SupabaseClient {
  if (typeof window !== "undefined") throw new Error("The Supabase secret key must never reach the browser");
  client ??= createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
