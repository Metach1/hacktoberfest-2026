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
