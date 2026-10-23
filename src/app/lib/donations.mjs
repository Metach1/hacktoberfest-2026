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

/**
 * Common Philippine e-wallets / banks a SUPPORTER might pay FROM. This is the
 * payment method the supporter actually used to send the money, which can
 * differ from the provider of the athlete's QR (e.g. pay via Maya to a GCash
 * QR). Shared by the supporter donation flow and the athlete QR editor.
 */
export const PAYMENT_METHODS = Object.freeze([
  "GCash",
  "Maya",
  "MariBank",
  "GrabPay",
  "BPI",
  "BDO",
  "LandBank",
  "UnionBank",
  "Metrobank",
  "Bank transfer",
  "Other",
]);

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
 * Whether the given supporter may edit and resubmit a donation right now.
 *
 * Only a REJECTED donation can be retried, and only by its owning supporter.
 * A CONFIRMED donation can never be retried (its total is already counted), and
 * a PENDING one is already under review. Ownership is checked against the
 * donation's stored `supporterId`; a `null`/absent owner on the donation never
 * matches a concrete supporter id.
 *
 * @param {Object} donation
 * @param {string|number|null} supporterId  The supporter attempting the retry.
 * @returns {boolean}
 */
export function canResubmitDonation(donation, supporterId) {
  if (!donation || donation.status !== DONATION_STATUS.REJECTED) return false;
  return donation.supporterId != null && donation.supporterId === supporterId;
}

/**
 * Whether the given supporter may delete a donation from their history.
 *
 * Only PENDING or REJECTED donations the supporter owns may be deleted. A
 * CONFIRMED donation is NEVER deletable: it has already been counted toward an
 * athlete's confirmed totals, and removing it would silently change those
 * totals. Ownership is checked against the donation's stored `supporterId`; a
 * `null`/absent owner never matches a concrete supporter id.
 *
 * @param {Object} donation
 * @param {string|number|null} supporterId  The supporter attempting the delete.
 * @returns {boolean}
 */
export function canDeleteDonation(donation, supporterId) {
  if (!donation) return false;
  if (donation.status === DONATION_STATUS.CONFIRMED) return false;
  return donation.supporterId != null && donation.supporterId === supporterId;
}

/**
 * Resubmit a REJECTED donation IN PLACE as a fresh PENDING submission, keeping
 * the SAME record so athlete totals can never double-count it.
 *
 * The donation's identity is preserved exactly: `id`, `athleteId`, and
 * `supporterId` are never changed. The supporter may edit the submission
 * details via `patch` (amount, method, reference, supporterName, receiptName,
 * receiptPreview, note); any field left out of `patch` keeps its prior value.
 * Status returns to PENDING, `createdAt` is reset to `at` so the demo
 * auto-confirm window restarts, and all stale rejection AND confirmation
 * metadata is cleared.
 *
 * Guarded: only the owning supporter may retry, and only a rejected donation —
 * a confirmed or pending donation is returned UNCHANGED so a counted donation
 * is never reopened. The amount (post-patch) must still be a positive number.
 *
 * @param {Object} donation
 * @param {string|number|null} supporterId  The supporter attempting the retry.
 * @param {Object} [patch]  Edited submission fields (see above).
 * @param {number} [at]     Epoch ms for the new createdAt; defaults to now.
 * @returns {Object} the reset pending record, or the original if not allowed
 * @throws {Error} if the resulting amount is not a positive number
 */
export function resubmitDonation(donation, supporterId, patch = {}, at = Date.now()) {
  if (!canResubmitDonation(donation, supporterId)) return donation;
  const amount = Number(patch.amount ?? donation.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Donation amount must be a positive number");
  }
  return {
    ...donation,
    // Preserve identity: id, athleteId, supporterId are intentionally untouched.
    amount,
    method: patch.method ?? donation.method,
    reference: patch.reference ?? donation.reference,
    supporterName: (patch.supporterName ?? donation.supporterName)?.trim() || ANONYMOUS_DONOR_NAME,
    receiptName: patch.receiptName ?? donation.receiptName,
    receiptPreview: patch.receiptPreview ?? donation.receiptPreview,
    note: patch.note ?? donation.note,
    status: DONATION_STATUS.PENDING,
    // Restart the demo auto-confirm timing from the resubmission moment.
    createdAt: at,
    // Clear stale confirmation metadata (it was never confirmed, but be safe).
    confirmedAt: null,
    confirmedBy: null,
    // Clear stale rejection metadata so the retried record looks fresh.
    rejectedAt: null,
    rejectionReason: null,
    rejectionNote: "",
  };
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

/**
 * Sum the confirmed donations for a given athlete by their STABLE Supabase
 * profile id (UUID). Registered athletes are keyed on a synthetic, per-load
 * numeric id, so numeric-id matching (confirmedTotals) is unreliable for them;
 * the donation's athleteProfileId is the stable link.
 *
 * @param {Array<Object>} donations
 * @param {string} profileId  Supabase athlete profile UUID.
 * @returns {{ total: number, count: number }}
 */
export function confirmedTotalsByProfile(donations, profileId) {
  let total = 0;
  let count = 0;
  if (!profileId) return { total, count };
  for (const d of donations) {
    if (d.athleteProfileId === profileId && d.status === DONATION_STATUS.CONFIRMED) {
      total += d.amount;
      count += 1;
    }
  }
  return { total, count };
}

/**
 * All CONFIRMED donations for an athlete, newest first. Pending and rejected
 * donations are excluded entirely (they never surface on the public profile).
 *
 * @param {Array<Object>} donations
 * @param {number} athleteId
 * @returns {Array<Object>} new array, sorted by createdAt descending
 */
export function confirmedDonationsForAthlete(donations, athleteId) {
  return donations
    .filter((d) => d.athleteId === athleteId && d.status === DONATION_STATUS.CONFIRMED)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * The N most recent CONFIRMED donations for an athlete (default 5), newest
 * first. A thin convenience wrapper over confirmedDonationsForAthlete.
 *
 * @param {Array<Object>} donations
 * @param {number} athleteId
 * @param {number} [limit=5]
 * @returns {Array<Object>}
 */
export function recentConfirmedDonations(donations, athleteId, limit = 5) {
  return confirmedDonationsForAthlete(donations, athleteId).slice(0, Math.max(0, limit));
}

/**
 * All CONFIRMED donations for an athlete matched by their STABLE Supabase
 * profile id (UUID), newest first. The profile-id counterpart of
 * confirmedDonationsForAthlete: registered athletes share a non-unique synthetic
 * numeric id, so the donor list must be scoped by athleteProfileId to stay
 * exclusive per athlete. Pending/rejected donations are excluded.
 *
 * @param {Array<Object>} donations
 * @param {string} profileId  Supabase athlete profile UUID.
 * @returns {Array<Object>} new array, sorted by createdAt descending
 */
export function confirmedDonationsForProfile(donations, profileId) {
  if (!profileId) return [];
  return donations
    .filter((d) => d.athleteProfileId === profileId && d.status === DONATION_STATUS.CONFIRMED)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * The N most recent CONFIRMED donations for an athlete by profile id (default
 * 5), newest first. Profile-id counterpart of recentConfirmedDonations.
 *
 * @param {Array<Object>} donations
 * @param {string} profileId  Supabase athlete profile UUID.
 * @param {number} [limit=5]
 * @returns {Array<Object>}
 */
export function recentConfirmedDonationsForProfile(donations, profileId, limit = 5) {
  return confirmedDonationsForProfile(donations, profileId).slice(0, Math.max(0, limit));
}

/** The display name used for donations with no supplied donor name. */
export const ANONYMOUS_DONOR_NAME = "Anonymous supporter";

/**
 * Stable donor identity key for grouping NAMED donors. The demo's only
 * per-donation identity signal is the display name the supporter entered
 * (supporterId is a single shared sentinel in this demo, so it cannot
 * distinguish donors). We therefore group by the trimmed display name and NEVER
 * merge different names or split a shared one — matching "use existing donor
 * identities; don't invent or incorrectly combine them."
 *
 * Anonymous donations all carry the same "Anonymous supporter" name, so this
 * key is NOT used to group them: because the demo cannot tell one anonymous
 * supporter from another, `topDonorsForAthlete` keeps each anonymous donation
 * as its own row rather than claiming they are the same person.
 *
 * @param {Object} donation
 * @returns {string}
 */
export function donorKey(donation) {
  const name = (donation.supporterName ?? "").trim();
  return name || ANONYMOUS_DONOR_NAME;
}

/**
 * Whether a donation has no distinguishing donor name and so must be ranked as
 * its own anonymous row (never merged with other anonymous donations).
 *
 * The anonymous signal is the existing representation already in the data: a
 * blank name, or the shared sentinel "Anonymous supporter" that
 * `createPendingDonation` and the store normalize blank names to. We treat both
 * as anonymous without changing any persisted donation.
 *
 * @param {Object} donation
 * @returns {boolean}
 */
export function isAnonymousDonation(donation) {
  const name = (donation.supporterName ?? "").trim();
  return name === "" || name === ANONYMOUS_DONOR_NAME;
}

/**
 * Resolve the supporterName value to submit from the supporter's session
 * display name plus their "donate anonymously" choice. Pure so the modal and
 * tests share one rule.
 *
 * - Anonymous (toggle on), OR no usable display name -> "" (blank). The store /
 *   createPendingDonation then normalizes blank to the "Anonymous supporter"
 *   sentinel, so it reads as anonymous everywhere (rankDonors, leaderboards).
 * - Otherwise -> the trimmed display name.
 *
 * @param {string|null|undefined} displayName  Session display name, if any.
 * @param {boolean} anonymous                  Whether the supporter opted out of showing their name.
 * @returns {string}
 */
export function resolveSupporterName(displayName, anonymous) {
  if (anonymous) return "";
  const name = (displayName ?? "").trim();
  return name;
}

/**
 * Rank contributors for an athlete by their TOTAL confirmed contribution,
 * highest first. Only confirmed donations are considered.
 *
 * NAMED donors are aggregated by their exact trimmed display name (their total
 * and donation count), never merging different names or splitting a shared one.
 * ANONYMOUS donations (blank name) are NOT aggregated: each becomes its own
 * "Anonymous supporter" row with that donation's amount and a count of 1, since
 * the demo cannot tell one anonymous supporter from another.
 *
 * Every row carries a stable `id`: the donor key for named donors, or the
 * donation id for anonymous rows. Ties in total are broken by the most recent
 * contribution, then by `id` for determinism.
 *
 * @param {Array<Object>} donations
 * @param {number} athleteId
 * @param {number} [limit] Optional cap on returned rows.
 * @returns {Array<{ id: string, donor: string, total: number, count: number, latestAt: number }>}
 */
export function topDonorsForAthlete(donations, athleteId, limit) {
  return rankDonors(donations, (d) => d.athleteId === athleteId, limit);
}

/**
 * Profile-id counterpart of topDonorsForAthlete: rank confirmed contributors
 * for an athlete matched by their STABLE Supabase profile id (UUID). Same
 * ranking, aggregation, and anonymous-row rules; used so the donor list stays
 * exclusive per registered athlete.
 *
 * @param {Array<Object>} donations
 * @param {string} profileId  Supabase athlete profile UUID.
 * @param {number} [limit] Optional cap on returned rows.
 * @returns {Array<{ id: string, donor: string, total: number, count: number, latestAt: number }>}
 */
export function topDonorsForProfile(donations, profileId, limit) {
  if (!profileId) return [];
  return rankDonors(donations, (d) => d.athleteProfileId === profileId, limit);
}

/**
 * Shared donor-ranking core. `matches` selects which donations belong to the
 * target athlete (by numeric id or by profile id); confirmed-only, aggregation,
 * anonymous-row, and tie-break rules are identical regardless of the matcher.
 *
 * @param {Array<Object>} donations
 * @param {(d: Object) => boolean} matches
 * @param {number} [limit]
 */
function rankDonors(donations, matches, limit) {
  const byDonor = new Map();
  const anonymousRows = [];
  for (const d of donations) {
    if (!matches(d) || d.status !== DONATION_STATUS.CONFIRMED) continue;
    if (isAnonymousDonation(d)) {
      anonymousRows.push({
        id: d.id,
        donor: ANONYMOUS_DONOR_NAME,
        total: d.amount,
        count: 1,
        latestAt: d.createdAt,
      });
      continue;
    }
    const key = donorKey(d);
    const entry = byDonor.get(key) ?? { id: key, donor: key, total: 0, count: 0, latestAt: 0 };
    entry.total += d.amount;
    entry.count += 1;
    entry.latestAt = Math.max(entry.latestAt, d.createdAt);
    byDonor.set(key, entry);
  }
  const ranked = [...byDonor.values(), ...anonymousRows].sort(
    (a, b) => b.total - a.total || b.latestAt - a.latestAt || a.id.localeCompare(b.id),
  );
  return typeof limit === "number" ? ranked.slice(0, Math.max(0, limit)) : ranked;
}

/** Minimum claimed donation amount (pesos) the supporter flow accepts. */
export const MIN_DONATION_AMOUNT = 50;

/** Min/max digit count for a published payment-QR account number. */
export const MIN_ACCOUNT_NUMBER_DIGITS = 8;
export const MAX_ACCOUNT_NUMBER_DIGITS = 19;

/**
 * Whether an athlete-entered account number is valid. The value may contain
 * spaces or dashes as separators (e.g. "0917 123 4567"); those are stripped
 * before counting. What remains must be DIGITS ONLY, between
 * MIN_ACCOUNT_NUMBER_DIGITS and MAX_ACCOUNT_NUMBER_DIGITS inclusive. A pure
 * predicate so the QR manager UI and tests share one rule.
 *
 * @param {string|null|undefined} raw
 * @returns {boolean}
 */
export function isValidAccountNumber(raw) {
  if (raw == null) return false;
  // Allow spaces and dashes as separators only.
  if (!/^[\d\s-]+$/.test(raw)) return false;
  const digits = raw.replace(/[\s-]/g, "");
  return (
    /^\d+$/.test(digits) &&
    digits.length >= MIN_ACCOUNT_NUMBER_DIGITS &&
    digits.length <= MAX_ACCOUNT_NUMBER_DIGITS
  );
}

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
