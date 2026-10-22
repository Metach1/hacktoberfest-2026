import test from "node:test";
import assert from "node:assert/strict";
import { getInitials, resolveDisplayName } from "../src/app/lib/profile-display.mjs";

test("uses the trimmed full profile name when both names are present", () => {
  assert.equal(resolveDisplayName("  Ana ", " Cruz  ", "ana@example.com"), "Ana Cruz");
});

test("uses the available profile name before falling back", () => {
  assert.equal(resolveDisplayName("Ana", null, "ana@example.com"), "Ana");
  assert.equal(resolveDisplayName(null, "Cruz", "ana@example.com"), "Cruz");
});

test("falls back when the profile has no usable name", () => {
  assert.equal(resolveDisplayName(" ", null, "ana@example.com"), "ana@example.com");
  assert.equal(resolveDisplayName(null, null), null);
});

test("derives avatar initials from the full display name", () => {
  assert.equal(getInitials("Ana Maria Cruz"), "AM");
  assert.equal(getInitials("  Supporter  "), "S");
  assert.equal(getInitials(null), "");
});
