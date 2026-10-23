/**
 * Pure, DOM-free logic for an athlete's photo gallery: upload validation,
 * safe id/name generation, reordering, deletion, and deriving the profile
 * picture. Kept as a plain ES module so it is unit-tested with `node --test`,
 * matching the donations/QR logic modules in this repo.
 *
 * ARCHITECTURE NOTE: Startlete is a client-only demo (seed + localStorage, no
 * backend). Like the existing QR-code and receipt "uploads", a photo's `src`
 * is an in-browser data URL stored in localStorage ΓÇö there is no server or
 * object storage. The validation here (MIME allow-list, size cap, safe
 * generated names) is therefore the real upload boundary for the demo. A
 * production build MUST re-run equivalent checks on a server and store files
 * outside the repo; see docs and .gitignore for the reserved upload folder.
 */

/** Max photos kept per athlete. Chosen per the brief (8). */
export const MAX_PHOTOS = 8;

/** Max bytes per uploaded image. 4 MB keeps localStorage data URLs sane. */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/** Only these image types are accepted (JPG, PNG, WebP). */
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Human-readable extension per accepted MIME type, used for safe names. */
const EXT_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Default placeholder shown everywhere when an athlete has no photos. */
export const PHOTO_PLACEHOLDER = "/athlete-placeholder.svg";

/** Round a byte count to a short "4 MB" style label for error copy. */
export function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  const kb = Math.max(1, Math.round(bytes / 1024));
  return `${kb} KB`;
}

/**
 * Validate a candidate upload by its declared type and size. Returns
 * `{ ok: true }` or `{ ok: false, error }` with a clear, user-facing message.
 * `currentCount` guards the per-athlete limit.
 *
 * @param {{ type?: string, size?: number }} file
 * @param {number} currentCount photos the athlete already has
 */
export function validatePhotoUpload(file, currentCount = 0) {
  if (!file || typeof file.type !== "string") {
    return { ok: false, error: "No file selected." };
  }
  if (currentCount >= MAX_PHOTOS) {
    return { ok: false, error: `You can upload up to ${MAX_PHOTOS} photos.` };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { ok: false, error: "Only JPG, PNG, and WebP images are allowed." };
  }
  if (typeof file.size === "number" && file.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: `Each image must be ${formatBytes(MAX_PHOTO_BYTES)} or smaller.`,
    };
  }
  return { ok: true };
}

/**
 * Build a safe, collision-resistant file name from a MIME type. Never trusts a
 * client-supplied name (which could carry path traversal or odd characters):
 * the name is generated entirely from the athlete id, a timestamp, a random
 * suffix, and an extension derived from the validated type.
 *
 * @param {number|string} athleteId
 * @param {string} type validated MIME type
 */
export function safePhotoName(athleteId, type) {
  const ext = EXT_BY_TYPE[type] ?? "img";
  const safeId = String(athleteId).replace(/[^a-z0-9]/gi, "").toLowerCase() || "athlete";
  const rand = Math.random().toString(36).slice(2, 8);
  return `athlete-${safeId}-${Date.now()}-${rand}.${ext}`;
}

/** Stable unique id for a photo record. */
export function newPhotoId(athleteId) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `photo-${athleteId}-${Date.now()}-${rand}`;
}

/**
 * Alt text for a photo. Prefers a caption if one is ever added; otherwise a
 * clear "Photo of <name>" (with a 1-based position when there's more than one),
 * so screen readers always get a meaningful description.
 */
export function photoAlt(athleteName, index = 0, total = 1) {
  const name = athleteName || "the athlete";
  if (total > 1) return `Photo ${index + 1} of ${total} of ${name}`;
  return `Photo of ${name}`;
}

/**
 * Build a validated photo record from a data URL. Returns `{ ok, photo }` or
 * `{ ok: false, error }`. Does not mutate anything; callers append the photo.
 *
 * @param {{ athleteId: number|string, athleteName?: string, type: string,
 *           size?: number, dataUrl: string, currentCount?: number }} input
 */
export function buildPhoto(input) {
  const { athleteId, athleteName, type, size, dataUrl, currentCount = 0 } = input ?? {};
  const check = validatePhotoUpload({ type, size }, currentCount);
  if (!check.ok) return check;
  if (typeof dataUrl !== "string" || !dataUrl) {
    return { ok: false, error: "Could not read the image." };
  }
  return {
    ok: true,
    photo: {
      id: newPhotoId(athleteId),
      name: safePhotoName(athleteId, type),
      src: dataUrl,
      alt: photoAlt(athleteName),
    },
  };
}

/** The current profile-picture src: the first photo, or the placeholder. */
export function profilePhotoSrc(photos) {
  return Array.isArray(photos) && photos.length > 0 && photos[0]?.src
    ? photos[0].src
    : PHOTO_PLACEHOLDER;
}

/** True when a slideshow should render (more than one photo). */
export function hasSlideshow(photos) {
  return Array.isArray(photos) && photos.length > 1;
}

/**
 * Move the photo at `index` one slot toward the start (dir -1) or end (dir +1),
 * returning a NEW array. Out-of-range moves are no-ops. Moving a photo into
 * slot 0 makes it the new profile picture ΓÇö the caller doesn't special-case it.
 */
export function movePhoto(photos, index, dir) {
  const list = Array.isArray(photos) ? [...photos] : [];
  const target = index + dir;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return list;
  }
  [list[index], list[target]] = [list[target], list[index]];
  return list;
}

/** Remove the photo with `photoId`, returning a NEW array. */
export function removePhoto(photos, photoId) {
  return (Array.isArray(photos) ? photos : []).filter((p) => p.id !== photoId);
}

/**
 * Append a validated photo, enforcing the limit. Returns a NEW array; silently
 * ignores the add when already at MAX_PHOTOS (callers validate first for the
 * user-facing error, this is a last-line guard).
 */
export function addPhoto(photos, photo) {
  const list = Array.isArray(photos) ? photos : [];
  if (list.length >= MAX_PHOTOS || !photo) return list.slice();
  return [...list, photo];
}
