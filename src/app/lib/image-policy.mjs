export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_POST = 4;

const supportedFormats = new Map([
  ["jpeg", { mimeType: "image/jpeg", extension: "jpg" }],
  ["png", { mimeType: "image/png", extension: "png" }],
  ["webp", { mimeType: "image/webp", extension: "webp" }],
]);

export async function validateAndSanitizeImage(
  input,
  reportedType = "",
  { maxBytes = MAX_IMAGE_BYTES, imageProcessor } = {},
) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (bytes.length === 0) throw new Error("Choose an image to upload.");
  if (bytes.length > maxBytes) throw new Error("Each image must be 5 MiB or smaller.");

  const processor = imageProcessor ?? (await import("sharp")).default;
  let metadata;
  try {
    metadata = await processor(bytes, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new Error("This file is not a valid JPG, PNG, or WebP image.");
  }

  const format = supportedFormats.get(metadata.format);
  if (!format || (reportedType && reportedType !== format.mimeType)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }

  try {
    const sanitized = await processor(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .toFormat(metadata.format)
      .toBuffer();
    return { bytes: sanitized, ...format };
  } catch {
    throw new Error("This image could not be safely processed. Try another image.");
  }
}

export function canUploadImage(role) {
  return role === "athlete";
}

export function canReadImage(image, userId, isAdmin = false) {
  return image?.status === "approved" || isAdmin || Boolean(userId && image?.ownerId === userId);
}

export function canDeleteImage(image, userId, isAdmin = false) {
  return Boolean(image && (isAdmin || (userId && image.ownerId === userId)));
}

export function canReviewImages(role) {
  return role === "admin";
}

export function canAddImages(existingCount, incomingCount) {
  return (
    Number.isInteger(existingCount) &&
    Number.isInteger(incomingCount) &&
    existingCount >= 0 &&
    incomingCount > 0 &&
    existingCount + incomingCount <= MAX_IMAGES_PER_POST
  );
}

export function isRateLimited(attempts, now, windowMs, maxAttempts) {
  const current = attempts.filter((time) => now - time < windowMs);
  return { limited: current.length >= maxAttempts, attempts: current };
}

export function isLocalStorageEnabled(nodeEnv) {
  return nodeEnv !== "production";
}
