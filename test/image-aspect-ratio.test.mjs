import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Guards against uploaded QR / receipt images being squished. Every box that
 * displays or previews a user-provided QR or receipt must constrain the image
 * with `object-fit: contain`, which preserves the intrinsic aspect ratio inside
 * the layout box instead of stretching (the old bug) or cropping away a QR's
 * finder patterns. This is a lightweight, dependency-free regression check on
 * the stylesheet — it mirrors how the project tests its generated data files.
 */

const css = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

/** Extract the declaration block for a `selector { ... }` rule. */
function ruleBody(selector) {
  const i = css.indexOf(`${selector} {`);
  assert.notEqual(i, -1, `expected a CSS rule for "${selector}"`);
  const start = css.indexOf("{", i);
  const end = css.indexOf("}", start);
  return css.slice(start + 1, end);
}

const IMAGE_SELECTORS = [
  ".qr-display img", // supporter: QR shown to scan & pay
  ".qr-fullscreen-dialog img", // supporter: enlarged QR view
  ".qr-manage-row img", // athlete dashboard: managed QR thumbnails
  ".receipt-preview img", // uploaded receipt + new/edited QR upload preview
  ".review-receipt img", // review + athlete receipt viewer
  ".pending-thumb", // athlete dashboard: pending receipt thumbnail
];

for (const selector of IMAGE_SELECTORS) {
  test(`${selector} preserves aspect ratio with object-fit: contain`, () => {
    const body = ruleBody(selector);
    assert.match(
      body,
      /object-fit:\s*contain/,
      `"${selector}" must set object-fit: contain to avoid squished images`,
    );
    assert.doesNotMatch(
      body,
      /object-fit:\s*fill/,
      `"${selector}" must not use object-fit: fill (that stretches/squishes)`,
    );
  });
}
