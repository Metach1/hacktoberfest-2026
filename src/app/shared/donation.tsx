"use client";

import { useMemo, useRef, useState } from "react";
import { Icon, peso } from "@/src/app/shared/ui";
import { useStarlete, type QrCode } from "@/src/app/store";
import { recognizeReceipt } from "@/src/app/lib/ocr";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Validate an uploaded receipt file. Returns an error message or null. */
function validateReceipt(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Please upload a PNG, JPG, or WebP image of your receipt.";
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return "That file is too large. Please upload an image under 5 MB.";
  }
  return null;
}

/**
 * Global QR-based donation modal. The supporter picks an amount, scans the
 * athlete's published QR with their own wallet app, pays outside the demo, then
 * uploads the receipt. Tesseract.js OCR suggests the amount / reference /
 * method, which the supporter can edit or enter manually. A review step
 * precedes submission; the donation is recorded as PENDING until the athlete
 * confirms (or the demo auto-confirm timeout elapses).
 *
 * No real payment is processed and OCR is not payment verification.
 */
export function DonationModal() {
  const { donationTarget, closeDonation, submitDonation, getQrCodes } = useStarlete();

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [supporterName, setSupporterName] = useState("");
  const [note, setNote] = useState("");

  const [receiptName, setReceiptName] = useState("");
  const [receiptPreview, setReceiptPreview] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [ocrState, setOcrState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [suggested, setSuggested] = useState<{
    amount: number | null;
    reference: string | null;
    method: string | null;
  } | null>(null);

  const [submittedRef, setSubmittedRef] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const athlete = donationTarget;
  const qrCodes = useMemo<QrCode[]>(
    () => (athlete ? getQrCodes(athlete.id) : []),
    [athlete, getQrCodes],
  );
  const actual = custom ? Number(custom) : amount;
  const activeQr = qrCodes.find((q) => q.method === method) ?? qrCodes[0];

  if (!athlete) return null;

  const reset = () => {
    setStep(1);
    setAmount(1000);
    setCustom("");
    setMethod("");
    setReference("");
    setSupporterName("");
    setNote("");
    setReceiptName("");
    setReceiptPreview("");
    setUploadError("");
    setOcrState("idle");
    setOcrProgress(0);
    setSuggested(null);
    setSubmittedRef("");
  };

  const close = () => {
    closeDonation();
    reset();
  };

  const goToQr = () => {
    // Default the method to the first available QR code, if any.
    if (!method && qrCodes[0]) setMethod(qrCodes[0].method);
    setStep(2);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    const error = validateReceipt(file);
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError("");
    setReceiptName(file.name);

    // Build a local preview (data URL) without any upload.
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);

    // Run OCR best-effort; never block manual entry.
    setOcrState("running");
    setOcrProgress(0);
    const result = await recognizeReceipt(file, (p) => setOcrProgress(p));
    const hasAny = result.amount != null || result.reference != null || result.method != null;
    setSuggested({ amount: result.amount, reference: result.reference, method: result.method });
    setOcrState(hasAny ? "done" : "failed");

    // Pre-fill empty fields from suggestions; never overwrite user edits.
    if (result.amount != null && !custom) setCustom(String(result.amount));
    if (result.reference != null && !reference) setReference(result.reference);
    if (result.method != null) {
      // Only adopt a suggested method the athlete actually publishes.
      const match = qrCodes.find((q) => q.method.toLowerCase() === result.method!.toLowerCase());
      if (match && !method) setMethod(match.method);
    }
  };

  const applySuggestion = (field: "amount" | "reference" | "method") => {
    if (!suggested) return;
    if (field === "amount" && suggested.amount != null) setCustom(String(suggested.amount));
    if (field === "reference" && suggested.reference != null) setReference(suggested.reference);
    if (field === "method" && suggested.method != null) {
      const match = qrCodes.find((q) => q.method.toLowerCase() === suggested.method!.toLowerCase());
      if (match) setMethod(match.method);
    }
  };

  const canReview = Boolean(receiptName) && actual >= 50 && reference.trim().length > 0 && method;

  const submit = () => {
    const donation = submitDonation({
      athleteId: athlete.id,
      amount: actual,
      method,
      reference: reference.trim(),
      supporterName,
      receiptName,
      receiptPreview,
      note: note.trim(),
    });
    setSubmittedRef(donation.reference);
    setStep(5);
  };

  const hasQr = qrCodes.length > 0;

  return (
    <div className="modal-backdrop">
      <div className="modal donation-modal">
        {step < 5 && (
          <button className="modal-close" onClick={close} aria-label="Close">
            <Icon name="close" />
          </button>
        )}

        {step < 5 && (
          <div className="checkout-head">
            <span className="eyebrow">QR donation · demo</span>
            <h2>Back {athlete.name}</h2>
            <div className="stepper">
              <span className={step >= 1 ? "done" : ""}>1</span><i />
              <span className={step >= 2 ? "done" : ""}>2</span><i />
              <span className={step >= 3 ? "done" : ""}>3</span><i />
              <span className={step >= 4 ? "done" : ""}>4</span>
            </div>
          </div>
        )}

        {/* Step 1 — choose amount */}
        {step === 1 && (
          <div className="donation-step">
            <img className="checkout-athlete" src={athlete.image} alt="" />
            <h3>Choose your support</h3>
            <p>Every amount helps fund training, travel, and competition costs.</p>
            <div className="amount-grid">
              {[500, 1000, 2500, 5000].map((a) => (
                <button
                  className={!custom && amount === a ? "selected" : ""}
                  onClick={() => { setAmount(a); setCustom(""); }}
                  key={a}
                >
                  {peso(a)}
                </button>
              ))}
            </div>
            <label>
              Or enter a custom amount
              <div className="money-input">
                <span>₱</span>
                <input
                  type="number"
                  min="50"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Other amount"
                />
              </div>
            </label>
            <button
              className="button full gold"
              disabled={!actual || actual < 50}
              onClick={goToQr}
            >
              Continue with {peso(actual || 0)} <Icon name="arrow" />
            </button>
          </div>
        )}

        {/* Step 2 — show QR to scan & pay */}
        {step === 2 && (
          <div className="donation-step">
            <button className="back-button" onClick={() => setStep(1)}><Icon name="back" /> Amount</button>
            <h3>Scan &amp; pay {peso(actual)}</h3>
            {hasQr ? (
              <>
                <p>Open your wallet app, scan this code, and send your support directly to the athlete.</p>
                <div className="qr-method-tabs">
                  {qrCodes.map((q) => (
                    <button
                      key={q.id}
                      className={activeQr?.id === q.id ? "selected" : ""}
                      onClick={() => setMethod(q.method)}
                    >
                      {q.method}
                    </button>
                  ))}
                </div>
                {activeQr && (
                  <div className="qr-display">
                    <img src={activeQr.image} alt={`${activeQr.method} QR code`} width={160} height={160} />
                    <div className="qr-meta">
                      <strong>{activeQr.method}</strong>
                      <small>{activeQr.label}</small>
                    </div>
                  </div>
                )}
                <p className="safe-note">
                  <Icon name="shield" /> Demo only. This QR is not scannable and no real payment is processed.
                </p>
                <button className="button full" onClick={() => setStep(3)}>
                  I&rsquo;ve paid — upload receipt <Icon name="arrow" />
                </button>
              </>
            ) : (
              <div className="empty-note">
                <p><strong>{athlete.name}</strong> hasn&rsquo;t published a payment QR code yet.</p>
                <p>Please check back later once the athlete adds a GCash, Maya, or bank QR.</p>
                <button className="button full secondary" onClick={close}>Close</button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — upload receipt + OCR + editable fields */}
        {step === 3 && (
          <div className="donation-step">
            <button className="back-button" onClick={() => setStep(2)}><Icon name="back" /> QR code</button>
            <h3>Upload your receipt</h3>
            <p>We&rsquo;ll read it to suggest your details. You can edit everything below.</p>

            <div className="receipt-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={(e) => onUpload(e.target.files?.[0])}
                hidden
              />
              {receiptPreview ? (
                <div className="receipt-preview">
                  <img src={receiptPreview} alt="Receipt preview" />
                  <div>
                    <strong>{receiptName}</strong>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace image
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="receipt-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="plus" size={22} />
                  <strong>Upload receipt image</strong>
                  <small>PNG, JPG, or WebP · up to 5 MB</small>
                </button>
              )}
              {uploadError && <p className="form-error">{uploadError}</p>}
            </div>

            {ocrState === "running" && (
              <div className="ocr-status">
                <span className="loader small" />
                <span>Reading receipt… {Math.round(ocrProgress * 100)}%</span>
              </div>
            )}
            {ocrState === "done" && (
              <div className="ocr-status ok">
                <Icon name="spark" size={16} />
                <span>Suggestions ready — review and edit below. OCR is not payment verification.</span>
              </div>
            )}
            {ocrState === "failed" && (
              <div className="ocr-status warn">
                <span>Couldn&rsquo;t read the receipt automatically. Please enter the details manually.</span>
              </div>
            )}

            <label>
              Payment method
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="" disabled>Select the method you used</option>
                {qrCodes.map((q) => (
                  <option key={q.id} value={q.method}>{q.method}</option>
                ))}
              </select>
              {suggested?.method && method !== suggested.method && (
                <button type="button" className="suggestion-chip" onClick={() => applySuggestion("method")}>
                  Use “{suggested.method}”
                </button>
              )}
            </label>

            <label>
              Amount paid
              <div className="money-input">
                <span>₱</span>
                <input
                  type="number"
                  min="50"
                  value={custom || amount}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </div>
              {suggested?.amount != null && suggested.amount !== actual && (
                <button type="button" className="suggestion-chip" onClick={() => applySuggestion("amount")}>
                  Use {peso(suggested.amount)}
                </button>
              )}
            </label>

            <label>
              Reference / transaction number
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. 1234 5678 9012"
              />
              {suggested?.reference && reference !== suggested.reference && (
                <button type="button" className="suggestion-chip" onClick={() => applySuggestion("reference")}>
                  Use “{suggested.reference}”
                </button>
              )}
            </label>

            <label>
              Your name (optional)
              <input
                value={supporterName}
                onChange={(e) => setSupporterName(e.target.value)}
                placeholder="Shown to the athlete, or leave blank for Anonymous"
              />
            </label>

            <label>
              Note to the athlete (optional)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cheer them on!" />
            </label>

            <button className="button full" disabled={!canReview} onClick={() => setStep(4)}>
              Review support <Icon name="arrow" />
            </button>
            {!canReview && (
              <p className="field-hint">Upload a receipt and fill in method, amount (≥ ₱50), and reference to continue.</p>
            )}
          </div>
        )}

        {/* Step 4 — review before submit */}
        {step === 4 && (
          <div className="donation-step">
            <button className="back-button" onClick={() => setStep(3)}><Icon name="back" /> Details</button>
            <h3>Review your support</h3>
            <div className="review-athlete">
              <img src={athlete.image} alt="" />
              <div>
                <small>You&rsquo;re supporting</small>
                <strong>{athlete.name}</strong>
                <span>{athlete.sport}</span>
              </div>
            </div>
            <div className="review-rows">
              <span><small>Amount</small><b>{peso(actual)}</b></span>
              <span><small>Method</small><b>{method}</b></span>
              <span><small>Reference</small><b>{reference}</b></span>
              <span><small>From</small><b>{supporterName.trim() || "Anonymous supporter"}</b></span>
              {receiptName && <span><small>Receipt</small><b>{receiptName}</b></span>}
            </div>
            {receiptPreview && (
              <div className="review-receipt">
                <img src={receiptPreview} alt="Receipt" />
              </div>
            )}
            <p className="safe-note">
              <Icon name="shield" /> Submitted as <strong>pending</strong> until {athlete.name.split(" ")[0]} confirms
              receipt. Auto-confirms after 3 days (demo timeout — not bank verification).
            </p>
            <button className="button full gold" onClick={submit}>
              Submit for confirmation <Icon name="heart" />
            </button>
          </div>
        )}

        {/* Step 5 — pending confirmation */}
        {step === 5 && (
          <div className="success">
            <span className="success-icon pending"><Icon name="check" size={34} /></span>
            <span className="eyebrow">Pending confirmation</span>
            <h2>Thanks — your support is on its way.</h2>
            <p>
              Your {peso(actual)} to <strong>{athlete.name}</strong> is recorded as <strong>pending</strong>.
              It will count once the athlete confirms receipt, or automatically after 3 days
              (a demo timeout — not bank verification).
            </p>
            <div className="receipt">
              <span><small>Reference</small><b>{reference}</b></span>
              <span><small>Method</small><b>{method}</b></span>
              <span><small>Tracking id</small><b>{submittedRef}</b></span>
            </div>
            <button className="button full" onClick={close}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
