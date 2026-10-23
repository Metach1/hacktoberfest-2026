import test from "node:test";
import assert from "node:assert/strict";

/**
 * Editing a published QR (athlete dashboard Qr manager) can now change the
 * payment method as well as the account label and image. The store's
 * replaceQrCode is a React hook, so — as with the other pure-logic UI tests
 * (receipt-viewer, qr-selection) — we model its documented merge semantics:
 *
 *   existing.map((q) => (q.id === qrId ? { ...q, ...patch } : q))
 *
 * The key guarantees: a patch can change `method`, the QR `id` is preserved
 * (not a new record), other QRs are untouched, and `method` stays a provider
 * name string.
 */
function replaceQrCode(list, qrId, patch) {
  return list.map((q) => (q.id === qrId ? { ...q, ...patch } : q));
}

const QRS = [
  { id: "qr-1", method: "GCash", label: "J. Santos · 0917•••1111", image: "img-1" },
  { id: "qr-2", method: "Maya", label: "J. Santos · 0917•••2222", image: "img-2" },
];

test("editing a QR can change its payment method while preserving its id", () => {
  const next = replaceQrCode(QRS, "qr-1", { method: "Maya", label: "J. Santos · new" });
  const edited = next.find((q) => q.id === "qr-1");
  assert.equal(edited.id, "qr-1", "same record id preserved (not recreated)");
  assert.equal(edited.method, "Maya", "method changed");
  assert.equal(typeof edited.method, "string", "method stays a provider-name string");
  assert.equal(edited.label, "J. Santos · new", "label changed");
  assert.equal(edited.image, "img-1", "image untouched when omitted from the patch");
});

test("editing a QR can change method, label, and image together", () => {
  const next = replaceQrCode(QRS, "qr-2", { method: "BPI", label: "Acct", image: "img-new" });
  const edited = next.find((q) => q.id === "qr-2");
  assert.deepEqual(
    { id: edited.id, method: edited.method, label: edited.label, image: edited.image },
    { id: "qr-2", method: "BPI", label: "Acct", image: "img-new" },
  );
});

test("editing one QR does not affect the others, and count is unchanged", () => {
  const next = replaceQrCode(QRS, "qr-1", { method: "GrabPay" });
  assert.equal(next.length, QRS.length, "no record added or removed");
  assert.deepEqual(next.find((q) => q.id === "qr-2"), QRS[1], "the other QR is untouched");
});
