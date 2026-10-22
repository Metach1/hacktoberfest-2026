/**
 * Pure, dependency-free validator for Philippine payment QR codes.
 *
 * It inspects the *decoded text* of a QR code (the string a scanner reads from
 * the image) and decides whether it is a supported e-wallet / bank payment QR.
 * No DOM, no network, so it is unit-testable by native `node --test` and can be
 * imported by browser code after the image has been decoded locally.
 *
 * Supported format: EMVCo Merchant-Presented Mode QR, as used by the national
 * **QR Ph** standard (BSP / Philippine Payments Management, Inc. — PPMI) that
 * backs GCash, Maya, and InstaPay/PESONet bank QR codes. The payload is a
 * sequence of Tag-Length-Value (TLV) blocks:
 *
 *   ID (2 digits) + Length (2 digits) + Value (Length chars)
 *
 * Validation checks, in order:
 *   1. The string parses cleanly as EMVCo TLV with no leftover characters.
 *   2. Tag 00 (Payload Format Indicator) is present and equal to "01".
 *   3. Tag 63 (CRC) is present, last, and matches a CRC-16/CCITT-FALSE computed
 *      over everything up to and including the "6304" CRC tag+length.
 *   4. For QR Ph specifically: country (tag 58) is "PH", currency (tag 53) is
 *      "608" (PHP, ISO 4217), and at least one Merchant Account Information
 *      template (tags 26–51) carries a PPMI / ph.* domain GUID.
 *
 * IMPORTANT: a valid result means the image *is a well-formed PH payment QR*.
 * It is NOT proof that any payment occurred, nor that funds reached a specific
 * account. This module never contacts a payment provider and never verifies a
 * transaction. All demo data is fictional.
 */

/** EMVCo primitive tags we care about. */
export const EMV_TAG = Object.freeze({
  PAYLOAD_FORMAT_INDICATOR: "00",
  POINT_OF_INITIATION: "01",
  TRANSACTION_CURRENCY: "53",
  TRANSACTION_AMOUNT: "54",
  COUNTRY_CODE: "58",
  MERCHANT_NAME: "59",
  MERCHANT_CITY: "60",
  CRC: "63",
});

/** ISO 4217 numeric currency code for the Philippine peso. */
export const PHP_CURRENCY_CODE = "608";

/** ISO 3166-1 alpha-2 country code for the Philippines. */
export const PH_COUNTRY_CODE = "PH";

/**
 * Merchant Account Information templates occupy tags 26–51 inclusive. A QR Ph
 * template nests its own TLV, the first of which (sub-tag 00) is a Globally
 * Unique Identifier (GUID). PPMI-issued QR Ph GUIDs live under the `ph.` / PPMI
 * domain (e.g. "ph.ppmi.p2m", "ph.ppmi.p2p").
 */
const MERCHANT_ACCOUNT_TAG_MIN = 26;
const MERCHANT_ACCOUNT_TAG_MAX = 51;

/** Recognize a QR Ph / PPMI merchant-account GUID. */
function isPhPaymentGuid(guid) {
  if (!guid) return false;
  const g = guid.toLowerCase();
  return g.includes("ppmi") || g.startsWith("ph.") || g.includes("qrph");
}

/**
 * Compute CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over an ASCII string,
 * the checksum EMVCo mandates for tag 63. Returns an uppercase 4-hex-digit
 * string.
 *
 * @param {string} input
 * @returns {string}
 */
export function crc16ccitt(input) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let b = 0; b < 8; b += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Parse an EMVCo TLV string into an array of top-level { id, value } blocks.
 * Returns null if the string is not well-formed EMVCo TLV (bad length header,
 * truncated value, or trailing characters).
 *
 * @param {string} text
 * @returns {Array<{ id: string, value: string }>|null}
 */
export function parseEmvTlv(text) {
  if (typeof text !== "string" || text.length < 4) return null;
  const blocks = [];
  let i = 0;
  while (i < text.length) {
    // Need at least a 2-char id + 2-char length.
    if (i + 4 > text.length) return null;
    const id = text.slice(i, i + 2);
    const lenStr = text.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenStr)) return null;
    const len = Number(lenStr);
    const start = i + 4;
    const end = start + len;
    if (end > text.length) return null; // truncated value
    blocks.push({ id, value: text.slice(start, end) });
    i = end;
  }
  return blocks;
}

/** Find the first top-level block with the given id. */
function findBlock(blocks, id) {
  return blocks.find((b) => b.id === id);
}

/**
 * Validate decoded QR text against supported PH payment QR formats.
 *
 * @param {string} text Decoded QR string.
 * @returns {{
 *   valid: boolean,
 *   format: "qr-ph" | "emvco" | null,
 *   method: string | null,
 *   reason: string | null,
 * }}
 *   `valid` is true only when the payload is a well-formed EMVCo payment QR with
 *   a correct CRC. `format` is "qr-ph" when it also satisfies the PH-specific
 *   checks (country/currency/PPMI GUID), "emvco" for a generic but valid EMVCo
 *   payment QR, or null when invalid. `reason` carries an actionable, human
 *   message when `valid` is false.
 */
export function validatePaymentQr(text) {
  const fail = (reason) => ({ valid: false, format: null, method: null, reason });

  if (typeof text !== "string" || text.trim().length === 0) {
    return fail("We couldn't read a QR code in that image. Upload a clear photo or screenshot of your payment QR.");
  }

  const raw = text.trim();
  const blocks = parseEmvTlv(raw);
  if (!blocks) {
    return fail("That QR code isn't a supported payment QR. Upload your GCash, Maya, or bank (QR Ph) code.");
  }

  // Payload Format Indicator must be present and equal to "01".
  const pfi = findBlock(blocks, EMV_TAG.PAYLOAD_FORMAT_INDICATOR);
  if (!pfi || pfi.value !== "01") {
    return fail("That QR code isn't a payment QR (missing EMVCo payload format). Upload your GCash, Maya, or bank QR.");
  }

  // CRC (tag 63) must be the final block and a valid 4-hex checksum.
  const crcIndex = blocks.findIndex((b) => b.id === EMV_TAG.CRC);
  if (crcIndex === -1 || crcIndex !== blocks.length - 1) {
    return fail("That payment QR is incomplete or corrupted (missing checksum). Re-upload a clear image of the full QR.");
  }
  const crcBlock = blocks[crcIndex];
  if (!/^[0-9A-Fa-f]{4}$/.test(crcBlock.value)) {
    return fail("That payment QR is corrupted (bad checksum). Re-upload a clear image of the full QR.");
  }
  // CRC is computed over the whole payload up to and including the "6304"
  // tag+length prefix of the CRC block itself.
  const crcPrefixEnd = raw.lastIndexOf(crcBlock.value);
  const crcInput = raw.slice(0, crcPrefixEnd);
  if (crc16ccitt(crcInput) !== crcBlock.value.toUpperCase()) {
    return fail("That payment QR failed its integrity check (checksum mismatch). It may be edited or not a real payment QR.");
  }

  // At this point it is a structurally valid EMVCo payment QR.
  // Now apply the PH-specific (QR Ph) checks.
  const country = findBlock(blocks, EMV_TAG.COUNTRY_CODE);
  const currency = findBlock(blocks, EMV_TAG.TRANSACTION_CURRENCY);

  let hasPhGuid = false;
  let method = null;
  for (const block of blocks) {
    const id = Number(block.id);
    if (Number.isInteger(id) && id >= MERCHANT_ACCOUNT_TAG_MIN && id <= MERCHANT_ACCOUNT_TAG_MAX) {
      const nested = parseEmvTlv(block.value);
      const guid = nested ? findBlock(nested, "00")?.value : null;
      if (isPhPaymentGuid(guid)) {
        hasPhGuid = true;
        method = detectMethod(guid, nested);
        break;
      }
    }
  }

  const isPh =
    country?.value?.toUpperCase() === PH_COUNTRY_CODE &&
    currency?.value === PHP_CURRENCY_CODE &&
    hasPhGuid;

  if (isPh) {
    return { valid: true, format: "qr-ph", method, reason: null };
  }

  // Generic EMVCo payment QR that passed CRC but is not recognizably QR Ph.
  // We still accept it as a payment QR, but flag the weaker guarantee so the
  // caller can surface an honest message rather than over-claiming "QR Ph".
  return {
    valid: true,
    format: "emvco",
    method: null,
    reason: "This looks like a valid payment QR but not a Philippine QR Ph code. Make sure it's your GCash, Maya, or PH bank QR.",
  };
}

/**
 * Best-effort method label from a QR Ph merchant-account GUID / nested fields.
 * Returns null when it can't be told apart (the UI should not over-claim).
 *
 * @param {string|null} guid
 * @param {Array<{id:string,value:string}>|null} nested
 * @returns {string|null}
 */
export function detectMethod(guid, nested) {
  const g = (guid ?? "").toLowerCase();
  if (g.includes("gcash")) return "GCash";
  if (g.includes("maya") || g.includes("paymaya")) return "Maya";
  // Scan nested values for a recognizable brand token as a fallback.
  const haystack = (nested ?? []).map((b) => b.value).join(" ").toLowerCase();
  if (haystack.includes("gcash")) return "GCash";
  if (haystack.includes("maya")) return "Maya";
  return null;
}
