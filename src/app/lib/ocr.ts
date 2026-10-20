"use client";

/**
 * Client-side OCR helper for the Startlete demo.
 *
 * Runs Tesseract.js entirely in the browser to read a receipt image and
 * suggest the amount / reference / payment method. Tesseract.js is a heavy,
 * browser-only dependency, so it is loaded with a dynamic `import()` only when
 * the supporter actually uploads a receipt — it never runs on the server and is
 * kept out of the initial bundle.
 *
 * OCR here is purely a convenience for pre-filling the form. It is NOT payment
 * verification: the supporter reviews and edits every field, manual entry is
 * always allowed, and a donation still requires athlete confirmation (or the
 * demo auto-confirm timeout) before it counts.
 */

import { parseReceiptText } from "@/src/app/lib/receipt-parse.mjs";

export interface OcrSuggestions {
  amount: number | null;
  reference: string | null;
  method: string | null;
  /** Raw recognized text, exposed for debugging / transparency. */
  rawText: string;
}

/**
 * Recognize text from a receipt image file and parse donation suggestions.
 *
 * Resolves with best-effort suggestions. On any failure (unsupported file,
 * worker error, offline language data) it resolves with empty suggestions so
 * the caller can fall back to manual entry instead of throwing.
 *
 * @param file       The uploaded receipt image.
 * @param onProgress Optional 0..1 progress callback for the recognize phase.
 */
export async function recognizeReceipt(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<OcrSuggestions> {
  const empty: OcrSuggestions = { amount: null, reference: null, method: null, rawText: "" };

  if (typeof window === "undefined") return empty;

  try {
    const { recognize } = await import("tesseract.js");
    const result = await recognize(file, "eng", {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
      },
    });
    const rawText = result?.data?.text ?? "";
    const parsed = parseReceiptText(rawText);
    return { ...parsed, rawText };
  } catch {
    // Graceful failure: let the supporter enter details manually.
    return empty;
  }
}
