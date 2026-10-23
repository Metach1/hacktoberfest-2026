import { NextRequest } from "next/server";
import { getDemoSession } from "@/src/app/lib/demo-session";
import { canDeleteImage, canReadImage, isLocalStorageEnabled } from "@/src/app/lib/image-policy.mjs";
import { deleteImage, getImage, readImageBytes } from "@/src/app/lib/local-image-store";

export async function GET(request: NextRequest, context: RouteContext<"/api/post-images/[id]">) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    return Response.json({ error: "Local image storage is disabled in production." }, { status: 503 });
  }
  const { id } = await context.params;
  const image = await getImage(id);
  const session = getDemoSession(request);
  if (!image || !canReadImage(image, session?.userId ?? "", session?.role === "admin")) {
    return new Response(null, { status: 404 });
  }
  if (request.nextUrl.searchParams.get("metadata") === "1") {
    return Response.json({ id: image.id, alt: image.alt, status: image.status, reason: image.reason });
  }

  try {
    const bytes = await readImageBytes(image);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": image.mimeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/post-images/[id]">) {
  if (!isLocalStorageEnabled(process.env.NODE_ENV)) {
    return Response.json({ error: "Local image storage is disabled in production." }, { status: 503 });
  }
  const session = getDemoSession(request);
  if (!session) return Response.json({ error: "Log in to remove an image." }, { status: 401 });
  const { id } = await context.params;
  const image = await getImage(id);
  if (!image) return new Response(null, { status: 404 });
  if (!canDeleteImage(image, session.userId, session.role === "admin")) {
    return Response.json({ error: "Only the image owner or an admin can remove it." }, { status: 403 });
  }
  await deleteImage(id);
  return Response.json({ ok: true });
}
