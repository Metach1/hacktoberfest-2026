import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import {
  canAddImages,
  canDeleteImage,
  canReadImage,
  canReviewImages,
  canUploadImage,
  isLocalStorageEnabled,
  MAX_IMAGE_BYTES,
  validateAndSanitizeImage,
} from "../src/app/lib/image-policy.mjs";
import { decisionFromScores, runModerationProvider } from "../src/app/lib/moderation-policy.mjs";
import { canConsumeUploadAttempt, resetUploadRateLimitForTests } from "../src/app/lib/upload-rate-limit.mjs";

async function tinyPng() {
  return sharp({
    create: {
      width: 2,
      height: 2,
      channels: 3,
      background: { r: 20, g: 90, b: 140 },
    },
  }).png().toBuffer();
}

test("validates decoded file type and rejects MIME mismatch", async () => {
  const png = await tinyPng();
  const result = await validateAndSanitizeImage(png, "image/png");
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.extension, "png");
  await assert.rejects(validateAndSanitizeImage(png, "image/jpeg"), /Only JPG, PNG, and WebP/);
  await assert.rejects(
    validateAndSanitizeImage(Buffer.from("<svg></svg>"), "image/png"),
    /not a valid JPG, PNG, or WebP/,
  );
});

test("rejects files larger than the configured maximum", async () => {
  await assert.rejects(
    validateAndSanitizeImage(Buffer.alloc(MAX_IMAGE_BYTES + 1), "image/png"),
    /5 MiB or smaller/,
  );
});

test("maps all three moderation outcomes using strict thresholds", () => {
  assert.equal(decisionFromScores({ Porn: 0.001, Hentai: 0, Sexy: 0 }).result, "approved");
  assert.equal(decisionFromScores({ Porn: 0.02, Hentai: 0, Sexy: 0 }).result, "needs_review");
  assert.equal(decisionFromScores({ Porn: 0.08, Hentai: 0, Sexy: 0 }).result, "rejected");
  assert.equal(decisionFromScores({ Sexy: 0.005 }).result, "needs_review");
});

test("provider mocks preserve approved, needs_review, and rejected results", async () => {
  for (const result of ["approved", "needs_review", "rejected"]) {
    const decision = await runModerationProvider(async () => ({ result, reason: `mock ${result}` }));
    assert.equal(decision.result, result);
  }
});

test("provider errors and timeouts fail closed to needs_review", async () => {
  const failed = await runModerationProvider(async () => {
    throw new Error("provider unavailable");
  });
  assert.equal(failed.result, "needs_review");

  const timedOut = await runModerationProvider(() => new Promise(() => {}), 5);
  assert.equal(timedOut.result, "needs_review");
});

test("pending images are private except to their owner or an admin", () => {
  const pending = { status: "needs_review", ownerId: "demo-athlete" };
  assert.equal(canReadImage(pending, null), false);
  assert.equal(canReadImage(pending, "demo-supporter"), false);
  assert.equal(canReadImage(pending, "demo-athlete"), true);
  assert.equal(canReadImage(pending, null, true), true);
  assert.equal(canReadImage({ status: "approved" }, null), true);
});

test("upload permissions, image-count limits, and production storage prevent bypasses", () => {
  assert.equal(canUploadImage("athlete"), true);
  assert.equal(canUploadImage("supporter"), false);
  assert.equal(canUploadImage(null), false);
  assert.equal(canAddImages(3, 1), true);
  assert.equal(canAddImages(4, 1), false);
  assert.equal(canAddImages(0, 5), false);
  assert.equal(isLocalStorageEnabled("production"), false);
});

test("only image owners and admins can delete an image", () => {
  const image = { ownerId: "demo-athlete" };
  assert.equal(canDeleteImage(image, "demo-supporter"), false);
  assert.equal(canDeleteImage(image, "demo-athlete"), true);
  assert.equal(canDeleteImage(image, null, true), true);
  assert.equal(canDeleteImage(null, "demo-athlete"), false);
  assert.equal(canReviewImages("supporter"), false);
  assert.equal(canReviewImages("admin"), true);
});

test("upload attempts are limited per demo account", () => {
  resetUploadRateLimitForTests();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(canConsumeUploadAttempt("demo-athlete", 1000 + attempt), true);
  }
  assert.equal(canConsumeUploadAttempt("demo-athlete", 1005), false);
  assert.equal(canConsumeUploadAttempt("demo-supporter", 1005), true);
  assert.equal(canConsumeUploadAttempt("demo-athlete", 901_001), true);
  resetUploadRateLimitForTests();
});
