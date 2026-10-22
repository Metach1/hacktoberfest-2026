"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, peso } from "@/src/app/shared/ui";
import { useStarlete, type QrCode } from "@/src/app/store";
import { recognizeReceipt } from "@/src/app/lib/ocr";
import {
  canReviewDonation,
  parseClaimedAmount,
} from "@/src/app/lib/donations.mjs";
import { classifyReceipt, RECEIPT_DECISION } from "@/src/app/lib/receipt-filter.mjs";
import { moderateImage } from "@/src/app/lib/moderation";

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
 * Global QR-based donation modal. The supporter scans the athlete's published
 * QR with their own wallet app, pays outside the demo, then uploads the receipt
 * and enters the amount they paid (there is no redundant up-front amount
 * prompt). Tesseract.js OCR suggests the amount / reference / method, which the
 * supporter can edit or enter manually. A review step, plus an explicit
 * amount-confirmation safeguard against typos, precede submission; the donation
 * is recorded as PENDING until the athlete confirms (or the demo auto-confirm
 * timeout elapses).
 *
 * Uploaded receipts are filtered locally before they can be stored or shown to
 * the athlete: an optional on-device explicit-image model can reject confidently
 * explicit images, and an OCR receipt-text signal decides accept vs. uncertain.
 * Uncertain uploads are kept private from the athlete (submitted as metadata
 * only) until a clearer receipt is provided; rejected images are never stored.
 *
 * No real payment is processed. Neither OCR, moderation, nor the amount
 * confirmation is payment verification — the confirmation only guards against
 * accidental typos, and the filters never prove a payment is genuine.
 */
export function DonationModal() {
  const { donationTarget, donationPrefill, closeDonation, submitDonation, resubmitDonation, getQrCodes } =
    useStarlete();
  // True when the modal is retrying a previously rejected donation in place.
  const isResubmission = donationPrefill != null;

  const [step, setStep] = useState(1);
  // Single source of truth for the claimed amount. The supporter enters it
  // after paying (on the receipt step); there is no redundant up-front prompt.
  const [custom, setCustom] = useState("");
  // Which published QR account is selected, by its UNIQUE id. Selection is
  // tracked by id (not provider name) so an athlete with two QRs for the same
  // app — e.g. GCash, Maya, GCash — can select the correct one; the recorded
  // donation method remains the provider name (see `method` below).
  const [selectedQrId, setSelectedQrId] = useState("");
  const [reference, setReference] = useState("");
  const [supporterName, setSupporterName] = useState("");
  const [note, setNote] = useState("");
  // Amount-confirmation safeguard shown before the final submit.
  const [confirmingAmount, setConfirmingAmount] = useState(false);
  const [showFullQr, setShowFullQr] = useState(false);

  const [receiptName, setReceiptName] = useState("");
  const [receiptPreview, setReceiptPreview] = useState("");
  const [uploadError, setUploadError] = useState("");
  // Receipt-filter decision for the current upload. `accepted` images are shown
  // to the athlete; `uncertain` images are kept private (not attached to the
  // athlete-visible record); `rejected` images are never stored.
  const [filterState, setFilterState] = useState<"idle" | "checking" | "accepted" | "uncertain" | "rejected">("idle");
  const [filterMessage, setFilterMessage] = useState("");
  const [ocrState, setOcrState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [suggested, setSuggested] = useState<{
    amount: number | null;
    reference: string | null;
    method: string | null;
  } | null>(null);

  const [submittedRef, setSubmittedRef] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!showFullQr) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowFullQr(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showFullQr]);

  const athlete = donationTarget;
  const qrCodes = useMemo<QrCode[]>(
    () => (athlete ? getQrCodes(athlete.id) : []),
    [athlete, getQrCodes],
  );

  // Prefill the flow from a rejected donation being retried. Seeding is keyed
  // on the record id so it runs once per opened resubmission (and is cleared
  // for a brand-new donation). The supporter can still edit every field and
  // attach a replacement receipt before resubmitting.
  const prefillId = donationPrefill?.id ?? null;
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!donationPrefill) return;
    setCustom(donationPrefill.amount ? String(donationPrefill.amount) : "");
    // Select a published QR matching the stored provider name (first match is
    // fine — the recorded method is the provider name, not a specific account).
    const prefillQr = donationPrefill.method
      ? qrCodes.find((q) => q.method === donationPrefill.method)
      : undefined;
    setSelectedQrId(prefillQr?.id ?? "");
    setReference(donationPrefill.reference ?? "");
    // Don't surface the stored "Anonymous supporter" sentinel as an editable
    // name; leave it blank so it stays anonymous unless the supporter types one.
    setSupporterName(
      donationPrefill.supporterName && donationPrefill.supporterName !== "Anonymous supporter"
        ? donationPrefill.supporterName
        : "",
    );
    setNote(donationPrefill.note ?? "");
    setReceiptName(donationPrefill.receiptName ?? "");
    setReceiptPreview(donationPrefill.receiptPreview ?? "");
    // A previously stored receipt is treated as already-accepted; the supporter
    // may still replace it, which re-runs validation/OCR via onUpload.
    setFilterState(donationPrefill.receiptPreview ? "accepted" : "idle");
    setFilterMessage("");
    setOcrState("idle");
    setSuggested(null);
    // Start the supporter on the upload/details step with their details loaded.
    setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const actual = parseClaimedAmount(custom);
  // Resolve the active QR by its unique id; fall back to the first published QR
  // when nothing is selected yet. The provider name recorded on the donation is
  // derived from the active QR (e.g. "GCash"), never from a bare name match.
  const activeQr = qrCodes.find((q) => q.id === selectedQrId) ?? qrCodes[0];
  const method = activeQr?.method ?? "";

  if (!athlete) return null;

  const reset = () => {
    setStep(1);
    setCustom("");
    setSelectedQrId("");
    setReference("");
    setSupporterName("");
    setNote("");
    setConfirmingAmount(false);
    setReceiptName("");
    setReceiptPreview("");
    setUploadError("");
    setFilterState("idle");
    setFilterMessage("");
    setOcrState("idle");
    setOcrProgress(0);
    setSuggested(null);
    setSubmittedRef("");
  };

  const close = () => {
    closeDonation();
    reset();
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
    // Clear any previous decision/preview while we re-check this upload.
    setReceiptPreview("");
    setFilterState("checking");
    setFilterMessage("");

    // Run OCR (receipt-text signal) and local moderation (explicit-image
    // signal) best-effort, in parallel. Neither blocks manual field entry and
    // neither is treated as proof of payment.
    setOcrState("running");
    setOcrProgress(0);
    const [result, moderation] = await Promise.all([
      recognizeReceipt(file, (p) => setOcrProgress(p)),
      moderateImage(file),
    ]);
    const hasAny = result.amount != null || result.reference != null || result.method != null;
    setSuggested({ amount: result.amount, reference: result.reference, method: result.method });
    setOcrState(hasAny ? "done" : "failed");

    // Layered decision: explicit -> reject; receipt signal -> accept;
    // otherwise -> uncertain (kept private from the athlete).
    const decision = classifyReceipt({
      ocr: { amount: result.amount, reference: result.reference, method: result.method, rawText: result.rawText },
      moderation,
    });

    if (decision.decision === RECEIPT_DECISION.REJECT) {
      // Never store or preview a rejected image; drop the file reference and
      // do not retain its bytes.
      setFilterState("rejected");
      setFilterMessage(decision.reason);
      setReceiptName("");
      setReceiptPreview("");
      return;
    }

    // Accepted or uncertain: build a local preview (data URL) for the
    // supporter. For `uncertain` the preview stays local to the supporter and
    // is NOT attached to the athlete-visible submission (handled at submit).
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
    setFilterState(decision.decision === RECEIPT_DECISION.ACCEPT ? "accepted" : "uncertain");
    setFilterMessage(decision.reason);

    // Pre-fill empty fields from suggestions; never overwrite user edits.
    if (result.amount != null && !custom) setCustom(String(result.amount));
    if (result.reference != null && !reference) setReference(result.reference);
    if (result.method != null) {
      // Only adopt a suggested method the athlete actually publishes. Select by
      // id; don't override an account the supporter already picked.
      const match = qrCodes.find((q) => q.method.toLowerCase() === result.method!.toLowerCase());
      if (match && !selectedQrId) setSelectedQrId(match.id);
    }
  };

  const applySuggestion = (field: "amount" | "reference" | "method") => {
    if (!suggested) return;
    if (field === "amount" && suggested.amount != null) setCustom(String(suggested.amount));
    if (field === "reference" && suggested.reference != null) setReference(suggested.reference);
    if (field === "method" && suggested.method != null) {
      const match = qrCodes.find((q) => q.method.toLowerCase() === suggested.method!.toLowerCase());
      if (match) setSelectedQrId(match.id);
    }
  };

  // An uncertain or rejected image must not be treated as a usable receipt.
  // Rejected clears receiptName already; uncertain keeps the supporter's local
  // preview but is withheld from the athlete-visible record at submit time.
  const canReview =
    filterState !== "checking" &&
    filterState !== "rejected" &&
    canReviewDonation({ receiptName, amount: actual, reference, method });

  const submit = () => {
    // Keep uncertain receipts private from the athlete: submit without the
    // image (metadata only) so it isn't shown until retried/reviewed. Rejected
    // images never reach here (receiptName is cleared).
    const keepPrivate = filterState === "uncertain";
    const patch = {
      amount: actual,
      method,
      reference: reference.trim(),
      supporterName,
      receiptName: keepPrivate ? "" : receiptName,
      receiptPreview: keepPrivate ? "" : receiptPreview,
      note: note.trim(),
    };
    // Resolve the resubmission target up front from the prefill id. This is the
    // single source of truth for "is this a retry": if a prefill id is present
    // we ALWAYS update that record in place and NEVER create a new donation, so
    // a retry can never duplicate the original.
    const resubmitId = prefillId;
    if (resubmitId) {
      // Retry the SAME rejected record in place: preserve id/athlete/supporter,
      // return it to pending, clear stale metadata, restart auto-confirm timing.
      resubmitDonation(resubmitId, patch);
      setSubmittedRef(patch.reference);
    } else {
      const donation = submitDonation({ athleteId: athlete.id, ...patch });
      setSubmittedRef(donation.reference);
    }
    setConfirmingAmount(false);
    setStep(4);
  };

  const hasQr = qrCodes.length > 0;

  return (
    <>
    <div className="modal-backdrop">
      <div className="modal donation-modal">
        {step < 4 && (
          <button className="modal-close" onClick={close} aria-label="Close">
            <Icon name="close" />
          </button>
        )}

        {step < 4 && (
          <div className="checkout-head">
            <span className="eyebrow">{isResubmission ? "Resubmit donation · demo" : "QR donation · demo"}</span>
            <h2>Back {athlete.name}</h2>
            <div className="stepper">
              <span className={step >= 1 ? "done" : ""}>1</span><i />
              <span className={step >= 2 ? "done" : ""}>2</span><i />
              <span className={step >= 3 ? "done" : ""}>3</span>
            </div>
          </div>
        )}

        {/* Step 1 — show QR to scan & pay (amount is entered after paying) */}
        {step === 1 && (
          <div className="donation-step">
            <img className="checkout-athlete" src={athlete.image} alt="" />
            <h3>Scan &amp; pay {athlete.name.split(" ")[0]}</h3>
            {hasQr ? (
              <>
                <p>Open your wallet app, scan this code, and send your support directly to the athlete. You&rsquo;ll enter the amount you paid on the next step.</p>
                <div className="qr-method-tabs">
                  {qrCodes.map((q) => {
                    // Disambiguate duplicate providers (e.g. two GCash accounts)
                    // by appending the account label to the tab.
                    const dupe = qrCodes.filter((o) => o.method === q.method).length > 1;
                    return (
                      <button
                        key={q.id}
                        className={activeQr?.id === q.id ? "selected" : ""}
                        onClick={() => setSelectedQrId(q.id)}
                      >
                        {dupe && q.label ? `${q.method} · ${q.label}` : q.method}
                      </button>
                    );
                  })}
                </div>
                {activeQr && (
                  <div className="qr-display">
                    <img src={activeQr.image} alt={`${activeQr.method} QR code`} width={160} height={160} />
                    <div className="qr-meta">
                      <strong>{activeQr.method}</strong>
                      <small>{activeQr.label}</small>
                    </div>
                    <button className="text-button" onClick={() => setShowFullQr(true)}>
                      View in full
                    </button>
                  </div>
                )}
                <p className="safe-note">
                  <Icon name="shield" /> Demo only. This QR is not scannable and no real payment is processed.
                </p>
                <button
                  className="button full"
                  onClick={() => {
                    // Default to the first published QR if none picked yet.
                    if (!selectedQrId && qrCodes[0]) setSelectedQrId(qrCodes[0].id);
                    setStep(2);
                  }}
                >
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

        {/* Step 2 — upload receipt + OCR + editable fields */}
        {step === 2 && (
          <div className="donation-step">
            <button className="back-button" onClick={() => setStep(1)}><Icon name="back" /> QR code</button>
            <h3>{isResubmission ? "Edit & resubmit your donation" : "Upload your receipt"}</h3>
            {isResubmission ? (
              <p className="field-hint warn">
                <Icon name="shield" size={14} /> This updates your rejected donation and sends it back for review — it stays the same submission, not a new one. Edit the details or attach a clearer receipt below.
              </p>
            ) : (
              <p>We&rsquo;ll read it to suggest your details. You can edit everything below.</p>
            )}

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
              {filterState === "rejected" && <p className="form-error">{filterMessage}</p>}
              {filterState === "uncertain" && (
                <p className="field-hint warn">
                  <Icon name="shield" size={14} /> {filterMessage} It won&rsquo;t be shown to the athlete until it&rsquo;s a clearer receipt.
                </p>
              )}
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
              {/* Valued by unique QR id so duplicate providers (e.g. two GCash
                  accounts) stay distinct; the donation still records q.method. */}
              <select value={selectedQrId} onChange={(e) => setSelectedQrId(e.target.value)}>
                <option value="" disabled>Select the method you used</option>
                {qrCodes.map((q) => {
                  const dupe = qrCodes.filter((o) => o.method === q.method).length > 1;
                  return (
                    <option key={q.id} value={q.id}>
                      {dupe && q.label ? `${q.method} · ${q.label}` : q.method}
                    </option>
                  );
                })}
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
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Enter the amount you paid"
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

            <button className="button full" disabled={!canReview} onClick={() => setStep(3)}>
              Review support <Icon name="arrow" />
            </button>
            {!canReview && (
              <p className="field-hint">Upload a receipt and fill in method, amount (≥ ₱50), and reference to continue.</p>
            )}
          </div>
        )}

        {/* Step 3 — review before submit */}
        {step === 3 && (
          <div className="donation-step">
            <button className="back-button" onClick={() => setStep(2)}><Icon name="back" /> Details</button>
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
            <button className="button full gold" onClick={() => setConfirmingAmount(true)}>
              Submit for confirmation <Icon name="heart" />
            </button>

            {/* Amount-confirmation safeguard: guards against accidental typos.
                It is NOT proof of payment — the demo cannot verify transactions. */}
            {confirmingAmount && (
              <div className="modal-backdrop" onClick={() => setConfirmingAmount(false)}>
                <div className="modal small-modal confirm-amount" onClick={(e) => e.stopPropagation()}>
                  <span className="eyebrow">Check the amount</span>
                  <h2>Did you pay {peso(actual)}?</h2>
                  <p>
                    Please confirm the amount you actually sent to {athlete.name.split(" ")[0]} is{" "}
                    <strong>{peso(actual)}</strong>. This is a safeguard against typos — it does not
                    verify your payment.
                  </p>
                  <div className="form-actions">
                    <button className="button secondary" onClick={() => { setConfirmingAmount(false); setStep(2); }}>
                      Edit amount
                    </button>
                    <button className="button gold" onClick={submit}>
                      Yes, {peso(actual)} is correct
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4 — pending confirmation */}
        {step === 4 && (
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
    {showFullQr && activeQr && createPortal(
      <div className="qr-fullscreen-backdrop" onClick={() => setShowFullQr(false)}>
        <div
          className="qr-fullscreen-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeQr.method} QR code`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="modal-close"
            aria-label="Close full-size QR code"
            onClick={() => setShowFullQr(false)}
          >
            <Icon name="close" />
          </button>
          <span className="eyebrow">{activeQr.method}</span>
          <img src={activeQr.image} alt={`${activeQr.method} QR code`} />
          <strong>{activeQr.label}</strong>
        </div>
      </div>,
      document.body,
    )}
    </>
  );
}
