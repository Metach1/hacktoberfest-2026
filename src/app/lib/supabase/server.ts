import "server-only";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server
 * Actions). Backed by the request's cookies via `@supabase/ssr`, so it acts as
 * the currently authenticated user and RLS policies apply to it.
 *
 * Like the browser client, this uses only the public anon key — never the
 * service-role key. Admin privileges are enforced by RLS against the signed-in
 * user, not by any elevated key.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Server Components the cookie store is read-only; writes are a no-op
        // and will be refreshed by middleware/route handlers where allowed.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // ignore read-only cookie writes during render
        }
      },
    },
  });
}
