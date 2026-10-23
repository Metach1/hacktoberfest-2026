/**
 * Pure, dependency-free policy for deciding whether an uploaded image is an
 * acceptable payment/transaction receipt. No DOM, no network, no model — it
 * only consumes *already-computed signals* and returns a decision, so it is
 * fully unit-testable with native `node --test` and shared by the UI.
 *
 * The decision is layered and deliberately conservative:
 *
 *   1. Explicit-image moderation (optional, local). If a moderation layer is
 *      available and confidently flags the image as explicit, REJECT it before
 *      it can be stored or shown to an athlete.
 *   2. Receipt-text signal (OCR). A payment/transaction receipt should contain
 *      transaction-like details (an amount, a reference, and/or a known payment
 *      method). A QR code alone is NOT such evidence. If there is enough signal,
 *      ACCEPT; if there is clearly none, treat as UNCERTAIN (not a hard reject,
 *      since OCR is unreliable) and keep the image private from the athlete
 *      until it is retried or reviewed.
 *   3. Uncertainty. If moderation is unavailable/low-confidence AND the receipt
 *      signal is weak, the result is UNCERTAIN: the image is kept private from
 *      the athlete rather than rejected outright or shown unchecked.
 *
 * IMPORTANT: none of these signals prove a payment is genuine. OCR and
 * moderation are heuristics only; a confirmed donation reflects the demo
 * workflow (athlete confirmation or the demo timeout), never bank settlement.
 */

/** Possible decisions. */
export const RECEIPT_DECISION = Object.freeze({
  ACCEPT: "accept",
  REJECT: "reject",
  UNCERTAIN: "uncertain",
});

/**
 * Default policy thresholds. `explicitReject` is the moderation probability at
 * or above which an image is confidently explicit. `receiptAccept` is the
 * minimum receipt-signal score (0..1) to accept as a plausible receipt.
 */
export const DEFAULT_RECEIPT_POLICY = Object.freeze({
  explicitReject: 0.7,
  receiptAccept: 0.5,
});

/**
 * Compute a 0..1 receipt-signal score from parsed OCR fields. Each distinct
 * piece of transaction evidence contributes; a QR presence alone does not.
 *
 * @param {Object} parsed
 * @param {number|null} [parsed.amount]      Parsed peso amount, if any.
 * @param {string|null} [parsed.reference]   Parsed reference/txn number, if any.
 * @param {string|null} [parsed.method]      Recognized payment method, if any.
 * @param {string} [parsed.rawText]          Raw OCR text (for keyword hints).
 * @returns {number} score in [0,1]
 */
export function receiptSignalScore(parsed = {}) {
  let score = 0;
  if (parsed.amount != null) score += 0.4;
  if (parsed.reference) score += 0.35;
  if (parsed.method) score += 0.25;
  // Extra nudge if the text mentions a transaction keyword, but only alongside
  // at least one structured field (keyword alone is weak).
  const text = (parsed.rawText ?? "").toLowerCase();
  const hasTxnKeyword = /(ref|reference|txn|transaction|amount|sent|received|successful|paid)/.test(text);
  if (hasTxnKeyword && score > 0) score += 0.1;
  return Math.min(1, score);
}

/**
 * Decide accept / reject / uncertain for an uploaded image.
 *
 * @param {Object} signals
 * @param {Object} [signals.ocr]                 Parsed OCR fields (see receiptSignalScore).
 * @param {Object} [signals.moderation]          Explicit-image moderation result.
 * @param {boolean} [signals.moderation.available] Whether a moderation layer ran.
 * @param {number}  [signals.moderation.explicitScore] 0..1 explicit probability.
 * @param {Object} [policy]                      Override thresholds.
 * @returns {{ decision: string, visibleToAthlete: boolean, reason: string }}
 *   `visibleToAthlete` is true only for ACCEPT. REJECT and UNCERTAIN both keep
 *   the image away from the athlete; REJECT additionally means "do not store".
 */
export function classifyReceipt(signals = {}, policy = DEFAULT_RECEIPT_POLICY) {
  const { explicitReject, receiptAccept } = { ...DEFAULT_RECEIPT_POLICY, ...policy };
  const moderation = signals.moderation ?? { available: false, explicitScore: 0 };

  // 1. Confident explicit content -> reject before storage/display.
  if (moderation.available && Number(moderation.explicitScore) >= explicitReject) {
    return {
      decision: RECEIPT_DECISION.REJECT,
      visibleToAthlete: false,
      reason:
        "That image looks inappropriate for a payment receipt and can't be used. Please upload a clear image of your transaction receipt.",
    };
  }

  // 2. Receipt-text signal.
  const score = receiptSignalScore(signals.ocr ?? {});
  if (score >= receiptAccept) {
    return {
      decision: RECEIPT_DECISION.ACCEPT,
      visibleToAthlete: true,
      reason: "",
    };
  }

  // 3. Not enough evidence (and not confidently explicit) -> uncertain.
  // Keep it private from the athlete until retried or reviewed. We do NOT claim
  // it is a valid receipt, and we do NOT claim payment occurred.
  return {
    decision: RECEIPT_DECISION.UNCERTAIN,
    visibleToAthlete: false,
    reason:
      moderation.available
        ? "We couldn't confirm this looks like a payment receipt. It will stay private for review — you can retry with a clearer receipt image."
        : "We couldn't automatically confirm this is a payment receipt. It will stay private for review — you can retry with a clearer receipt image.",
  };
}
