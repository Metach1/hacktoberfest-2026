import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export type DemoRole = "athlete" | "supporter" | "admin";

export interface DemoSession {
  userId: string;
  role: DemoRole;
  expiresAt: number;
}

const COOKIE_NAME = "startlete-demo-session";
const sessionSecret = process.env.DEMO_SESSION_SECRET ?? randomBytes(32).toString("hex");

function sign(value: string) {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

export function createSessionCookie(role: DemoRole) {
  const payload: DemoSession = {
    userId: `demo-${role}`,
    role,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encoded}.${sign(encoded)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`;
}

export function getDemoSession(request: NextRequest): DemoSession | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DemoSession;
    if (
      typeof session.userId !== "string" ||
      !["athlete", "supporter", "admin"].includes(session.role) ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isValidAdminToken(candidate: unknown) {
  const configured = process.env.DEMO_ADMIN_TOKEN;
  if (!configured || typeof candidate !== "string") return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function sessionCookieName() {
  return COOKIE_NAME;
}
