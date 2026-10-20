"use client";

import { useState } from "react";
import { Icon, peso } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";

/**
 * Global simulated-donation modal. It reads its target athlete from the shared
 * store, so it survives route navigation and can be opened from any screen.
 * No real payment is processed.
 */
export function DonationModal() {
  const { donationTarget, closeDonation, completeDonation } = useStarlete();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState("GCash");
  const [reference, setReference] = useState("");

  if (!donationTarget) return null;
  const athlete = donationTarget;
  const actual = custom ? Number(custom) : amount;

  const close = () => {
    closeDonation();
    // Reset for the next time the modal opens.
    setStep(1);
    setAmount(1000);
    setCustom("");
    setMethod("GCash");
    setReference("");
  };

  const confirm = () => {
    setStep(4);
    setReference(`STL-${Date.now().toString().slice(-6)}`);
    setTimeout(() => {
      setStep(5);
      completeDonation(athlete.id, actual);
    }, 1500);
  };

  return <div className="modal-backdrop"><div className="modal donation-modal">
    {step < 4 && <button className="modal-close" onClick={close}><Icon name="close" /></button>}
    {step < 4 && <div className="checkout-head"><span className="eyebrow">Simulated support</span><h2>Back {athlete.name}</h2><div className="stepper"><span className={step >= 1 ? "done" : ""}>1</span><i /><span className={step >= 2 ? "done" : ""}>2</span><i /><span className={step >= 3 ? "done" : ""}>3</span></div></div>}
    {step === 1 && <div className="donation-step"><img className="checkout-athlete" src={athlete.image} alt="" /><h3>Choose your support</h3><p>Every amount helps fund training, travel, and competition costs.</p><div className="amount-grid">{[500, 1000, 2500, 5000].map(a => <button className={!custom && amount === a ? "selected" : ""} onClick={() => { setAmount(a); setCustom(""); }} key={a}>{peso(a)}</button>)}</div><label>Or enter a custom amount<div className="money-input"><span>₱</span><input type="number" min="50" value={custom} onChange={e => setCustom(e.target.value)} placeholder="Other amount" /></div></label><button className="button full gold" disabled={!actual || actual < 50} onClick={() => setStep(2)}>Continue with {peso(actual || 0)} <Icon name="arrow" /></button></div>}
    {step === 2 && <div className="donation-step"><button className="back-button" onClick={() => setStep(1)}><Icon name="back" /> Amount</button><h3>Select payment method</h3><p>This is a demo checkout. No payment details are sent or charged.</p><div className="payment-list">{["GCash", "Maya", "Credit / debit card", "Bank transfer"].map((m, i) => <button className={method === m ? "selected" : ""} onClick={() => setMethod(m)} key={m}><span className={`pay-icon p${i}`}>{m.slice(0, 1)}</span><b>{m}</b><span className="radio" /></button>)}</div><button className="button full" onClick={() => setStep(3)}>Review support <Icon name="arrow" /></button></div>}
    {step === 3 && <div className="donation-step"><button className="back-button" onClick={() => setStep(2)}><Icon name="back" /> Payment</button><h3>Review your support</h3><div className="review-athlete"><img src={athlete.image} alt="" /><div><small>You&rsquo;re supporting</small><strong>{athlete.name}</strong><span>{athlete.sport}</span></div></div><div className="review-rows"><span><small>Support amount</small><b>{peso(actual)}</b></span><span><small>Payment method</small><b>{method}</b></span><span><small>Platform fee</small><b>₱0</b></span><span className="total"><strong>Total</strong><strong>{peso(actual)}</strong></span></div><p className="safe-note"><Icon name="shield" /> This is a simulated payment. No real money will be transferred.</p><button className="button full gold" onClick={confirm}>Confirm support <Icon name="heart" /></button></div>}
    {step === 4 && <div className="processing"><span className="loader" /><h2>Processing your support</h2><p>Simulating a secure connection with {method}…</p></div>}
    {step === 5 && <div className="success"><span className="success-icon"><Icon name="check" size={34} /></span><span className="eyebrow">Support confirmed</span><h2>You just moved a dream forward.</h2><p>Your {peso(actual)} support for <strong>{athlete.name}</strong> has been added to their journey.</p><div className="receipt"><span><small>Reference</small><b>{reference}</b></span><span><small>Method</small><b>{method}</b></span></div><button className="button full" onClick={close}>Return to athlete profile</button></div>}
  </div></div>;
}
