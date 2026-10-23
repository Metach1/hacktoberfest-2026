import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  ALLOWED_PHOTO_TYPES,
  validatePhotoUpload,
  safePhotoName,
  buildPhoto,
  profilePhotoSrc,
  hasSlideshow,
  movePhoto,
  removePhoto,
  addPhoto,
  photoAlt,
  PHOTO_PLACEHOLDER,
} from "../src/app/lib/athlete-photos.mjs";

/** A tiny valid data URL stand-in. */
const DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

test("accepts JPG, PNG, and WebP within the size limit", () => {
  for (const type of ALLOWED_PHOTO_TYPES) {
    assert.equal(validatePhotoUpload({ type, size: 1000 }, 0).ok, true, `${type} allowed`);
  }
});

test("rejects disallowed types with a clear message", () => {
  const r = validatePhotoUpload({ type: "image/gif", size: 1000 }, 0);
  assert.equal(r.ok, false);
  assert.match(r.error, /JPG, PNG, and WebP/);
});

test("rejects oversized images with a clear message", () => {
  const r = validatePhotoUpload({ type: "image/png", size: MAX_PHOTO_BYTES + 1 }, 0);
  assert.equal(r.ok, false);
  assert.match(r.error, /smaller/);
});

test("enforces the per-athlete photo limit", () => {
  const r = validatePhotoUpload({ type: "image/png", size: 10 }, MAX_PHOTOS);
  assert.equal(r.ok, false);
  assert.match(r.error, new RegExp(String(MAX_PHOTOS)));
});

test("safePhotoName never trusts client input and uses a type-derived extension", () => {
  const name = safePhotoName("ath-001/../etc", "image/webp");
  assert.match(name, /\.webp$/);
  assert.doesNotMatch(name, /\//); // no path separators survive
  assert.doesNotMatch(name, /\.\./); // no traversal
});

test("buildPhoto returns a validated record with generated id/name and alt", () => {
  const r = buildPhoto({ athleteId: 1, athleteName: "Mikaela Solis", type: "image/jpeg", size: 500, dataUrl: DATA_URL, currentCount: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.photo.src, DATA_URL);
  assert.match(r.photo.name, /\.jpg$/);
  assert.equal(r.photo.alt, "Photo of Mikaela Solis");
  assert.ok(r.photo.id);
});

test("buildPhoto rejects an invalid upload before building", () => {
  const r = buildPhoto({ athleteId: 1, type: "application/pdf", size: 10, dataUrl: DATA_URL });
  assert.equal(r.ok, false);
  assert.ok(!r.photo);
});

test("the first photo is the profile picture; empty falls back to the placeholder", () => {
  assert.equal(profilePhotoSrc([{ id: "a", src: "one.jpg" }, { id: "b", src: "two.jpg" }]), "one.jpg");
  assert.equal(profilePhotoSrc([]), PHOTO_PLACEHOLDER);
  assert.equal(profilePhotoSrc(undefined), PHOTO_PLACEHOLDER);
});

test("reordering a photo into slot 0 makes it the new profile picture", () => {
  const photos = [{ id: "a", src: "a.jpg" }, { id: "b", src: "b.jpg" }, { id: "c", src: "c.jpg" }];
  const moved = movePhoto(photos, 1, -1); // b moves up to slot 0
  assert.deepEqual(moved.map((p) => p.id), ["b", "a", "c"]);
  assert.equal(profilePhotoSrc(moved), "b.jpg");
  // original array is untouched (pure)
  assert.deepEqual(photos.map((p) => p.id), ["a", "b", "c"]);
});

test("moving out of range is a no-op", () => {
  const photos = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(movePhoto(photos, 0, -1).map((p) => p.id), ["a", "b"]);
  assert.deepEqual(movePhoto(photos, 1, 1).map((p) => p.id), ["a", "b"]);
});

test("removePhoto drops the matching photo only", () => {
  const photos = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(removePhoto(photos, "b").map((p) => p.id), ["a", "c"]);
});

test("addPhoto appends but never exceeds the limit", () => {
  let photos = [];
  for (let i = 0; i < MAX_PHOTOS + 3; i++) {
    photos = addPhoto(photos, { id: `p${i}`, src: "x" });
  }
  assert.equal(photos.length, MAX_PHOTOS);
});

test("hasSlideshow is true only for 2+ photos", () => {
  assert.equal(hasSlideshow([]), false);
  assert.equal(hasSlideshow([{ id: "a" }]), false);
  assert.equal(hasSlideshow([{ id: "a" }, { id: "b" }]), true);
});

test("photoAlt gives a meaningful description with position when multiple", () => {
  assert.equal(photoAlt("Mikaela", 0, 1), "Photo of Mikaela");
  assert.equal(photoAlt("Mikaela", 1, 3), "Photo 2 of 3 of Mikaela");
  assert.equal(photoAlt("", 0, 1), "Photo of the athlete");
});
