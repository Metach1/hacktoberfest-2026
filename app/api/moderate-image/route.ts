import { NextRequest } from "next/server";
import { getDemoSession } from "@/src/app/lib/demo-session";
import { moderateImage } from "@/src/app/lib/moderation";
import { appendModerationDecision } from "@/src/app/lib/local-image-store";
import { isLocalStorageEnabled, MAX_IMAGE_BYTES, validateAndSanitizeImage } from "@/src/app/lib/image-policy.mjs";
import { canConsumeUploadAttempt } from "@/src/app/lib/upload-rate-limit.mjs";

export async function POST(request: NextRequest) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    return Response.json({ error: "Local moderation is disabled in production." }, { status: 503 });
  }
  const session = getDemoSession(request);
  if (!session) return Response.json({ error: "Log in before uploading an image." }, { status: 401 });
  if (!canConsumeUploadAttempt(session.userId)) {
    return Response.json({ error: "Upload limit reached. Please try again in 15 minutes." }, { status: 429 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 64_000) {
    return Response.json({ error: "The selected image exceeds the 5 MiB size limit." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "The image could not be read." }, { status: 400 });
  }
  const value = form.get("image");
  if (!(value instanceof File)) return Response.json({ error: "Choose an image file." }, { status: 400 });
  if (value.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Each image must be 5 MiB or smaller." }, { status: 413 });
  }

  try {
    const sanitized = await validateAndSanitizeImage(Buffer.from(await value.arrayBuffer()), value.type);
    const file = new File([new Uint8Array(sanitized.bytes)], "image", { type: sanitized.mimeType });
    const decision = await moderateImage(file);
    await appendModerationDecision({
      userId: session.userId,
      result: decision.result,
      reason: decision.reason,
      time: new Date().toISOString(),
    });
    return Response.json({
      ...decision,
      sanitizedDataUrl: `data:${sanitized.mimeType};base64,${sanitized.bytes.toString("base64")}`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The image could not be checked." },
      { status: 400 },
    );
  }
}
