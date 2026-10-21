import type { NextRequest } from "next/server";
import { updateSession } from "@/src/app/lib/supabase/proxy-session";

/**
 * Next.js 16 Proxy (formerly Middleware). Runs before requests to refresh the
 * Supabase auth session cookies so server components see a valid session.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on all paths except static assets and image optimization files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
