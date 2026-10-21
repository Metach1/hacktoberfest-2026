/**
 * Pure, dependency-free donation-lifecycle logic for the Startlete demo.
 *
 * Kept as a plain ES module (no React, no DOM) so it can be unit-tested by
 * native `node --test` and imported by the typed store in `store.tsx`.
 *
 * The lifecycle models a QR-based "offline" donation:
 *   1. A supporter pays an athlete using their own e-wallet / bank app, then
 *      uploads the receipt and enters amount / reference / method. This is
 *      recorded as a PENDING donation.
 *   2. The athlete reviews the receipt and confirms receipt of the funds,
 *      moving the donation to CONFIRMED. Only confirmed donations count toward
 *      an athlete's raised total and supporter count.
 *   3. If the athlete does not act within the demo auto-confirm window
 *      (3 days), the donation auto-confirms. This is a DEMO TIMEOUT only — it
 *      is NOT bank verification and no real money moves. OCR is likewise only a
 *      convenience for pre-filling fields, never payment verification.
 *
 * All data is fictional. No real payment integration exists.
 */

/** Demo auto-confirm window: 3 days, expressed in milliseconds. */
export const AUTO_CONFIRM_MS = 3 * 24 * 60 * 60 * 1000;

/** Donation lifecycle states. */
export const DONATION_STATUS = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
});

/**
 * Reasons an athlete can give when rejecting a pending donation. The key is the
 * stable stored value; the label is shown in the UI (and to the supporter with
 * the rejected donation). "other" requires the athlete to add a note so the
 * supporter gets a meaningful explanation.
 */
export const REJECTION_REASONS = Object.freeze([
  { value: "amount_mismatch", label: "Amount does not match" },
  { value: "invalid_receipt", label: "Receipt appears invalid" },
  { value: "wrong_image", label: "Wrong image uploaded" },
  { value: "other", label: "Other" },
]);

/** Set of valid rejection-reason values, for quick membership checks. */
const REJECTION_REASON_VALUES = new Set(REJECTION_REASONS.map((r) => r.value));

/** Resolve a rejection-reason value to its human label (or the value itself). */
export function rejectionReasonLabel(value) {
  const match = REJECTION_REASONS.find((r) => r.value === value);
  return match ? match.label : value ?? "";
}

/**
 * Create a new PENDING donation record from supporter-entered details.
 *
 * @param {Object} input
 * @param {number} input.athleteId
 * @param {number} input.amount            Peso amount (positive).
 * @param {string} input.method            Payment method label (e.g. "GCash").
 * @param {string} input.reference         Reference / transaction number.
 * @param {string} [input.supporterId]     Stable supporter identity (demo).
 * @param {string} [input.supporterName]   Optional display name.
 * @param {string} [input.receiptName]     Uploaded file name (metadata only).
 * @param {string} [input.receiptPreview]  Data URL for the receipt preview.
 * @param {string} [input.note]            Optional supporter note.
 * @param {number} [input.createdAt]       Epoch ms; defaults to Date.now().
 * @param {string} [input.id]              Stable id; defaults to a derived id.
 * @returns {Object} the pending donation record
 */
export function createPendingDonation(input) {
  const createdAt = input.createdAt ?? Date.now();
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Donation amount must be a positive number");
  }
  return {
    id: input.id ?? `don-${createdAt}-${Math.round(amount)}`,
    athleteId: input.athleteId,
    /** Stable supporter identity this submission belongs to (demo sentinel). */
    supporterId: input.supporterId ?? null,
    amount,
    method: input.method ?? "",
    reference: input.reference ?? "",
    supporterName: input.supporterName?.trim() || "Anonymous supporter",
    receiptName: input.receiptName ?? "",
    receiptPreview: input.receiptPreview ?? "",
    note: input.note ?? "",
    status: DONATION_STATUS.PENDING,
    createdAt,
    confirmedAt: null,
    /** How the donation reached CONFIRMED: "athlete" or "auto". */
    confirmedBy: null,
    /** When the athlete rejected this donation (epoch ms), else null. */
    rejectedAt: null,
    /** Stored rejection reason value (see REJECTION_REASONS), else null. */
    rejectionReason: null,
    /** Optional athlete note explaining the rejection, else "". */
    rejectionNote: "",
  };
}

/**
 * Return a copy of a donation marked CONFIRMED by an actor.
 *
 * Idempotent: confirming an already-confirmed donation returns it unchanged.
 * A REJECTED donation can never be confirmed — attempting to does nothing and
 * returns it unchanged, so a donation is never both confirmed and rejected.
 *
 * @param {Object} donation
 * @param {"athlete"|"auto"} [by]
 * @param {number} [at] Epoch ms; defaults to Date.now().
 * @returns {Object}
 */
export function confirmDonation(donation, by = "athlete", at = Date.now()) {
  if (donation.status === DONATION_STATUS.CONFIRMED) return donation;
  if (donation.status === DONATION_STATUS.REJECTED) return donation;
  return {
    ...donation,
    status: DONATION_STATUS.CONFIRMED,
    confirmedAt: at,
    confirmedBy: by,
  };
}

/**
 * Return a copy of a donation marked REJECTED by the athlete.
 *
 * Only a PENDING donation may be rejected: a CONFIRMED donation is returned
 * unchanged (its totals must not be disturbed), and re-rejecting an
 * already-rejected donation is idempotent. A reason is REQUIRED and must be one
 * of REJECTION_REASONS; an optional note gives the supporter more context.
 *
 * @param {Object} donation
 * @param {string} reason  One of REJECTION_REASONS values (required).
 * @param {string} [note]  Optional explanatory note shown to the supporter.
 * @param {number} [at]    Epoch ms; defaults to Date.now().
 * @returns {Object}
 * @throws {Error} if `reason` is missing or not a recognized reason value.
 */
export function rejectDonation(donation, reason, note = "", at = Date.now()) {
  if (!reason || !REJECTION_REASON_VALUES.has(reason)) {
    throw new Error("A valid rejection reason is required");
  }
  // Never change a confirmed donation; keep rejection idempotent.
  if (donation.status === DONATION_STATUS.CONFIRMED) return donation;
  if (donation.status === DONATION_STATUS.REJECTED) return donation;
  return {
    ...donation,
    status: DONATION_STATUS.REJECTED,
    rejectedAt: at,
    rejectionReason: reason,
    rejectionNote: typeof note === "string" ? note.trim() : "",
    // A rejected donation is not confirmed; clear any confirm metadata.
    confirmedAt: null,
    confirmedBy: null,
  };
}

/**
 * Whether a donation may be rejected right now (only pending ones).
 *
 * @param {Object} donation
 * @returns {boolean}
 */
export function canRejectDonation(donation) {
  return Boolean(donation) && donation.status === DONATION_STATUS.PENDING;
}

/**
 * Whether a pending donation is past the demo auto-confirm window.
 *
 * @param {Object} donation
 * @param {number} [now] Epoch ms; defaults to Date.now().
 * @param {number} [windowMs] Override window; defaults to AUTO_CONFIRM_MS.
 * @returns {boolean}
 */
export function isAutoConfirmDue(donation, now = Date.now(), windowMs = AUTO_CONFIRM_MS) {
  if (donation.status !== DONATION_STATUS.PENDING) return false;
  return now - donation.createdAt >= windowMs;
}

/**
 * Apply the demo auto-confirm rule across a list of donations, returning a new
 * list where any pending donation past the window is confirmed by "auto".
 *
 * @param {Array<Object>} donations
 * @param {number} [now] Epoch ms; defaults to Date.now().
 * @param {number} [windowMs]
 * @returns {Array<Object>} new list (same reference only if nothing changed)
 */
export function applyAutoConfirm(donations, now = Date.now(), windowMs = AUTO_CONFIRM_MS) {
  let changed = false;
  const next = donations.map((d) => {
    if (isAutoConfirmDue(d, now, windowMs)) {
      changed = true;
      return confirmDonation(d, "auto", now);
    }
    return d;
  });
  return changed ? next : donations;
}

/**
 * Milliseconds remaining until a pending donation auto-confirms. Returns 0 for
 * donations that are already due or already confirmed.
 *
 * @param {Object} donation
 * @param {number} [now]
 * @param {number} [windowMs]
 * @returns {number}
 */
export function msUntilAutoConfirm(donation, now = Date.now(), windowMs = AUTO_CONFIRM_MS) {
  if (donation.status !== DONATION_STATUS.PENDING) return 0;
  return Math.max(0, donation.createdAt + windowMs - now);
}

/**
 * Sum the confirmed donations for a given athlete.
 *
 * @param {Array<Object>} donations
 * @param {number} athleteId
 * @returns {{ total: number, count: number }}
 */
export function confirmedTotals(donations, athleteId) {
  let total = 0;
  let count = 0;
  for (const d of donations) {
    if (d.athleteId === athleteId && d.status === DONATION_STATUS.CONFIRMED) {
      total += d.amount;
      count += 1;
    }
  }
  return { total, count };
}

/** Minimum claimed donation amount (pesos) the supporter flow accepts. */
export const MIN_DONATION_AMOUNT = 50;

/**
 * Parse a supporter-entered claimed amount (a raw input string) into a number.
 * Returns 0 for blank/invalid input so callers can treat it as "not yet
 * entered" without special-casing NaN.
 *
 * @param {string|number|null|undefined} raw
 * @returns {number}
 */
export function parseClaimedAmount(raw) {
  if (raw == null || raw === "") return 0;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Whether a parsed claimed amount is high enough to proceed. Keeping this as a
 * pure predicate lets the UI and tests share one rule.
 *
 * @param {number} amount
 * @returns {boolean}
 */
export function isAmountAcceptable(amount) {
  return Number.isFinite(amount) && amount >= MIN_DONATION_AMOUNT;
}

/**
 * Whether the supporter may advance from the details step to review. All of a
 * receipt, an acceptable amount, a reference, and a method are required.
 *
 * @param {Object} input
 * @param {string} [input.receiptName]
 * @param {number} [input.amount]
 * @param {string} [input.reference]
 * @param {string} [input.method]
 * @returns {boolean}
 */
export function canReviewDonation({ receiptName, amount, reference, method } = {}) {
  return (
    Boolean(receiptName) &&
    isAmountAcceptable(Number(amount)) &&
    typeof reference === "string" &&
    reference.trim().length > 0 &&
    Boolean(method)
  );
}
