import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTO_CONFIRM_MS,
  DONATION_STATUS,
  MIN_DONATION_AMOUNT,
  createPendingDonation,
  confirmDonation,
  isAutoConfirmDue,
  applyAutoConfirm,
  msUntilAutoConfirm,
  confirmedTotals,
  parseClaimedAmount,
  isAmountAcceptable,
  canReviewDonation,
  REJECTION_REASONS,
  rejectionReasonLabel,
  rejectDonation,
  canRejectDonation,
} from "../src/app/lib/donations.mjs";

test("createPendingDonation builds a pending record with defaults", () => {
  const d = createPendingDonation({
    athleteId: 1,
    amount: 1000,
    method: "GCash",
    reference: "ABC123456",
    createdAt: 1000,
  });
  assert.equal(d.status, DONATION_STATUS.PENDING);
  assert.equal(d.athleteId, 1);
  assert.equal(d.amount, 1000);
  assert.equal(d.supporterName, "Anonymous supporter");
  assert.equal(d.confirmedAt, null);
  assert.equal(d.confirmedBy, null);
  assert.ok(d.id.length > 0);
});

test("createPendingDonation trims a supporter name and keeps a provided one", () => {
  const d = createPendingDonation({ athleteId: 1, amount: 50, supporterName: "  Nina A.  " });
  assert.equal(d.supporterName, "Nina A.");
});

test("createPendingDonation rejects non-positive amounts", () => {
  assert.throws(() => createPendingDonation({ athleteId: 1, amount: 0 }));
  assert.throws(() => createPendingDonation({ athleteId: 1, amount: -5 }));
  assert.throws(() => createPendingDonation({ athleteId: 1, amount: NaN }));
});

test("confirmDonation marks confirmed and records the actor and time", () => {
  const d = createPendingDonation({ athleteId: 1, amount: 500, createdAt: 1000 });
  const c = confirmDonation(d, "athlete", 2000);
  assert.equal(c.status, DONATION_STATUS.CONFIRMED);
  assert.equal(c.confirmedBy, "athlete");
  assert.equal(c.confirmedAt, 2000);
  // Original is untouched (immutability).
  assert.equal(d.status, DONATION_STATUS.PENDING);
});

test("confirmDonation is idempotent for already-confirmed donations", () => {
  const d = confirmDonation(createPendingDonation({ athleteId: 1, amount: 500 }), "athlete", 2000);
  const again = confirmDonation(d, "auto", 9999);
  assert.equal(again, d, "returns the same object unchanged");
});

test("isAutoConfirmDue only once the window has elapsed", () => {
  const d = createPendingDonation({ athleteId: 1, amount: 500, createdAt: 0 });
  assert.equal(isAutoConfirmDue(d, AUTO_CONFIRM_MS - 1), false);
  assert.equal(isAutoConfirmDue(d, AUTO_CONFIRM_MS), true);
});

test("isAutoConfirmDue is false for confirmed donations", () => {
  const d = confirmDonation(createPendingDonation({ athleteId: 1, amount: 500, createdAt: 0 }));
  assert.equal(isAutoConfirmDue(d, AUTO_CONFIRM_MS * 10), false);
});

test("applyAutoConfirm confirms only due pending donations via auto", () => {
  const due = createPendingDonation({ athleteId: 1, amount: 100, createdAt: 0, id: "a" });
  const fresh = createPendingDonation({ athleteId: 1, amount: 200, createdAt: AUTO_CONFIRM_MS, id: "b" });
  const list = [due, fresh];
  const next = applyAutoConfirm(list, AUTO_CONFIRM_MS);
  const byId = Object.fromEntries(next.map((d) => [d.id, d]));
  assert.equal(byId.a.status, DONATION_STATUS.CONFIRMED);
  assert.equal(byId.a.confirmedBy, "auto");
  assert.equal(byId.b.status, DONATION_STATUS.PENDING);
});

test("applyAutoConfirm returns the same reference when nothing changes", () => {
  const list = [createPendingDonation({ athleteId: 1, amount: 100, createdAt: 0 })];
  const next = applyAutoConfirm(list, 10);
  assert.equal(next, list);
});

test("msUntilAutoConfirm counts down to zero and stays non-negative", () => {
  const d = createPendingDonation({ athleteId: 1, amount: 100, createdAt: 0 });
  assert.equal(msUntilAutoConfirm(d, 0), AUTO_CONFIRM_MS);
  assert.equal(msUntilAutoConfirm(d, AUTO_CONFIRM_MS), 0);
  assert.equal(msUntilAutoConfirm(d, AUTO_CONFIRM_MS + 5000), 0);
});

test("confirmedTotals sums only confirmed donations for the given athlete", () => {
  const donations = [
    confirmDonation(createPendingDonation({ athleteId: 1, amount: 1000, id: "1" })),
    createPendingDonation({ athleteId: 1, amount: 500, id: "2" }), // pending, excluded
    confirmDonation(createPendingDonation({ athleteId: 1, amount: 2500, id: "3" })),
    confirmDonation(createPendingDonation({ athleteId: 2, amount: 9999, id: "4" })), // other athlete
  ];
  const { total, count } = confirmedTotals(donations, 1);
  assert.equal(total, 3500);
  assert.equal(count, 2);
});

test("confirmedTotals is zero when an athlete has no confirmed donations", () => {
  const donations = [createPendingDonation({ athleteId: 1, amount: 100, id: "1" })];
  assert.deepEqual(confirmedTotals(donations, 1), { total: 0, count: 0 });
  assert.deepEqual(confirmedTotals(donations, 99), { total: 0, count: 0 });
});

// --- Claimed-amount entry (replaces the removed up-front amount prompt) ------

test("parseClaimedAmount treats blank/invalid input as 0 (not yet entered)", () => {
  assert.equal(parseClaimedAmount(""), 0);
  assert.equal(parseClaimedAmount(null), 0);
  assert.equal(parseClaimedAmount(undefined), 0);
  assert.equal(parseClaimedAmount("abc"), 0);
  assert.equal(parseClaimedAmount("-100"), 0);
  assert.equal(parseClaimedAmount("0"), 0);
});

test("parseClaimedAmount parses valid numeric strings", () => {
  assert.equal(parseClaimedAmount("500"), 500);
  assert.equal(parseClaimedAmount("1000.50"), 1000.5);
  assert.equal(parseClaimedAmount(2500), 2500);
});

test("isAmountAcceptable enforces the minimum donation amount", () => {
  assert.equal(isAmountAcceptable(MIN_DONATION_AMOUNT - 1), false);
  assert.equal(isAmountAcceptable(MIN_DONATION_AMOUNT), true);
  assert.equal(isAmountAcceptable(5000), true);
  assert.equal(isAmountAcceptable(0), false);
});

test("canReviewDonation requires receipt, acceptable amount, reference, and method", () => {
  const complete = { receiptName: "r.png", amount: 500, reference: "ABC123456", method: "GCash" };
  assert.equal(canReviewDonation(complete), true);
  assert.equal(canReviewDonation({ ...complete, receiptName: "" }), false);
  assert.equal(canReviewDonation({ ...complete, amount: 10 }), false);
  assert.equal(canReviewDonation({ ...complete, reference: "   " }), false);
  assert.equal(canReviewDonation({ ...complete, method: "" }), false);
  assert.equal(canReviewDonation(), false);
});

// --- Amount-confirmation safeguard (pure state-machine model) ----------------
//
// The UI shows a confirmation dialog with the claimed amount before submitting.
// Canceling returns the supporter to edit (amount preserved, nothing
// submitted); confirming submits exactly the shown amount. The reducer below
// mirrors that decision so it can be asserted without a DOM.

function amountGate(state, action) {
  switch (action.type) {
    case "REQUEST_CONFIRM":
      return { ...state, confirming: true, submitted: false };
    case "CANCEL": // return to edit, keep the amount, submit nothing
      return { ...state, confirming: false, submitted: false };
    case "CONFIRM": // proceed with exactly the confirmed amount
      return { ...state, confirming: false, submitted: true, submittedAmount: state.amount };
    default:
      return state;
  }
}

test("amount confirmation: canceling returns to edit without submitting", () => {
  let state = { amount: 750, confirming: false, submitted: false, submittedAmount: null };
  state = amountGate(state, { type: "REQUEST_CONFIRM" });
  assert.equal(state.confirming, true);
  state = amountGate(state, { type: "CANCEL" });
  assert.equal(state.confirming, false);
  assert.equal(state.submitted, false);
  assert.equal(state.submittedAmount, null, "nothing submitted");
  assert.equal(state.amount, 750, "amount preserved for editing");
});

test("amount confirmation: confirming submits exactly the shown amount", () => {
  let state = { amount: 1200, confirming: false, submitted: false, submittedAmount: null };
  state = amountGate(state, { type: "REQUEST_CONFIRM" });
  state = amountGate(state, { type: "CONFIRM" });
  assert.equal(state.confirming, false);
  assert.equal(state.submitted, true);
  assert.equal(state.submittedAmount, 1200);
});

// --- Rejecting a pending donation -------------------------------------------

test("createPendingDonation stamps supporterId and rejection defaults", () => {
  const d = createPendingDonation({ athleteId: 1, amount: 500, supporterId: "supporter" });
  assert.equal(d.supporterId, "supporter");
  assert.equal(d.status, DONATION_STATUS.PENDING);
  assert.equal(d.rejectedAt, null);
  assert.equal(d.rejectionReason, null);
  assert.equal(d.rejectionNote, "");
});

test("REJECTION_REASONS includes the required options plus Other", () => {
  const values = REJECTION_REASONS.map((r) => r.value);
  assert.ok(values.includes("amount_mismatch"));
  assert.ok(values.includes("invalid_receipt"));
  assert.ok(values.includes("wrong_image"));
  assert.ok(values.includes("other"));
  assert.equal(rejectionReasonLabel("amount_mismatch"), "Amount does not match");
});

test("rejectDonation requires a valid reason", () => {
  const d = createPendingDonation({ athleteId: 1, amount: 500 });
  assert.throws(() => rejectDonation(d, ""), /reason/i);
  assert.throws(() => rejectDonation(d, undefined), /reason/i);
  assert.throws(() => rejectDonation(d, "not_a_real_reason"), /reason/i);
});

test("rejectDonation marks a pending donation rejected with reason and note", () => {
  const d = createPendingDonation({ athleteId: 1, amount: 500, createdAt: 1000 });
  const r = rejectDonation(d, "invalid_receipt", "  Blurry screenshot  ", 2000);
  assert.equal(r.status, DONATION_STATUS.REJECTED);
  assert.equal(r.rejectionReason, "invalid_receipt");
  assert.equal(r.rejectionNote, "Blurry screenshot", "note is trimmed");
  assert.equal(r.rejectedAt, 2000);
  // Confirm metadata stays cleared.
  assert.equal(r.confirmedAt, null);
  assert.equal(r.confirmedBy, null);
  // Original is untouched (immutability).
  assert.equal(d.status, DONATION_STATUS.PENDING);
});

test("a confirmed donation cannot be rejected (totals stay intact)", () => {
  const confirmed = confirmDonation(createPendingDonation({ athleteId: 1, amount: 500 }), "athlete", 2000);
  const afterReject = rejectDonation(confirmed, "amount_mismatch");
  assert.equal(afterReject, confirmed, "returns the same confirmed object unchanged");
  assert.equal(afterReject.status, DONATION_STATUS.CONFIRMED);
});

test("a rejected donation cannot later be confirmed", () => {
  const rejected = rejectDonation(createPendingDonation({ athleteId: 1, amount: 500 }), "wrong_image");
  const afterConfirm = confirmDonation(rejected, "athlete", 3000);
  assert.equal(afterConfirm, rejected, "returns the same rejected object unchanged");
  assert.equal(afterConfirm.status, DONATION_STATUS.REJECTED);
});

test("rejectDonation is idempotent for an already-rejected donation", () => {
  const rejected = rejectDonation(createPendingDonation({ athleteId: 1, amount: 500 }), "other", "note");
  const again = rejectDonation(rejected, "amount_mismatch", "different");
  assert.equal(again, rejected, "unchanged, keeps original reason/note");
  assert.equal(again.rejectionReason, "other");
});

test("canRejectDonation only allows pending donations", () => {
  const pending = createPendingDonation({ athleteId: 1, amount: 500 });
  assert.equal(canRejectDonation(pending), true);
  assert.equal(canRejectDonation(confirmDonation(pending)), false);
  assert.equal(canRejectDonation(rejectDonation(pending, "other")), false);
  assert.equal(canRejectDonation(null), false);
});

test("rejected donations do not affect confirmed totals or supporter count", () => {
  const donations = [
    confirmDonation(createPendingDonation({ athleteId: 1, amount: 1000, id: "1" })),
    rejectDonation(createPendingDonation({ athleteId: 1, amount: 9999, id: "2" }), "amount_mismatch"),
    createPendingDonation({ athleteId: 1, amount: 500, id: "3" }), // pending
    confirmDonation(createPendingDonation({ athleteId: 1, amount: 2500, id: "4" })),
  ];
  const { total, count } = confirmedTotals(donations, 1);
  assert.equal(total, 3500, "only the two confirmed donations count");
  assert.equal(count, 2);
});

test("applyAutoConfirm never auto-confirms a rejected donation", () => {
  const rejected = rejectDonation(
    createPendingDonation({ athleteId: 1, amount: 500, createdAt: 0, id: "r" }),
    "invalid_receipt",
  );
  const next = applyAutoConfirm([rejected], AUTO_CONFIRM_MS * 10);
  assert.equal(next[0].status, DONATION_STATUS.REJECTED);
});

// --- Visibility scoping: who sees which donations ---------------------------
// Mirrors the store's getDonationsForAthlete / getDonationsForSupporter filters
// so the association rule is covered without a React runtime.

const forAthlete = (donations, athleteId) => donations.filter((d) => d.athleteId === athleteId);
const forSupporter = (donations, supporterId) => donations.filter((d) => d.supporterId === supporterId);

test("donations are scoped to the correct athlete and supporter", () => {
  const donations = [
    createPendingDonation({ athleteId: 1, amount: 100, supporterId: "supporter", id: "a" }),
    confirmDonation(createPendingDonation({ athleteId: 1, amount: 200, supporterId: "supporter", id: "b" })),
    rejectDonation(createPendingDonation({ athleteId: 2, amount: 300, supporterId: "supporter", id: "c" }), "other"),
    createPendingDonation({ athleteId: 1, amount: 400, supporterId: "other-supporter", id: "d" }),
  ];

  // Athlete 1 sees all three of their donations across every status.
  const a1 = forAthlete(donations, 1);
  assert.deepEqual(a1.map((d) => d.id).sort(), ["a", "b", "d"]);
  assert.deepEqual(
    a1.map((d) => d.status).sort(),
    [DONATION_STATUS.CONFIRMED, DONATION_STATUS.PENDING, DONATION_STATUS.PENDING].sort(),
  );

  // The demo supporter sees only their own submissions (never "other-supporter").
  const mine = forSupporter(donations, "supporter");
  assert.deepEqual(mine.map((d) => d.id).sort(), ["a", "b", "c"]);
  assert.ok(!mine.some((d) => d.supporterId === "other-supporter"), "no other supporter's data");
  // And those span pending, confirmed, and rejected.
  const statuses = new Set(mine.map((d) => d.status));
  assert.ok(statuses.has(DONATION_STATUS.PENDING));
  assert.ok(statuses.has(DONATION_STATUS.CONFIRMED));
  assert.ok(statuses.has(DONATION_STATUS.REJECTED));
});
