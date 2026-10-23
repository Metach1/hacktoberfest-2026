import { NextRequest } from "next/server";
import { moderateImage } from "@/src/app/lib/moderation";
import {
  deleteImage,
  appendModerationDecision,
  listImages,
  saveImage,
} from "@/src/app/lib/local-image-store";
import { getDemoSession } from "@/src/app/lib/demo-session";
import {
  canAddImages,
  canUploadImage,
  isLocalStorageEnabled,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_POST,
  validateAndSanitizeImage,
} from "@/src/app/lib/image-policy.mjs";
import { canConsumeUploadAttempt } from "@/src/app/lib/upload-rate-limit.mjs";
import { athletes } from "@/src/app/data/athletes";

const badStorageResponse = () =>
  Response.json(
    { error: "Local image uploads are disabled in production. Configure durable storage first." },
    { status: 503 },
  );

export async function POST(request: NextRequest) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) return badStorageResponse();
  const session = getDemoSession(request);
  if (!session || !canUploadImage(session.role)) {
    return Response.json({ error: "Log in as an athlete to upload post images." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGES_PER_POST * MAX_IMAGE_BYTES + 256_000) {
    return Response.json({ error: "The selected images exceed the upload limit." }, { status: 413 });
  }
  if (!canConsumeUploadAttempt(session.userId)) {
    return Response.json({ error: "Upload limit reached. Please try again in 15 minutes." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "The upload could not be read. Please try again." }, { status: 400 });
  }
  const files = form.getAll("images");
  const postId = form.get("postId");
  const athleteId = Number(form.get("athleteId"));
  if (
    !files.length ||
    files.length > MAX_IMAGES_PER_POST ||
    typeof postId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(postId) ||
    !Number.isSafeInteger(athleteId)
  ) {
    return Response.json({ error: "Attach between 1 and 4 images to a valid post." }, { status: 400 });
  }

  const existing = (await listImages()).filter(
    (image) => image.ownerId === session.userId && image.postId === postId && image.status !== "rejected",
  );
  if (!canAddImages(existing.length, files.length)) {
    return Response.json({ error: "A post can contain up to 4 images." }, { status: 400 });
  }

  const author = athletes.find((item) => item.id === athleteId);
  if (!author) return Response.json({ error: "The post author was not found." }, { status: 400 });

  const sanitized: Array<{ file: File; bytes: Buffer; mimeType: string; extension: string }> = [];
  try {
    for (const value of files) {
      if (!(value instanceof File)) {
        return Response.json({ error: "Every attachment must be an image file." }, { status: 400 });
      }
      const result = await validateAndSanitizeImage(Buffer.from(await value.arrayBuffer()), value.type);
      sanitized.push({ file: value, ...result });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "This image could not be validated." },
      { status: 400 },
    );
  }

  const decisions = [];
  for (const item of sanitized) {
    const file = new File([new Uint8Array(item.bytes)], item.file.name, { type: item.mimeType });
    const decision = await moderateImage(file);
    const logged = {
      userId: session.userId,
      result: decision.result,
      reason: decision.reason,
      time: new Date().toISOString(),
    };
    await appendModerationDecision(logged);
    decisions.push({ ...item, decision, logged });
  }

  const rejected = decisions.find(({ decision }) => decision.result === "rejected");
  if (rejected) {
    return Response.json(
      {
        error: rejected.decision.reason,
        result: "rejected",
        images: [],
      },
      { status: 422 },
    );
  }

  const stored = [];
  try {
    for (const { bytes, mimeType, extension, decision } of decisions) {
      const image = await saveImage(
        {
          ownerId: session.userId,
          postId,
          mimeType,
          alt: `Image attached to ${author.name}'s post`,
          status: decision.result,
          reason: decision.reason,
        },
        bytes,
        extension,
      );
      stored.push({ ...image, url: `/api/post-images/${image.id}` });
    }
  } catch (error) {
    await Promise.all(
      stored.map((image) => deleteImage(image.id)),
    );
    console.error("Could not store moderated post image.", error);
    return Response.json({ error: "The images passed moderation but could not be saved. Please try again." }, { status: 500 });
  }

  return Response.json({
    images: stored.map(({ id, alt, status, reason }) => ({ id, alt, status, reason })),
  });
}
