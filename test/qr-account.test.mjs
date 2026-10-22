import test from "node:test";
import assert from "node:assert/strict";

/**
 * Payment QR codes now require a mandatory account number, and no placeholder
 * image is generated when none is uploaded (the image stays ""). The store
 * action and the QrManager form are React code, so — as with the other
 * pure-logic UI tests (qr-edit, qr-selection) — we model the exact logic here:
 *
 *   save gate : both the account name (label) and account number must be
 *               non-empty (trimmed) to Save a QR (add or edit).
 *   addQrCode : builds { id, method, label, accountNumber, image } with
 *               image = image ?? "" — NO placeholder fallback.
 *   replaceQrCode : { ...q, ...patch } merge, preserving the id.
 */

/** Mirrors the "Save QR" / "Save changes" disabled condition. */
function canSaveQr(label, accountNumber) {
  return label.trim().length > 0 && accountNumber.trim().length > 0;
}

/** Mirrors the store's addQrCode record construction (no placeholder image). */
function buildQr(athleteId, method, label, accountNumber, image) {
  return {
    id: `qr-${athleteId}-fixed`,
    method,
    label,
    accountNumber,
    image: image ?? "",
  };
}

/** Mirrors replaceQrCode's in-place patch merge. */
function replaceQrCode(list, qrId, patch) {
  return list.map((q) => (q.id === qrId ? { ...q, ...patch } : q));
}

test("saving a QR requires a non-empty account number", () => {
  assert.equal(canSaveQr("J. Santos", "0917 123 4567"), true, "both present -> can save");
  assert.equal(canSaveQr("J. Santos", ""), false, "missing account number -> blocked");
  assert.equal(canSaveQr("J. Santos", "   "), false, "whitespace-only account number -> blocked");
  assert.equal(canSaveQr("", "0917 123 4567"), false, "missing account name -> blocked");
});

test("adding a QR persists the account number", () => {
  const qr = buildQr(1, "GCash", "J. Santos", "0917 123 4567", "data:image/png;base64,AAA");
  assert.equal(qr.accountNumber, "0917 123 4567");
  assert.equal(qr.method, "GCash");
  assert.equal(qr.label, "J. Santos");
});

test("adding a QR with no image stores an empty string — no placeholder generated", () => {
  const qr = buildQr(1, "Maya", "J. Santos", "0918 765 4321", undefined);
  assert.equal(qr.image, "", "image is empty, not a generated placeholder data URL");
  assert.doesNotMatch(qr.image, /^data:image\/svg/, "no inline-SVG placeholder");
});

test("editing a QR can change the account number while preserving its id", () => {
  const list = [
    { id: "qr-1", method: "GCash", label: "J. Santos", accountNumber: "0917 000 0000", image: "" },
  ];
  const next = replaceQrCode(list, "qr-1", { accountNumber: "0917 999 9999" });
  const edited = next.find((q) => q.id === "qr-1");
  assert.equal(edited.id, "qr-1", "same record id preserved");
  assert.equal(edited.accountNumber, "0917 999 9999", "account number updated");
  assert.equal(edited.label, "J. Santos", "other fields untouched");
});
