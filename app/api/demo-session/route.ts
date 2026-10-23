import { NextRequest } from "next/server";
import { clearSessionCookie, createSessionCookie, isValidAdminToken } from "@/src/app/lib/demo-session";
import type { DemoRole } from "@/src/app/lib/demo-session";

export async function POST(request: NextRequest) {
  const value: unknown = await request.json();
  if (!value || typeof value !== "object" || !("role" in value)) {
    return Response.json({ error: "Choose a demo role." }, { status: 400 });
  }

  let role: DemoRole;
  if (value.role === "athlete" || value.role === "supporter") {
    role = value.role;
  } else if (value.role === "admin" && isValidAdminToken("token" in value ? value.token : undefined)) {
    role = "admin";
  } else {
    return Response.json({ error: "The role or admin token is not valid." }, { status: 403 });
  }

  return Response.json(
    { ok: true, role },
    { headers: { "Set-Cookie": createSessionCookie(role) } },
  );
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
