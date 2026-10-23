"use client";

/**
 * Client-side QR decode + validation helper for the Startlete demo.
 *
 * It decodes an uploaded QR image to text *entirely in the browser* (via jsQR,
 * a dependency-free, MIT-licensed decoder loaded lazily with dynamic
 * `import()`), then validates the decoded text against supported Philippine
 * payment QR formats using the pure `payment-qr` module. Nothing is ever sent
 * to an external service — decoding and validation happen locally, matching how
 * the OCR helper keeps receipt images on-device.
 *
 * A "valid" result means the image is a well-formed PH payment QR (QR Ph /
 * EMVCo). It is NOT proof of payment; the demo never verifies real transactions.
 */

import { validatePaymentQr } from "@/src/app/lib/payment-qr.mjs";

export interface QrCheckResult {
  valid: boolean;
  format: "qr-ph" | "emvco" | null;
  method: string | null;
  /** Actionable message when the image is rejected (or a soft caveat). */
  reason: string | null;
  /** Decoded QR text, exposed for transparency / debugging. */
  text: string | null;
}

/** Draw an image file onto a canvas and return its pixel data. */
async function readImageData(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode-failed"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas-context");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Decode and validate an uploaded QR image.
 *
 * Resolves with a {@link QrCheckResult}. The image is rejected (valid: false)
 * when no QR is found, the image can't be read, or the decoded contents are not
 * a supported payment QR. It never throws for expected failures so the caller
 * can show an actionable error; it also never claims validity it can't verify.
 *
 * @param file The uploaded QR image.
 */
export async function checkPaymentQr(file: File): Promise<QrCheckResult> {
  const unreadable: QrCheckResult = {
    valid: false,
    format: null,
    method: null,
    reason:
      "We couldn't read a QR code in that image. Upload a clear photo or screenshot of your GCash, Maya, or bank (QR Ph) code.",
    text: null,
  };

  if (typeof window === "undefined") return unreadable;

  let imageData: ImageData;
  try {
    imageData = await readImageData(file);
  } catch {
    return unreadable;
  }

  let decodedText: string | null = null;
  try {
    const jsQR = (await import("jsqr")).default;
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    decodedText = code?.data ?? null;
  } catch {
    // Decoder failed to load/run; treat as unreadable rather than "valid".
    return unreadable;
  }

  if (!decodedText) return unreadable;

  const result = validatePaymentQr(decodedText);
  return { ...result, text: decodedText };
}
