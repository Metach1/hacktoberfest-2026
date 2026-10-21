import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session on each request and keeps the auth
 * cookies in sync between the browser and server.
 *
 * Called from the root `proxy.ts` (Next.js 16 renamed Middleware to Proxy).
 * This performs only a lightweight session refresh — it is NOT an authorization
 * layer. Access control lives in Postgres Row Level Security, and route-level
 * gating lives in the pages/layouts themselves.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If env is missing, don't crash the whole app — just pass the request through.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the user to trigger a token refresh if needed. Do not gate here.
  await supabase.auth.getUser();

  return response;
}
