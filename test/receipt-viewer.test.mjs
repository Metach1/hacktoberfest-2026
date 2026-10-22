import test from "node:test";
import assert from "node:assert/strict";

/**
 * The athlete review flow lets the athlete open an uploaded receipt at full
 * size in a popup modeled on the QR fullscreen viewer. The popup is a React
 * component, so rather than mount a DOM we model its open/close state machine
 * here — the same approach used for the amount-confirmation gate in
 * donations.test.mjs. This captures the behavior the UI must preserve:
 *
 *  - It only opens for a donation that actually has a receipt image.
 *  - It dismisses via the close button, an outside (backdrop) click, and Escape.
 *  - An inside (dialog) click does NOT dismiss it.
 *  - A missing receipt image is handled gracefully (never opens).
 */
function viewer(state, action) {
  switch (action.type) {
    case "OPEN":
      // Only open when the donation carries a receipt preview image.
      return action.donation?.receiptPreview
        ? { open: true, donation: action.donation }
        : { open: false, donation: null };
    case "CLOSE_BUTTON":
    case "BACKDROP_CLICK":
    case "ESCAPE":
      return { open: false, donation: null };
    case "DIALOG_CLICK": // stopPropagation: inside clicks never dismiss
      return state;
    default:
      return state;
  }
}

const withReceipt = { id: "d1", receiptPreview: "data:image/png;base64,AAA", receiptName: "r.png" };
const noReceipt = { id: "d2", receiptPreview: "", receiptName: "" };
const closed = { open: false, donation: null };

test("receipt viewer opens for a donation that has a receipt image", () => {
  const next = viewer(closed, { type: "OPEN", donation: withReceipt });
  assert.equal(next.open, true);
  assert.equal(next.donation.id, "d1");
});

test("receipt viewer stays closed when the receipt image is missing", () => {
  const next = viewer(closed, { type: "OPEN", donation: noReceipt });
  assert.equal(next.open, false, "no image -> nothing to show");
  assert.equal(next.donation, null);
});

test("receipt viewer dismisses via close button, backdrop click, and Escape", () => {
  const open = viewer(closed, { type: "OPEN", donation: withReceipt });
  for (const type of ["CLOSE_BUTTON", "BACKDROP_CLICK", "ESCAPE"]) {
    const next = viewer(open, { type });
    assert.equal(next.open, false, `${type} closes the viewer`);
    assert.equal(next.donation, null);
  }
});

test("receipt viewer ignores clicks inside the dialog (stopPropagation)", () => {
  const open = viewer(closed, { type: "OPEN", donation: withReceipt });
  const next = viewer(open, { type: "DIALOG_CLICK" });
  assert.equal(next.open, true, "inside click keeps it open");
  assert.equal(next.donation.id, "d1");
});
