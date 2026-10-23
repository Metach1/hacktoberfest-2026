import { NextRequest } from "next/server";
import { getDemoSession } from "@/src/app/lib/demo-session";
import {
  appendModerationDecision,
  listImages,
  listModerationDecisions,
  updateImageStatus,
} from "@/src/app/lib/local-image-store";
import { isLocalStorageEnabled } from "@/src/app/lib/image-policy.mjs";

function isAdmin(request: NextRequest) {
  return getDemoSession(request)?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    return Response.json({ error: "Local image storage is disabled in production." }, { status: 503 });
  }
  if (!isAdmin(request)) return Response.json({ error: "Admin access required." }, { status: 403 });
  const allImages = (await listImages()).filter((image) => image.status !== "rejected");
  const images = allImages.filter((image) => image.status === "needs_review");
  const decisions = await listModerationDecisions();
  const rejectedCounts = decisions
    .filter((decision) => decision.result === "rejected")
    .reduce<Record<string, number>>((counts, decision) => {
      counts[decision.userId] = (counts[decision.userId] ?? 0) + 1;
      return counts;
    }, {});
  return Response.json({
    images: images.map((image) => ({ ...image, url: `/api/post-images/${image.id}` })),
    allImages: allImages.map((image) => ({ ...image, url: `/api/post-images/${image.id}` })),
    rejectedCounts,
  });
}

export async function PATCH(request: NextRequest) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    return Response.json({ error: "Local image storage is disabled in production." }, { status: 503 });
  }
  const session = getDemoSession(request);
  if (session?.role !== "admin") return Response.json({ error: "Admin access required." }, { status: 403 });

  const value: unknown = await request.json();
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("action" in value) ||
    (value.action !== "approve" && value.action !== "reject")
  ) {
    return Response.json({ error: "Choose an image and a valid moderation action." }, { status: 400 });
  }
  const status = value.action === "approve" ? "approved" : "rejected";
  const reason =
    status === "approved"
      ? "An admin approved the image after review."
      : "An admin rejected the image after review.";
  const image = await updateImageStatus(value.id, status, reason);
  if (!image) return new Response(null, { status: 404 });
  await appendModerationDecision({
    userId: image.ownerId,
    result: status,
    reason,
    time: new Date().toISOString(),
  });
  return Response.json({ ok: true });
}
