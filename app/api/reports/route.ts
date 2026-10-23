import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getDemoSession } from "@/src/app/lib/demo-session";
import { isLocalStorageEnabled } from "@/src/app/lib/image-policy.mjs";
import { saveReport } from "@/src/app/lib/local-image-store";

const allowedReasons = new Set([
  "explicit_content",
  "sexualized_image",
  "adult_link",
  "minor_safety",
  "other",
]);

export async function POST(request: NextRequest) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    return Response.json({ error: "Local report storage is disabled in production." }, { status: 503 });
  }
  const session = getDemoSession(request);
  if (!session) return Response.json({ error: "Log in to report content." }, { status: 401 });

  const value: unknown = await request.json();
  if (
    !value ||
    typeof value !== "object" ||
    !("targetType" in value) ||
    !("targetId" in value) ||
    !("reason" in value) ||
    (value.targetType !== "post" && value.targetType !== "image") ||
    typeof value.targetId !== "string" ||
    value.targetId.length > 100 ||
    typeof value.reason !== "string" ||
    !allowedReasons.has(value.reason)
  ) {
    return Response.json({ error: "Choose a valid report reason and target." }, { status: 400 });
  }

  await saveReport({
    id: randomUUID(),
    reporterId: session.userId,
    targetType: value.targetType,
    targetId: value.targetId,
    reason: value.reason,
    outcome: "pending",
    createdAt: new Date().toISOString(),
  });
  return Response.json({ ok: true });
}
