import test from "node:test";
import assert from "node:assert/strict";

/**
 * The supporter "My payments" three-dot menu offers actions gated by donation
 * status. PaymentRowMenu is a React component, so — as with the receipt viewer
 * tests — we model the pure option-gating rule here rather than mounting a DOM:
 *
 *  - rejected  -> View, Edit & resubmit, Delete
 *  - pending   -> View, Delete            (no resubmit; it's under review)
 *  - confirmed -> View                    (never editable or deletable, so
 *                                           confirmed totals are never touched)
 *
 * Mirrors the component's `isRejected` (status === "rejected") and `canDelete`
 * (status !== "confirmed") gating.
 */
function menuOptions(status) {
  const options = ["View"];
  if (status === "rejected") options.push("Edit & resubmit");
  if (status !== "confirmed") options.push("Delete");
  return options;
}

test("rejected donation offers View, Edit & resubmit, and Delete", () => {
  assert.deepEqual(menuOptions("rejected"), ["View", "Edit & resubmit", "Delete"]);
});

test("pending donation offers View and Delete but not resubmit", () => {
  assert.deepEqual(menuOptions("pending"), ["View", "Delete"]);
});

test("confirmed donation offers View only (not editable or deletable)", () => {
  assert.deepEqual(menuOptions("confirmed"), ["View"]);
});

test("only rejected donations expose the resubmit action", () => {
  for (const status of ["pending", "confirmed"]) {
    assert.ok(!menuOptions(status).includes("Edit & resubmit"), `${status} has no resubmit`);
  }
  assert.ok(menuOptions("rejected").includes("Edit & resubmit"));
});

test("confirmed donations never expose Delete (protects confirmed totals)", () => {
  assert.ok(!menuOptions("confirmed").includes("Delete"));
  for (const status of ["pending", "rejected"]) {
    assert.ok(menuOptions(status).includes("Delete"), `${status} is deletable`);
  }
});
