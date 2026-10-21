"use client";

/**
 * Optional, local explicit-image moderation for receipt uploads.
 *
 * This wrapper runs an on-device image classifier to flag confidently explicit
 * images BEFORE they can be stored or shown to an athlete. It is deliberately
 * optional and fail-safe:
 *
 *   • It dynamically imports `nsfwjs` (MIT-licensed, client-side TensorFlow.js —
 *     https://github.com/infinitered/nsfwjs). nsfwjs classifies images entirely
 *     in the browser; nothing is uploaded and no data leaves the device, which
 *     matches how this app keeps OCR and QR decoding on-device.
 *   • `nsfwjs` is NOT a hard dependency of this project. If it (or its peer
 *     `@tensorflow/tfjs`) is not installed, this wrapper resolves with
 *     `{ available: false }` so the caller degrades to the "uncertain" path
 *     (keep the image private for review) instead of silently claiming the
 *     image is safe. This honors "don't add an unreliable check silently":
 *     when the model is present we use it; when it isn't, we apply clear limits.
 *
 * LIMITATIONS: the model is a heuristic (~90–93% on its own test set) and is not
 * a guarantee. A low explicit score is NOT proof an image is a genuine receipt,
 * and this layer never claims a payment occurred.
 */

export interface ModerationResult {
  /** Whether a moderation model actually ran. */
  available: boolean;
  /** 0..1 probability the image is explicit (porn/hentai/sexy combined). */
  explicitScore: number;
}

/** Cache the loaded model across calls within a session. */
let modelPromise: Promise<unknown> | null = null;

async function loadModel(): Promise<unknown | null> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    // Guarded dynamic import: a non-literal specifier keeps the bundler from
    // requiring the optional package at build time. If it is not installed the
    // import throws and we fall back to "unavailable".
    const pkg = "nsfwjs";
    const nsfw = (await import(/* webpackIgnore: true */ pkg)) as {
      load: () => Promise<{ classify: (img: unknown) => Promise<Array<{ className: string; probability: number }>> }>;
    };
    return nsfw.load();
  })();
  try {
    return await modelPromise;
  } catch {
    modelPromise = null;
    return null;
  }
}

/** Decode a File into an <img> element for classification. */
async function toImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode-failed"));
      el.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Classify an uploaded image for explicit content, entirely on-device.
 *
 * Always resolves (never throws). When the optional model is unavailable or
 * errors, returns `{ available: false, explicitScore: 0 }` so the caller treats
 * the image as unverified (uncertain) rather than safe.
 *
 * @param file The uploaded image.
 */
export async function moderateImage(file: File): Promise<ModerationResult> {
  const unavailable: ModerationResult = { available: false, explicitScore: 0 };
  if (typeof window === "undefined") return unavailable;

  const model = await loadModel();
  if (!model) return unavailable;

  try {
    const img = await toImage(file);
    const predictions = await (
      model as { classify: (img: unknown) => Promise<Array<{ className: string; probability: number }>> }
    ).classify(img);
    const explicitClasses = new Set(["Porn", "Hentai", "Sexy"]);
    const explicitScore = predictions
      .filter((p) => explicitClasses.has(p.className))
      .reduce((sum, p) => sum + p.probability, 0);
    return { available: true, explicitScore: Math.min(1, explicitScore) };
  } catch {
    return unavailable;
  }
}
