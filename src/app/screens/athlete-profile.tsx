"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { notFound } from "next/navigation";
import { ErrorState, useAsync } from "@/src/app/shared/async-state";
import { Icon, Progress, peso } from "@/src/app/shared/ui";
import { useSession } from "@/src/app/shared/session-provider";
import { getFeed, type FeedPost } from "@/src/app/services/feed";
import {
  getPublicAthlete,
  getPublicAthleteQrCodes,
  type PublicAthlete,
} from "@/src/app/services/public-athletes";
import { reportDirectDonation } from "@/src/app/services/donations";
import type { QrCodeRow } from "@/src/app/services/qr";

export function AthleteProfileScreen({ id }: { id: string }) {
  const { role, user } = useSession();
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAmount, setReportAmount] = useState("");
  const [reportMethod, setReportMethod] = useState("");
  const [reportReference, setReportReference] = useState("");
  const [reportName, setReportName] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSentFor, setReportSentFor] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const {
    data: athlete,
    loading,
    error,
    reload,
  } = useAsync<PublicAthlete | null>(() => getPublicAthlete(id), [id]);
  const { data: qrCodes, loading: qrLoading, error: qrError, reload: reloadQr } =
    useAsync<QrCodeRow[]>(() => getPublicAthleteQrCodes(id), [id]);
  const { data: posts, loading: postsLoading } = useAsync<FeedPost[]>(
    () => getFeed().then((feed) => feed.filter((post) => post.ownerId === id)),
    [id],
  );

  if (loading) {
    return <main className="page-shell"><div className="empty"><h3>Loading athlete profile…</h3></div></main>;
  }
  if (error) {
    return <main className="page-shell"><ErrorState message={error} onRetry={reload} /></main>;
  }
  if (!athlete) notFound();

  const percent = athlete.goal > 0 ? Math.round((athlete.raised / athlete.goal) * 100) : 0;

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReporting(true);
    setReportError("");
    try {
      await reportDirectDonation({
        athleteOwnerId: athlete.id,
        amount: Number(reportAmount),
        method: reportMethod,
        reference: reportReference,
        supporterName: reportName,
        note: reportNote,
      });
      setReportSentFor(athlete.id);
      setReportOpen(false);
      setReportAmount("");
      setReportReference("");
      setReportNote("");
    } catch (submitError) {
      setReportError(submitError instanceof Error ? submitError.message : "Couldn't report the transfer.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <main className="profile-page">
      <Link className="back-button" href="/discover"><Icon name="back" /> Back to athletes</Link>
      <section className="profile-hero">
        <div className="profile-photo">
          <img src={athlete.image} alt={athlete.name} />
          <span>{athlete.location || "Philippines"}</span>
        </div>
        <div className="profile-summary">
          {athlete.sport && <span className="sport-pill inline">{athlete.sport}</span>}
          <div className="name-line large">
            <h1>{athlete.name}</h1>
            {athlete.verified && <span className="verified"><Icon name="check" size={14} /></span>}
          </div>
          {athlete.location && <p className="location"><Icon name="pin" />{athlete.location}, Philippines</p>}
          <p className="profile-bio">{athlete.bio || "This athlete has not added a story yet."}</p>
          {athlete.achievement && (
            <div className="achievement">
              <span><Icon name="spark" /></span>
              <div><small>Achievement</small><strong>{athlete.achievement}</strong></div>
            </div>
          )}
        </div>
        <aside className="support-card">
          <small>Confirmed support</small>
          <strong>{peso(athlete.raised)}</strong>
          {athlete.goal > 0 && <span>of {peso(athlete.goal)} goal</span>}
          {athlete.goal > 0 && <Progress value={percent} />}
          {athlete.goal > 0 && (
            <div className="support-stats">
              <span><b>{percent}%</b> funded</span>
              <span><b>{athlete.supporters}</b> supporters</span>
            </div>
          )}
          {role !== "athlete" && (
            <button className="button full gold" onClick={() => setShowPaymentDetails((show) => !show)}>
              {showPaymentDetails ? "Hide payment details" : `Support ${athlete.name.split(" ")[0]}`}
              <Icon name="heart" />
            </button>
          )}
          <p className="safe-note">
            <Icon name="shield" size={16} />
            Payments go directly to the athlete outside Startlete. We do not process or verify transfers.
          </p>
          {showPaymentDetails && (
            <div className="athlete-payment-details">
              <h3>Pay the athlete directly</h3>
              <p>Scan the athlete&apos;s QR code in your wallet app. After sending, sign in to report the transfer so the athlete can confirm it.</p>
              {qrLoading && <p className="muted-line">Loading payment details…</p>}
              {qrError && <ErrorState message={qrError} onRetry={reloadQr} />}
              {!qrLoading && !qrError && !qrCodes?.length && (
                <p className="muted-line">No payment QR codes are available right now.</p>
              )}
              {qrCodes?.map((qr) => (
                <article className="athlete-payment-qr" key={qr.id}>
                  <strong>{qr.method}</strong>
                  <span>{qr.label}</span>
                  {qr.image && <img src={qr.image} alt={`${qr.method} payment QR for ${athlete.name}`} />}
                  {qr.accountNumber && <code>{qr.accountNumber}</code>}
                </article>
              ))}
              {role !== "supporter" && (
                <Link className="button full" href="/login">Sign in to report a transfer</Link>
              )}
              {role === "supporter" && user && Boolean(qrCodes?.length) && (
                <>
                  {reportSentFor === athlete.id ? (
                    <p className="field-hint" role="status">Transfer report submitted. The athlete will review and confirm it.</p>
                  ) : (
                    <button className="button full" onClick={() => setReportOpen((open) => !open)}>
                      {reportOpen ? "Cancel report" : "I sent a transfer"}
                    </button>
                  )}
                  {reportOpen && (
                    <form className="direct-transfer-form" onSubmit={submitReport}>
                      <label>Amount sent (₱)
                        <input type="number" min="1" step="1" required value={reportAmount} onChange={(event) => setReportAmount(event.target.value)} />
                      </label>
                      <label>Payment method
                        <select required value={reportMethod} onChange={(event) => setReportMethod(event.target.value)}>
                          <option value="" disabled>Select a method</option>
                          {[...new Set((qrCodes ?? []).map((qr) => qr.method))].map((method) => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </label>
                      <label>Transaction reference
                        <input required value={reportReference} onChange={(event) => setReportReference(event.target.value)} />
                      </label>
                      <label>Your name (optional)
                        <input value={reportName} onChange={(event) => setReportName(event.target.value)} />
                      </label>
                      <label>Note to athlete (optional)
                        <textarea value={reportNote} onChange={(event) => setReportNote(event.target.value)} />
                      </label>
                      {reportError && <p className="form-error" role="alert">{reportError}</p>}
                      <p className="field-hint">This report is not proof of payment. The athlete confirms transfers manually.</p>
                      <button className="button full gold" disabled={reporting || !qrCodes?.length}>
                        {reporting ? "Submitting…" : "Submit transfer report"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}
        </aside>
      </section>
      <section className="profile-content">
        <div>
          <span className="eyebrow">About</span>
          <h2>{athlete.name}&apos;s journey</h2>
          <p>{athlete.bio || "This athlete has not added a story yet."}</p>
        </div>
        <div>
          <span className="eyebrow">Latest updates</span>
          <div className="profile-feed">
            {postsLoading ? (
              <article className="post"><p>Loading updates…</p></article>
            ) : posts?.length ? (
              posts.map((post) => (
                <article className="post" key={post.id}>
                  <small>{new Date(post.createdAt).toLocaleDateString()}</small>
                  <p>{post.content}</p>
                </article>
              ))
            ) : (
              <article className="post"><p>No updates yet. Check back soon.</p></article>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
