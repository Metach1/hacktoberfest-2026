import test from "node:test";
import assert from "node:assert/strict";

import {
  parseAmount,
  parseReference,
  parseMethod,
  parseReceiptText,
} from "../src/app/lib/receipt-parse.mjs";

test("parseAmount reads a peso-prefixed amount with thousands separators", () => {
  assert.equal(parseAmount("Amount Sent ₱2,500.00"), 2500);
  assert.equal(parseAmount("PHP 1,000"), 1000);
  assert.equal(parseAmount("P 500"), 500);
});

test("parseAmount falls back to a decimal figure without a peso marker", () => {
  assert.equal(parseAmount("Total 750.00 to J. Santos"), 750);
});

test("parseAmount returns null when there is no amount", () => {
  assert.equal(parseAmount("Reference only ABC12345"), null);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount(null), null);
});

test("parseReference reads a labeled reference number", () => {
  assert.equal(parseReference("Ref No. 0123 4567 8901"), "012345678901");
  assert.equal(parseReference("Reference: ABC123DEF"), "ABC123DEF");
  assert.equal(parseReference("Transaction ID: TXN-556677"), "TXN-556677");
});

test("parseReference falls back to a long alphanumeric token", () => {
  assert.equal(parseReference("Sent to wallet 5566778899 today"), "5566778899");
});

test("parseReference returns null when nothing looks like a reference", () => {
  assert.equal(parseReference("Paid 500 to Nina"), null);
  assert.equal(parseReference(""), null);
});

test("parseMethod recognizes common PH e-wallets and banks", () => {
  assert.equal(parseMethod("Sent via GCash"), "GCash");
  assert.equal(parseMethod("Maya wallet transfer"), "Maya");
  assert.equal(parseMethod("PayMaya receipt"), "Maya");
  assert.equal(parseMethod("BPI online"), "BPI");
  assert.equal(parseMethod("GrabPay balance"), "GrabPay");
});

test("parseMethod returns null for unrecognized text", () => {
  assert.equal(parseMethod("some random receipt"), null);
  assert.equal(parseMethod(""), null);
});

test("parseReceiptText combines all suggestions from a realistic receipt", () => {
  const text = [
    "GCash",
    "Sent Successfully",
    "Amount ₱1,500.00",
    "Ref No. 0098 7654 3210",
    "Oct 21, 2026",
  ].join("\n");
  const parsed = parseReceiptText(text);
  assert.equal(parsed.amount, 1500);
  assert.equal(parsed.reference, "009876543210");
  assert.equal(parsed.method, "GCash");
});

test("parseReceiptText returns nulls for unreadable text, enabling manual entry", () => {
  const parsed = parseReceiptText("illegible scribbles");
  assert.deepEqual(parsed, { amount: null, reference: null, method: null });
});
