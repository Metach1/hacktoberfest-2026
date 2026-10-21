"use client";

/**
 * Browser-side Supabase client.
 *
 * Reads the public project URL and anon key from NEXT_PUBLIC_* env vars. These
 * are safe to expose in the browser by design — data access is protected by
 * Row Level Security (RLS) policies in Postgres, not by key secrecy. The
 * service-role key is intentionally never used here.
 *
 * Use this from Client Components for the authenticated user's session.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }
  return createBrowserClient(url, anonKey);
}
