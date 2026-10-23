import { NextRequest } from "next/server";
import { getDemoSession } from "@/src/app/lib/demo-session";
import { isLocalStorageEnabled } from "@/src/app/lib/image-policy.mjs";
import {
  getImage,
  listImages,
  listReports,
  updateImageStatus,
  updateReportOutcome,
  type StoredReport,
} from "@/src/app/lib/local-image-store";

const outcomes = new Set<StoredReport["outcome"]>([
  "dismissed",
  "warning",
  "content_removed",
  "account_suspended",
]);

export async function GET(request: NextRequest) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    return Response.json({ error: "Local report storage is disabled in production." }, { status: 503 });
  }
  if (getDemoSession(request)?.role !== "admin") {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }
  return Response.json({ reports: await listReports() });
}

export async function PATCH(request: NextRequest) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    return Response.json({ error: "Local report storage is disabled in production." }, { status: 503 });
  }
  if (getDemoSession(request)?.role !== "admin") {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }
  const value: unknown = await request.json();
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("outcome" in value) ||
    typeof value.outcome !== "string" ||
    !outcomes.has(value.outcome as StoredReport["outcome"])
  ) {
    return Response.json({ error: "Choose a report and a valid moderation outcome." }, { status: 400 });
  }
  const report = await updateReportOutcome(value.id, value.outcome as StoredReport["outcome"]);
  if (!report) return new Response(null, { status: 404 });
  if (value.outcome === "content_removed") {
    const targets = report.targetType === "image"
      ? [await getImage(report.targetId)].filter((image) => image !== null)
      : (await listImages()).filter((image) => image.postId === report.targetId);
    await Promise.all(
      targets.map((image) => updateImageStatus(image.id, "rejected", "Removed after a user report.")),
    );
  }
  return Response.json({ ok: true });
}
