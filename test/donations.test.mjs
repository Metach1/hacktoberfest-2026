import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTO_CONFIRM_MS,
  DONATION_STATUS,
  createPendingDonation,
  confirmDonation,
  isAutoConfirmDue,
  applyAutoConfirm,
  msUntilAutoConfirm,
  confirmedTotals,
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
