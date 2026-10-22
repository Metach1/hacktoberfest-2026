import test from "node:test";
import assert from "node:assert/strict";

import {
  crc16ccitt,
  parseEmvTlv,
  validatePaymentQr,
  PHP_CURRENCY_CODE,
  PH_COUNTRY_CODE,
} from "../src/app/lib/payment-qr.mjs";

/** Build one EMVCo TLV block: 2-digit id + 2-digit length + value. */
function tlv(id, value) {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * Assemble a complete EMVCo payload from body blocks and append a correct CRC
 * (tag 63). The CRC is computed over the body plus the literal "6304" prefix,
 * exactly as a real QR Ph generator would.
 */
function withCrc(body) {
  const toCrc = `${body}6304`;
  return `${toCrc}${crc16ccitt(toCrc)}`;
}

/** A realistic, valid QR Ph (GCash) payload. */
function validQrPh({ amount = null, country = PH_COUNTRY_CODE, currency = PHP_CURRENCY_CODE, guid = "ph.ppmi.p2p" } = {}) {
  const merchantAccount = tlv("00", guid) + tlv("01", "09171234567");
  let body =
    tlv("00", "01") + // payload format indicator
    tlv("01", "11") + // static
    tlv("27", merchantAccount) + // merchant account info (QR Ph P2P template)
    tlv("52", "0000") + // merchant category code
    tlv("53", currency) +
    (amount != null ? tlv("54", amount) : "") +
    tlv("58", country) +
    tlv("59", "J SANTOS") +
    tlv("60", "MANILA");
  return withCrc(body);
}

test("crc16ccitt matches the EMVCo CCITT-FALSE reference vector", () => {
  // Classic check value for "123456789" under CRC-16/CCITT-FALSE is 0x29B1.
  assert.equal(crc16ccitt("123456789"), "29B1");
});

test("parseEmvTlv parses well-formed TLV and rejects malformed input", () => {
  const blocks = parseEmvTlv(tlv("00", "01") + tlv("58", "PH"));
  assert.deepEqual(blocks, [
    { id: "00", value: "01" },
    { id: "58", value: "PH" },
  ]);
  assert.equal(parseEmvTlv("00"), null, "too short");
  assert.equal(parseEmvTlv("0099X"), null, "length exceeds content");
  assert.equal(parseEmvTlv("not-emv-data"), null, "non-numeric tag/length");
  assert.equal(parseEmvTlv(""), null, "empty");
});

test("validatePaymentQr accepts a valid QR Ph (GCash) code", () => {
  const result = validatePaymentQr(validQrPh({ guid: "ph.ppmi.p2p.gcash" }));
  assert.equal(result.valid, true);
  assert.equal(result.format, "qr-ph");
  assert.equal(result.reason, null);
  assert.equal(result.method, "GCash");
});

test("validatePaymentQr accepts a valid QR Ph code with a transaction amount", () => {
  const result = validatePaymentQr(validQrPh({ amount: "500.00", guid: "ph.ppmi.p2m" }));
  assert.equal(result.valid, true);
  assert.equal(result.format, "qr-ph");
});

test("validatePaymentQr rejects a non-EMVCo string (e.g. a URL QR)", () => {
  const result = validatePaymentQr("https://example.com/pay/123");
  assert.equal(result.valid, false);
  assert.equal(result.format, null);
  assert.ok(/payment QR/i.test(result.reason));
});

test("validatePaymentQr rejects empty / unreadable input", () => {
  for (const bad of ["", "   ", null, undefined]) {
    const result = validatePaymentQr(bad);
    assert.equal(result.valid, false);
    assert.ok(result.reason && result.reason.length > 0);
  }
});

test("validatePaymentQr rejects a payload with a wrong CRC (edited/corrupted)", () => {
  const good = validQrPh();
  // Flip the last CRC digit to break the checksum.
  const tampered = good.slice(0, -1) + (good.slice(-1) === "0" ? "1" : "0");
  const result = validatePaymentQr(tampered);
  assert.equal(result.valid, false);
  assert.ok(/integrity|checksum/i.test(result.reason));
});

test("validatePaymentQr rejects a payload missing the payload format indicator", () => {
  // Body without tag 00.
  const body = tlv("58", "PH") + tlv("53", PHP_CURRENCY_CODE);
  const result = validatePaymentQr(withCrc(body));
  assert.equal(result.valid, false);
  assert.ok(/payload format|payment QR/i.test(result.reason));
});

test("validatePaymentQr rejects a payload missing the CRC tag", () => {
  const body = tlv("00", "01") + tlv("58", "PH");
  const result = validatePaymentQr(body); // no CRC appended
  assert.equal(result.valid, false);
  assert.ok(/checksum|incomplete|corrupt/i.test(result.reason));
});

test("validatePaymentQr accepts a CRC-valid but non-PH EMVCo QR with a caveat", () => {
  // Valid EMVCo structure & CRC, but country not PH and no PPMI GUID.
  const body =
    tlv("00", "01") +
    tlv("29", tlv("00", "com.example.wallet")) +
    tlv("53", "840") + // USD
    tlv("58", "US") +
    tlv("59", "ACME") +
    tlv("60", "NYC");
  const result = validatePaymentQr(withCrc(body));
  assert.equal(result.valid, true, "structurally valid EMVCo QR is accepted");
  assert.equal(result.format, "emvco", "but flagged as generic, not QR Ph");
  assert.ok(result.reason && /QR Ph/i.test(result.reason), "carries an honest caveat");
});

test("validatePaymentQr requires PH country AND PHP currency AND a PPMI GUID for qr-ph", () => {
  // Correct GUID + currency but wrong country -> downgraded to generic emvco.
  const wrongCountry = validatePaymentQr(validQrPh({ country: "US" }));
  assert.equal(wrongCountry.format, "emvco");
  // Correct GUID + country but wrong currency -> generic emvco.
  const wrongCurrency = validatePaymentQr(validQrPh({ currency: "840" }));
  assert.equal(wrongCurrency.format, "emvco");
});
