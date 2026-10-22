/**
 * Pure, dependency-free parser that extracts donation-field *suggestions* from
 * raw OCR text of an e-wallet / bank receipt. No DOM, no network, so it is
 * unit-testable by native `node --test`.
 *
 * IMPORTANT: these are only convenience suggestions to pre-fill the supporter
 * form. They are NOT payment verification. The supporter can edit everything,
 * and donations still require athlete confirmation (or the demo auto-confirm
 * timeout) before they count.
 *
 * All data is fictional; this never contacts a payment provider.
 */

/** Payment-method keywords we try to recognize, mapped to canonical labels. */
const METHOD_PATTERNS = [
  [/g[\s-]?cash/i, "GCash"],
  [/\bmaya\b|paymaya/i, "Maya"],
  [/grab\s?pay/i, "GrabPay"],
  [/\bbpi\b/i, "BPI"],
  [/\bbdo\b/i, "BDO"],
  [/landbank|land\s?bank/i, "LandBank"],
  [/metrobank|metro\s?bank/i, "Metrobank"],
  [/unionbank|union\s?bank/i, "UnionBank"],
  [/bank\s+transfer/i, "Bank transfer"],
];

/**
 * Parse an amount from OCR text. Looks for a peso-prefixed figure first
 * (₱ or "PHP"), falling back to any decimal-looking number. Thousands
 * separators are tolerated.
 *
 * @param {string} text
 * @returns {number|null}
 */
export function parseAmount(text) {
  if (!text) return null;
  const normalized = String(text).replace(/\u00a0/g, " ");

  // Prefer amounts near a peso marker: ₱, P, or PHP.
  const pesoMatch = normalized.match(
    /(?:₱|php|p)\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
  );
  const candidate = pesoMatch
    ? pesoMatch[1]
    : (normalized.match(/\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{2})\b/) || [])[1];

  if (!candidate) return null;
  const value = Number(candidate.replace(/[,\s]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Parse a reference / transaction number from OCR text. Looks for a labeled
 * reference first ("Ref No.", "Reference", "Transaction ID"), falling back to a
 * long-ish alphanumeric token that looks like a reference code.
 *
 * @param {string} text
 * @returns {string|null}
 */
export function parseReference(text) {
  if (!text) return null;
  const normalized = String(text).replace(/\u00a0/g, " ");

  const labeled = normalized.match(
    /(?:ref(?:erence)?(?:\s*(?:no\.?|number|#))?|transaction(?:\s*(?:id|no\.?|number))?)\s*[:#.]?\s*([A-Z0-9][A-Z0-9\- ]{4,})/i,
  );
  if (labeled) {
    const cleaned = labeled[1].replace(/\s+/g, "").replace(/[^A-Z0-9-]/gi, "");
    if (cleaned.length >= 6) return cleaned;
  }

  // Fallback: a standalone token of 8+ chars that contains at least one digit.
  const tokens = normalized.split(/\s+/);
  for (const raw of tokens) {
    const token = raw.replace(/[^A-Z0-9-]/gi, "");
    if (token.length >= 8 && /[0-9]/.test(token) && /^[A-Z0-9-]+$/i.test(token)) {
      return token;
    }
  }
  return null;
}

/**
 * Parse a payment method from OCR text, if recognizable.
 *
 * @param {string} text
 * @returns {string|null}
 */
export function parseMethod(text) {
  if (!text) return null;
  for (const [pattern, label] of METHOD_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

/**
 * Extract all donation-field suggestions from OCR text.
 *
 * @param {string} text
 * @returns {{ amount: number|null, reference: string|null, method: string|null }}
 */
export function parseReceiptText(text) {
  return {
    amount: parseAmount(text),
    reference: parseReference(text),
    method: parseMethod(text),
  };
}
