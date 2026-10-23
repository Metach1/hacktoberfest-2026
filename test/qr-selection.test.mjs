import test from "node:test";
import assert from "node:assert/strict";

/**
 * The donation checkout lets a supporter pick which published QR account to
 * pay. An athlete may publish several QRs for the SAME provider (e.g. two
 * GCash accounts), so selection must be tracked by each QR's UNIQUE id — not by
 * the provider name, which is not unique. The DonationModal is a React
 * component, so (as with receipt-viewer.test.mjs) we model its pure selection
 * logic here. This mirrors donation.tsx:
 *
 *   activeQr = qrCodes.find((q) => q.id === selectedQrId) ?? qrCodes[0]
 *   method   = activeQr?.method ?? ""
 *
 * The same `activeQr` drives the QR tabs' selected state, the displayed image,
 * and the full-screen QR, so resolving it once by id fixes all three. The
 * donation records the provider name (activeQr.method), not the id.
 */
function resolveActiveQr(qrCodes, selectedQrId) {
  return qrCodes.find((q) => q.id === selectedQrId) ?? qrCodes[0];
}
function methodOf(activeQr) {
  return activeQr?.method ?? "";
}

// GCash, Maya, GCash — two distinct GCash accounts with different ids/images.
const QRS = [
  { id: "qr-gcash-1", method: "GCash", label: "J. Santos · 0917•••1111", image: "img-gcash-1" },
  { id: "qr-maya-1", method: "Maya", label: "J. Santos · 0917•••2222", image: "img-maya-1" },
  { id: "qr-gcash-2", method: "GCash", label: "J. Santos · 0998•••3333", image: "img-gcash-2" },
];

test("selecting the FIRST GCash shows the first GCash image", () => {
  const active = resolveActiveQr(QRS, "qr-gcash-1");
  assert.equal(active.id, "qr-gcash-1");
  assert.equal(active.image, "img-gcash-1");
  assert.equal(methodOf(active), "GCash", "records provider name");
});

test("selecting the SECOND GCash shows the second GCash image (not the first)", () => {
  const active = resolveActiveQr(QRS, "qr-gcash-2");
  assert.equal(active.id, "qr-gcash-2");
  assert.equal(active.image, "img-gcash-2", "the bug: used to resolve to img-gcash-1");
  assert.notEqual(active.image, "img-gcash-1");
  assert.equal(methodOf(active), "GCash", "still records GCash as the method");
});

test("selecting Maya shows the Maya image and records Maya", () => {
  const active = resolveActiveQr(QRS, "qr-maya-1");
  assert.equal(active.image, "img-maya-1");
  assert.equal(methodOf(active), "Maya");
});

test("the full-screen QR uses the same active QR, so it matches the selection", () => {
  // Full-screen renders activeQr.image, so it resolves identically by id.
  const first = resolveActiveQr(QRS, "qr-gcash-1");
  const second = resolveActiveQr(QRS, "qr-gcash-2");
  assert.equal(first.image, "img-gcash-1");
  assert.equal(second.image, "img-gcash-2");
  assert.notEqual(first.image, second.image, "full-screen distinguishes the two GCash accounts");
});

test("QR tab selected-state is by id, so only the clicked GCash tab is active", () => {
  const selectedQrId = "qr-gcash-2";
  const active = resolveActiveQr(QRS, selectedQrId);
  const selectedFlags = QRS.map((q) => active?.id === q.id);
  assert.deepEqual(selectedFlags, [false, false, true], "only the second GCash tab is selected");
});

test("no selection falls back to the first published QR", () => {
  const active = resolveActiveQr(QRS, "");
  assert.equal(active.id, "qr-gcash-1");
  assert.equal(methodOf(active), "GCash");
});

test("duplicate providers are distinguished in the UI by their label", () => {
  // Mirrors the tab/select label rule: append the account label when a provider
  // appears more than once.
  const labelFor = (q) => {
    const dupe = QRS.filter((o) => o.method === q.method).length > 1;
    return dupe && q.label ? `${q.method} · ${q.label}` : q.method;
  };
  assert.equal(labelFor(QRS[0]), "GCash · J. Santos · 0917•••1111");
  assert.equal(labelFor(QRS[2]), "GCash · J. Santos · 0998•••3333");
  assert.equal(labelFor(QRS[1]), "Maya", "a unique provider needs no label suffix");
  assert.notEqual(labelFor(QRS[0]), labelFor(QRS[2]), "the two GCash tabs read differently");
});
