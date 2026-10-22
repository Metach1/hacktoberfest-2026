import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidAccountNumber,
  MIN_ACCOUNT_NUMBER_DIGITS,
  MAX_ACCOUNT_NUMBER_DIGITS,
} from "../src/app/lib/donations.mjs";

/**
 * Payment-QR account numbers must be digits only (spaces/dashes allowed as
 * separators), with MIN..MAX digits inclusive. The QR manager UI gates "Save
 * QR"/"Save changes" on this same pure predicate.
 */

test("accepts a number at the min and max digit lengths", () => {
  const min = "0".repeat(MIN_ACCOUNT_NUMBER_DIGITS);
  const max = "0".repeat(MAX_ACCOUNT_NUMBER_DIGITS);
  assert.equal(isValidAccountNumber(min), true, `${MIN_ACCOUNT_NUMBER_DIGITS} digits ok`);
  assert.equal(isValidAccountNumber(max), true, `${MAX_ACCOUNT_NUMBER_DIGITS} digits ok`);
  assert.equal(isValidAccountNumber("0917123456"), true, "typical 10-digit mobile wallet number");
});

test("rejects too-short and too-long numbers", () => {
  assert.equal(isValidAccountNumber("0".repeat(MIN_ACCOUNT_NUMBER_DIGITS - 1)), false, "one below min");
  assert.equal(isValidAccountNumber("0".repeat(MAX_ACCOUNT_NUMBER_DIGITS + 1)), false, "one above max");
  assert.equal(isValidAccountNumber("123"), false, "clearly too short");
});

test("rejects non-numeric content", () => {
  assert.equal(isValidAccountNumber("0917abc4567"), false, "letters not allowed");
  assert.equal(isValidAccountNumber("0917.123.4567"), false, "dots not allowed");
  assert.equal(isValidAccountNumber("+6391712345"), false, "plus sign not allowed");
  assert.equal(isValidAccountNumber(""), false, "empty is invalid");
  assert.equal(isValidAccountNumber(null), false, "null is invalid");
  assert.equal(isValidAccountNumber(undefined), false, "undefined is invalid");
});

test("allows spaces and dashes as separators and counts only the digits", () => {
  assert.equal(isValidAccountNumber("0917 123 4567"), true, "spaces stripped, 11 digits");
  assert.equal(isValidAccountNumber("0917-123-4567"), true, "dashes stripped, 11 digits");
  assert.equal(isValidAccountNumber("09 17"), false, "separators don't count toward the minimum");
  assert.equal(isValidAccountNumber("   "), false, "separators only, no digits");
});
