import test from "node:test";
import assert from "node:assert/strict";

import {
  RECEIPT_DECISION,
  DEFAULT_RECEIPT_POLICY,
  receiptSignalScore,
  classifyReceipt,
} from "../src/app/lib/receipt-filter.mjs";

test("receiptSignalScore rewards structured transaction fields", () => {
  assert.equal(receiptSignalScore({}), 0);
  assert.equal(receiptSignalScore({ amount: 500 }), 0.4);
  assert.ok(receiptSignalScore({ amount: 500, reference: "ABC12345" }) >= 0.75);
  // A QR presence alone is not modeled here — no fields means no score.
  assert.equal(receiptSignalScore({ rawText: "just some words" }), 0);
});

test("classifyReceipt ACCEPTS an image with clear receipt signal", () => {
  const result = classifyReceipt({
    ocr: { amount: 1500, reference: "009876543210", method: "GCash", rawText: "GCash Sent Ref No. 00987" },
    moderation: { available: true, explicitScore: 0.01 },
  });
  assert.equal(result.decision, RECEIPT_DECISION.ACCEPT);
  assert.equal(result.visibleToAthlete, true);
});

test("classifyReceipt REJECTS a confidently explicit image before storage", () => {
  const result = classifyReceipt({
    ocr: { amount: 1500, reference: "009876543210", method: "GCash" }, // strong receipt signal
    moderation: { available: true, explicitScore: 0.95 }, // but explicit
  });
  assert.equal(result.decision, RECEIPT_DECISION.REJECT, "explicit content overrides receipt signal");
  assert.equal(result.visibleToAthlete, false);
  assert.ok(result.reason.length > 0, "has a neutral, actionable message");
});

test("classifyReceipt is UNCERTAIN for a non-explicit image with no receipt signal", () => {
  const result = classifyReceipt({
    ocr: { amount: null, reference: null, method: null, rawText: "selfie at the beach" },
    moderation: { available: true, explicitScore: 0.1 },
  });
  assert.equal(result.decision, RECEIPT_DECISION.UNCERTAIN);
  assert.equal(result.visibleToAthlete, false, "kept private from the athlete");
});

test("classifyReceipt is UNCERTAIN (not accepted) when moderation is unavailable and signal is weak", () => {
  const result = classifyReceipt({
    ocr: { amount: null, reference: null, method: null },
    moderation: { available: false, explicitScore: 0 },
  });
  assert.equal(result.decision, RECEIPT_DECISION.UNCERTAIN);
  assert.equal(result.visibleToAthlete, false);
});

test("classifyReceipt still ACCEPTS a strong receipt even when moderation is unavailable", () => {
  // Moderation being unavailable must not block a plausible receipt; it only
  // means we can't catch explicit content, which the accept path doesn't claim
  // anything about beyond "looks like a receipt".
  const result = classifyReceipt({
    ocr: { amount: 500, reference: "REF123456", method: "Maya", rawText: "Maya payment successful" },
    moderation: { available: false, explicitScore: 0 },
  });
  assert.equal(result.decision, RECEIPT_DECISION.ACCEPT);
  assert.equal(result.visibleToAthlete, true);
});

test("classifyReceipt respects a stricter explicit threshold via policy override", () => {
  const signals = {
    ocr: { amount: 500, reference: "REF123456" },
    moderation: { available: true, explicitScore: 0.5 },
  };
  // Default threshold (0.7): 0.5 is below -> accepted on receipt signal.
  assert.equal(classifyReceipt(signals).decision, RECEIPT_DECISION.ACCEPT);
  // Stricter threshold (0.4): 0.5 now counts as explicit -> rejected.
  assert.equal(
    classifyReceipt(signals, { ...DEFAULT_RECEIPT_POLICY, explicitReject: 0.4 }).decision,
    RECEIPT_DECISION.REJECT,
  );
});

test("classifyReceipt handles missing signals defensively", () => {
  const result = classifyReceipt();
  assert.equal(result.decision, RECEIPT_DECISION.UNCERTAIN);
  assert.equal(result.visibleToAthlete, false);
});
