"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AthleteCard, Icon, MiniAthlete, Progress, peso } from "@/src/app/shared/ui";
import { useStarlete, type Donation, type QrCode } from "@/src/app/store";
import { useSession } from "@/src/app/shared/session-provider";
import { useAsync } from "@/src/app/shared/async-state";
import { getMyProfile, type MyProfile } from "@/src/app/services/profile";
import { getFeed, createPost, editPost as editPostSvc, deletePost as deletePostSvc, type FeedPost } from "@/src/app/services/feed";
import type { Athlete } from "@/src/app/data/athletes";
import { TimeAgo } from "@/src/app/shared/time-ago";
import { msUntilAutoConfirm } from "@/src/app/lib/donations.mjs";
import {
  REJECTION_REASONS,
  rejectionReasonLabel,
} from "@/src/app/lib/donations.mjs";
import { checkPaymentQr } from "@/src/app/lib/qr-decode";

function SupporterDashboard({ athletes }: { athletes: Athlete[] }) {
  const { getDonationsForSupporter, getAthlete } = useStarlete();
  const { displayName } = useSession();
  const firstName = (displayName ?? "there").split(" ")[0];
  const top = [...athletes].sort((a, b) => b.raised - a.raised);
  const myPayments = getDonationsForSupporter();
  return (
    <main className="dashboard page-shell">
      <div className="dash-welcome"><div><span className="eyebrow">Supporter dashboard</span><h1>Magandang araw, {firstName}.</h1><p>There are new stories waiting for your support.</p></div></div>
      <section><div className="section-head"><div><span className="eyebrow">Picked for you</span><h2>Athletes making moves</h2></div></div><div className="card-grid">{athletes.slice(0, 3).map(a => <AthleteCard key={a.id} athlete={a} />)}</div></section>
      <section className="dashboard-grid">
        <div className="dash-card">
          <div className="section-head"><div><span className="eyebrow">Your payments</span><h2>My payments</h2></div>{myPayments.length > 0 && <span className="count-pill">{myPayments.length}</span>}</div>
          <p className="muted-line">Donations you submitted. A <strong>pending</strong> submission is awaiting athlete review — it is not yet accepted. A <strong>confirmed</strong> status reflects this demo workflow, not independently verified bank settlement.</p>
          {myPayments.length === 0 ? (
            <div className="empty-note small"><p>You haven&rsquo;t submitted any donations yet.</p></div>
          ) : (
            <div className="payment-history">
              {myPayments.map((d) => {
                const athlete = getAthlete(d.athleteId);
                return (
                  <div className="payment-row" key={d.id}>
                    <div className="payment-main">
                      <strong>{athlete?.name ?? `Athlete #${d.athleteId}`}</strong>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="payment-meta">
                      <span>{peso(d.amount)}</span>
                      <span>{d.method || "—"}</span>
                      <span>{shortDate(d.createdAt)}</span>
                    </div>
                    {d.status === "pending" && <p className="payment-note muted-line">Awaiting athlete review — not yet accepted.</p>}
                    {d.status === "rejected" && (
                      <p className="payment-reject">
                        Rejected · {rejectionReasonLabel(d.rejectionReason ?? "")}
                        {d.rejectionNote ? ` — ${d.rejectionNote}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <section className="dashboard-grid">
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Rising now</span><h2>Trending athletes</h2></div></div>{athletes.slice(1, 4).map((a, i) => <MiniAthlete key={a.id} athlete={a} rank={i + 1} />)}</div>
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Community</span><h2>Funding leaderboard</h2></div></div>{top.slice(0, 4).map((a, i) => <div className="leader-row" key={a.id}><span className={i === 0 ? "rank first" : "rank"}>{i + 1}</span><div><strong>{a.name}</strong><small>{a.supporters} supporters</small></div><b>{peso(a.raised)}</b></div>)}</div>
      </section>
    </main>
  );
}

/** Format milliseconds remaining as a short "Xd Yh" / "Yh" / "Zm" label. */
function formatRemaining(ms: number): string {
  if (ms <= 0) return "due now";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Relative "time ago" for a timestamp. */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Absolute short date for history rows (stable, locale-aware). */
function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

/** Small colored pill reflecting a donation's status. */
function StatusBadge({ status }: { status: Donation["status"] }) {
  const label = status === "confirmed" ? "Confirmed" : status === "rejected" ? "Rejected" : "Pending";
  return <span className={`status-badge ${status}`}>{label}</span>;
}

function QrManager({ athleteId }: { athleteId: number }) {
  const { getQrCodes, addQrCode, replaceQrCode, removeQrCode } = useStarlete();
  const codes = getQrCodes(athleteId);
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState("GCash");
  const [label, setLabel] = useState("");
  const [image, setImage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  // QR image validation feedback.
  const [qrChecking, setQrChecking] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrNotice, setQrNotice] = useState("");

  const methods = ["GCash", "Maya", "GrabPay", "BPI", "BDO", "LandBank", "UnionBank", "Bank transfer"];

  /**
   * Validate an uploaded QR image before accepting it: decode it locally and
   * check the decoded contents against supported PH payment QR (QR Ph / EMVCo)
   * formats. Unsupported or unreadable images are rejected with an actionable
   * message and never stored. A valid-but-generic EMVCo QR is accepted with a
   * soft caveat. Nothing leaves the browser; this is not payment verification.
   */
  const validateAndSetImage = async (file: File | undefined, set: (v: string) => void) => {
    setQrError("");
    setQrNotice("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setQrError("Please upload an image file (PNG, JPG, or WebP) of your payment QR.");
      return;
    }
    setQrChecking(true);
    try {
      const result = await checkPaymentQr(file);
      if (!result.valid) {
        setQrError(result.reason ?? "That image isn't a supported payment QR.");
        return;
      }
      if (result.format === "emvco" && result.reason) {
        setQrNotice(result.reason);
      }
      const reader = new FileReader();
      reader.onload = () => set(String(reader.result ?? ""));
      reader.readAsDataURL(file);
    } finally {
      setQrChecking(false);
    }
  };

  const submitAdd = () => {
    if (!label.trim()) return;
    addQrCode(athleteId, method, label.trim(), image || undefined);
    setAdding(false);
    setMethod("GCash");
    setLabel("");
    setImage("");
    setQrError("");
    setQrNotice("");
  };

  return (
    <div className="dash-card">
      <div className="section-head">
        <div><span className="eyebrow">Get paid</span><h2>Your payment QR codes</h2></div>
        <button className="text-button" onClick={() => setAdding(true)}>Add QR</button>
      </div>
      <p className="muted-line">Supporters scan these to pay you directly. Dummy data only — no real accounts.</p>

      {codes.length === 0 && !adding && (
        <div className="empty-note small">
          <p>No QR codes yet. Add a GCash, Maya, or bank QR so supporters can pay you.</p>
          <button className="button small" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Add your first QR</button>
        </div>
      )}

      <div className="qr-manage-list">
        {codes.map((qr: QrCode) => (
          <div className="qr-manage-row" key={qr.id}>
            <img src={qr.image} alt={`${qr.method} QR`} width={56} height={56} />
            <div className="qr-manage-meta">
              <strong>{qr.method}</strong>
              {editing === qr.id ? (
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Account name / handle"
                  autoFocus
                />
              ) : (
                <small>{qr.label}</small>
              )}
            </div>
            <div className="qr-manage-actions">
              {editing === qr.id ? (
                <>
                  <label className="link-file">
                    Replace image
                    <input type="file" accept="image/*" hidden onChange={(e) => validateAndSetImage(e.target.files?.[0], (v) => replaceQrCode(athleteId, qr.id, { image: v }))} />
                  </label>
                  <button className="text-button" onClick={() => { if (editLabel.trim()) replaceQrCode(athleteId, qr.id, { label: editLabel.trim() }); setEditing(null); }}>Save</button>
                </>
              ) : (
                <>
                  <button className="text-button" onClick={() => { setEditing(qr.id); setEditLabel(qr.label); }}>Edit</button>
                  <button className="text-button danger" onClick={() => removeQrCode(athleteId, qr.id)}>Remove</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <div className="qr-add-form">
          <label>
            Payment method
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {methods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>
            Account name / handle
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. J. Santos · 0917•••1234" />
          </label>
          <label className="qr-upload-field">
            QR image (optional — a placeholder is generated if omitted)
            <input type="file" accept="image/*" onChange={(e) => validateAndSetImage(e.target.files?.[0], setImage)} />
            <small className="field-hint">We check that it&rsquo;s a supported GCash, Maya, or bank (QR Ph) code. This isn&rsquo;t payment verification.</small>
          </label>
          {qrChecking && <p className="field-hint">Checking the QR code…</p>}
          {qrError && <p className="form-error">{qrError}</p>}
          {qrNotice && <p className="field-hint">{qrNotice}</p>}
          {image && <img className="qr-add-preview" src={image} alt="QR preview" width={72} height={72} />}
          <div className="form-actions">
            <button className="button secondary" onClick={() => { setAdding(false); setImage(""); setQrError(""); setQrNotice(""); }}>Cancel</button>
            <button className="button" disabled={!label.trim() || qrChecking} onClick={submitAdd}>Save QR</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingDonations({ athleteId }: { athleteId: number }) {
  const { getDonationsForAthlete, confirmDonation, rejectDonation } = useStarlete();
  const all = getDonationsForAthlete(athleteId);
  const pending = all.filter((d) => d.status === "pending");
  const [open, setOpen] = useState<Donation | null>(null);
  // Reject flow: target donation, chosen reason, optional note, confirm step.
  const [rejecting, setRejecting] = useState<Donation | null>(null);
  const [reason, setReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  const startReject = (d: Donation) => {
    setOpen(null);
    setRejecting(d);
    setReason("");
    setRejectNote("");
    setConfirmReject(false);
  };

  const cancelReject = () => {
    setRejecting(null);
    setReason("");
    setRejectNote("");
    setConfirmReject(false);
  };

  const applyReject = () => {
    if (!rejecting || !reason) return;
    rejectDonation(rejecting.id, reason, rejectNote.trim());
    cancelReject();
  };

  return (
    <div className="dash-card">
      <div className="section-head">
        <div><span className="eyebrow">Action needed</span><h2>Pending receipts</h2></div>
        {pending.length > 0 && <span className="count-pill">{pending.length}</span>}
      </div>
      <p className="muted-line">Review each receipt and confirm you received the funds, or reject it with a reason. Pending donations auto-confirm after 3 days — a demo timeout, not bank verification.</p>

      {pending.length === 0 ? (
        <div className="empty-note small"><p>No pending donations right now.</p></div>
      ) : (
        pending.map((d) => (
          <div className="pending-row" key={d.id}>
            {d.receiptPreview
              ? <img className="pending-thumb" src={d.receiptPreview} alt="Receipt" width={44} height={44} />
              : <span className="donor-avatar"><Icon name="heart" /></span>}
            <div className="pending-meta">
              <strong>{d.supporterName}</strong>
              <small>{d.method} · {d.reference || "no ref"} · {timeAgo(d.createdAt)}</small>
              <span className="auto-hint">Auto-confirms in {formatRemaining(msUntilAutoConfirm(d))}</span>
            </div>
            <b>{peso(d.amount)}</b>
            <div className="pending-actions">
              <button className="text-button" onClick={() => setOpen(d)}>View</button>
              <button className="text-button danger" onClick={() => startReject(d)}>Reject</button>
              <button className="button small" onClick={() => confirmDonation(d.id)}>Confirm</button>
            </div>
          </div>
        ))
      )}

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(null)}>
          <div className="modal small-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(null)} aria-label="Close"><Icon name="close" /></button>
            <span className="eyebrow">Review receipt</span>
            <h2>{peso(open.amount)} from {open.supporterName}</h2>
            <div className="review-rows">
              <span><small>Method</small><b>{open.method}</b></span>
              <span><small>Reference</small><b>{open.reference || "—"}</b></span>
              <span><small>Submitted</small><b>{timeAgo(open.createdAt)}</b></span>
              <span><small>Auto-confirm in</small><b>{formatRemaining(msUntilAutoConfirm(open))}</b></span>
            </div>
            {open.note && <p className="donor-note">“{open.note}”</p>}
            {open.receiptPreview
              ? <div className="review-receipt"><img src={open.receiptPreview} alt={open.receiptName || "Receipt"} /></div>
              : <p className="muted-line">No receipt image attached.</p>}
            <p className="safe-note"><Icon name="shield" /> Confirming records this demo donation toward your total. OCR and this flow do not verify real payments.</p>
            <div className="form-actions">
              <button className="button secondary danger" onClick={() => startReject(open)}>Reject…</button>
              <button className="button gold" onClick={() => { confirmDonation(open.id); setOpen(null); }}>Confirm receipt</button>
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="modal-backdrop" onClick={cancelReject}>
          <div className="modal small-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={cancelReject} aria-label="Close"><Icon name="close" /></button>
            {!confirmReject ? (
              <>
                <span className="eyebrow">Reject donation</span>
                <h2>Reject {peso(rejecting.amount)} from {rejecting.supporterName}?</h2>
                <p className="muted-line">Pick a reason. The supporter will see this reason (and your note, if any) with their rejected donation. This does not change your confirmed totals.</p>
                <label>
                  Reason
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option value="" disabled>Select a reason</option>
                    {REJECTION_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Note to supporter (optional{reason === "other" ? ", recommended" : ""})
                  <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Explain what went wrong, e.g. the amount on the receipt didn't match." />
                </label>
                <div className="form-actions">
                  <button className="button secondary" onClick={cancelReject}>Cancel</button>
                  <button className="button danger" disabled={!reason} onClick={() => setConfirmReject(true)}>Continue</button>
                </div>
                {!reason && <p className="field-hint">Select a reason to continue.</p>}
              </>
            ) : (
              <>
                <span className="eyebrow">Confirm rejection</span>
                <h2>Reject this donation?</h2>
                <div className="review-rows">
                  <span><small>Amount</small><b>{peso(rejecting.amount)}</b></span>
                  <span><small>From</small><b>{rejecting.supporterName}</b></span>
                  <span><small>Reason</small><b>{rejectionReasonLabel(reason)}</b></span>
                  {rejectNote.trim() && <span><small>Note</small><b>{rejectNote.trim()}</b></span>}
                </div>
                <p className="safe-note"><Icon name="shield" /> This marks the donation rejected and will not count toward your totals. It cannot be confirmed afterward.</p>
                <div className="form-actions">
                  <button className="button secondary" onClick={() => setConfirmReject(false)}>Back</button>
                  <button className="button danger" onClick={applyReject}>Reject donation</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Athlete-facing payment history: all donations (confirmed, pending, rejected)
 * with amount, supporter, method, reference, date, status, and the rejection
 * reason/note where applicable. Mobile-friendly stacked rows.
 */
function PaymentHistory({ athleteId }: { athleteId: number }) {
  const { getDonationsForAthlete } = useStarlete();
  const all = getDonationsForAthlete(athleteId);

  return (
    <div className="dash-card">
      <div className="section-head">
        <div><span className="eyebrow">History</span><h2>Recent payments</h2></div>
        {all.length > 0 && <span className="count-pill">{all.length}</span>}
      </div>
      <p className="muted-line">Every donation you&rsquo;ve received, including pending and rejected ones. Confirmed status reflects this demo workflow, not independently verified bank settlement.</p>
      {all.length === 0 ? (
        <div className="empty-note small"><p>No payments yet.</p></div>
      ) : (
        <div className="payment-history">
          {all.map((d) => (
            <div className="payment-row" key={d.id}>
              <div className="payment-main">
                <strong>{d.supporterName}</strong>
                <StatusBadge status={d.status} />
              </div>
              <div className="payment-meta">
                <span>{peso(d.amount)}</span>
                <span>{d.method || "—"}</span>
                <span>Ref {d.reference || "—"}</span>
                <span>{shortDate(d.createdAt)}</span>
              </div>
              {d.status === "rejected" && (
                <p className="payment-reject">
                  Rejected · {rejectionReasonLabel(d.rejectionReason ?? "")}
                  {d.rejectionNote ? ` — ${d.rejectionNote}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AthleteDashboard() {
  const { displayName } = useSession();
  // The signed-in athlete's real profile (name, funding goal, etc.).
  const { data: profile } = useAsync<MyProfile | null>(() => getMyProfile(), []);
  // The signed-in athlete's own posts, loaded from the database feed.
  const { data: feed, loading: postsLoading, reload: reloadPosts } = useAsync<FeedPost[]>(() => getFeed(), []);

  const [creating, setCreating] = useState(false);
  const [post, setPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const firstName = (displayName ?? profile?.firstName ?? "there").split(" ")[0];
  const goal = profile?.fundingGoal ?? null;

  // Only this athlete's own posts (owner-managed, canManage == true).
  const myPosts = (feed ?? []).filter((p) => p.canManage);

  const publish = async () => {
    const text = post.trim();
    if (!text) return;
    setPosting(true); setPostError(null);
    try {
      await createPost(text);
      setPost(""); setCreating(false);
      reloadPosts();
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Couldn't publish your update.");
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (p: FeedPost) => { setEditingId(p.id); setEditText(p.content); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };
  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      await editPostSvc(editingId, editText);
      cancelEdit();
      reloadPosts();
    } catch { /* surfaced inline below if needed */ }
  };
  const doDelete = async (id: string) => {
    try { await deletePostSvc(id); setConfirmDeleteId(null); reloadPosts(); } catch { /* no-op */ }
  };

  return (
    <main className="dashboard page-shell">
      <div className="dash-welcome"><div><span className="eyebrow">Athlete dashboard</span><h1>Keep going, {firstName}.</h1><p>Your community is cheering with every step.</p></div><button className="button" onClick={() => setCreating(true)}><Icon name="plus" /> Create post</button></div>
      <section className="stat-grid">
        <div className="stat-card dark"><small>Funding goal</small><strong>{goal != null ? peso(goal) : "Not set"}</strong><span>{goal != null ? "set in your profile" : "add one in Edit profile"}</span></div>
        <div className="stat-card"><small>Your posts</small><strong>{myPosts.length}</strong><span>updates shared</span></div>
      </section>

      <section className="dashboard-grid">
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Your story</span><h2>Recent posts</h2></div><button className="text-button" onClick={() => setCreating(true)}>New post</button></div>
          {postsLoading ? <p className="profile-bio">Loading your posts…</p> : myPosts.length ? myPosts.map(p => (
          <article className="dash-post" key={p.id}>
            <small><TimeAgo iso={p.createdAt} />{p.editedAt ? " · edited" : ""}</small>
            <strong>{p.content}</strong>
            <span>{p.likeCount} cheers · {p.comments.length} comments</span>
            {confirmDeleteId === p.id ? (
              <div className="post-actions">
                <span className="confirm-text">Delete this post?</span>
                <button className="text-button danger" onClick={() => doDelete(p.id)}>Delete</button>
                <button className="text-button" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="post-actions">
                <button className="text-button" onClick={() => startEdit(p)}>Edit</button>
                <button className="text-button danger" onClick={() => setConfirmDeleteId(p.id)}>Delete</button>
              </div>
            )}
          </article>
        )) : <p className="profile-bio">No posts yet. Share your first update!</p>}</div>
      </section>
      {creating && <div className="modal-backdrop"><div className="modal small-modal"><button className="modal-close" onClick={() => setCreating(false)}><Icon name="close" /></button><span className="eyebrow">Share an update</span><h2>Bring supporters along</h2><label>Post<textarea value={post} onChange={e => setPost(e.target.value)} placeholder="What happened in training today?" /></label>{postError && <p className="field-error" role="alert">{postError}</p>}<button className="button full" disabled={!post.trim() || posting} onClick={publish}>{posting ? "Publishing…" : "Publish update"}</button></div></div>}
      {editingId && <div className="modal-backdrop"><div className="modal small-modal"><button className="modal-close" onClick={cancelEdit}><Icon name="close" /></button><span className="eyebrow">Edit update</span><h2>Update your post</h2><label>Post<textarea value={editText} onChange={e => setEditText(e.target.value)} placeholder="What happened in training today?" /></label><button className="button full" disabled={!editText.trim()} onClick={saveEdit}>Save changes</button></div></div>}
    </main>
  );
}

export function DashboardScreen() {
  const { role, user, loading: sessionLoading } = useSession();
  const { athletes } = useStarlete();
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading && !user) router.replace("/login");
  }, [sessionLoading, user, router]);

  if (sessionLoading) return <main className="dashboard page-shell"><div className="empty"><h3>Loading your dashboard…</h3></div></main>;
  if (!user || !role) return null;
  if (role === "athlete") {
    return <AthleteDashboard />;
  }
  return <SupporterDashboard athletes={athletes} />;
}
