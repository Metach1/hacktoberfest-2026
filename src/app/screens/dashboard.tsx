"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AthleteCard, Icon, MiniAthlete, Progress, peso } from "@/src/app/shared/ui";
import { useStarlete, type Donation, type QrCode } from "@/src/app/store";
import type { Athlete } from "@/src/app/data/athletes";
import { msUntilAutoConfirm } from "@/src/app/lib/donations.mjs";

function SupporterDashboard({ athletes }: { athletes: Athlete[] }) {
  const top = [...athletes].sort((a, b) => b.raised - a.raised);
  return (
    <main className="dashboard page-shell">
      <div className="dash-welcome"><div><span className="eyebrow">Supporter dashboard</span><h1>Magandang araw, Jamie.</h1><p>There are new stories waiting for your support.</p></div><div className="impact-chip"><Icon name="heart" /><span><small>Your total impact</small><b>₱4,500 given</b></span></div></div>
      <section><div className="section-head"><div><span className="eyebrow">Picked for you</span><h2>Athletes making moves</h2></div></div><div className="card-grid">{athletes.slice(0, 3).map(a => <AthleteCard key={a.id} athlete={a} />)}</div></section>
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

function QrManager({ athleteId }: { athleteId: number }) {
  const { getQrCodes, addQrCode, replaceQrCode, removeQrCode } = useStarlete();
  const codes = getQrCodes(athleteId);
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState("GCash");
  const [label, setLabel] = useState("");
  const [image, setImage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const methods = ["GCash", "Maya", "GrabPay", "BPI", "BDO", "LandBank", "UnionBank", "Bank transfer"];

  const readImage = (file: File | undefined, set: (v: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => set(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const submitAdd = () => {
    if (!label.trim()) return;
    addQrCode(athleteId, method, label.trim(), image || undefined);
    setAdding(false);
    setMethod("GCash");
    setLabel("");
    setImage("");
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
                    <input type="file" accept="image/*" hidden onChange={(e) => readImage(e.target.files?.[0], (v) => replaceQrCode(athleteId, qr.id, { image: v }))} />
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
            <input type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], setImage)} />
          </label>
          {image && <img className="qr-add-preview" src={image} alt="QR preview" width={72} height={72} />}
          <div className="form-actions">
            <button className="button secondary" onClick={() => { setAdding(false); setImage(""); }}>Cancel</button>
            <button className="button" disabled={!label.trim()} onClick={submitAdd}>Save QR</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingDonations({ athleteId }: { athleteId: number }) {
  const { getDonationsForAthlete, confirmDonation } = useStarlete();
  const all = getDonationsForAthlete(athleteId);
  const pending = all.filter((d) => d.status === "pending");
  const [open, setOpen] = useState<Donation | null>(null);

  return (
    <div className="dash-card">
      <div className="section-head">
        <div><span className="eyebrow">Action needed</span><h2>Pending receipts</h2></div>
        {pending.length > 0 && <span className="count-pill">{pending.length}</span>}
      </div>
      <p className="muted-line">Review each receipt and confirm you received the funds. Pending donations auto-confirm after 3 days — a demo timeout, not bank verification.</p>

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
            <button className="button full gold" onClick={() => { confirmDonation(open.id); setOpen(null); }}>Confirm receipt</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AthleteDashboard({ athlete, posts, onCreate }: { athlete: Athlete; posts: string[]; onCreate: (p: string) => void }) {
  const { getDonationsForAthlete } = useStarlete();
  const [creating, setCreating] = useState(false);
  const [post, setPost] = useState("");
  const percent = Math.round((athlete.raised / athlete.goal) * 100);

  const confirmed = getDonationsForAthlete(athlete.id).filter((d) => d.status === "confirmed");

  return (
    <main className="dashboard page-shell">
      <div className="dash-welcome"><div><span className="eyebrow">Athlete dashboard</span><h1>Keep going, {athlete.name.split(" ")[0]}.</h1><p>Your community is cheering with every step.</p></div><button className="button" onClick={() => setCreating(true)}><Icon name="plus" /> Create post</button></div>
      <div className="status-banner"><span className="status-icon"><Icon name="shield" /></span><div><strong>Your profile is verified</strong><p>Supporters can see your verified badge and fund your journey.</p></div><span className="verified-label">Verified athlete</span></div>
      <section className="stat-grid"><div className="stat-card dark"><small>Total funds received</small><strong>{peso(athlete.raised)}</strong><span>confirmed donations only</span></div><div className="stat-card"><small>Funding goal</small><strong>{peso(athlete.goal)}</strong><Progress value={percent} /><span>{percent}% funded</span></div><div className="stat-card"><small>Your community</small><strong>{athlete.supporters}</strong><span>supporters behind you</span></div></section>

      <section className="dashboard-grid">
        <PendingDonations athleteId={athlete.id} />
        <QrManager athleteId={athlete.id} />
      </section>

      <section className="dashboard-grid">
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Community support</span><h2>Confirmed donations</h2></div></div>
          {confirmed.length === 0
            ? <div className="empty-note small"><p>No confirmed donations yet. Confirm a pending receipt to see it here.</p></div>
            : confirmed.map((d) => (
                <div className="donation-row" key={d.id}>
                  <span className="donor-avatar"><Icon name="heart" /></span>
                  <div>
                    <strong>{d.supporterName}</strong>
                    <small>{timeAgo(d.confirmedAt ?? d.createdAt)}{d.confirmedBy === "auto" ? " · auto-confirmed (demo)" : ""}</small>
                  </div>
                  <b>+{peso(d.amount)}</b>
                </div>
              ))}
        </div>
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Your story</span><h2>Recent posts</h2></div><button className="text-button" onClick={() => setCreating(true)}>New post</button></div>{posts.map((p, i) => <article className="dash-post" key={i}><small>{i ? "1 week ago" : "Just now"}</small><strong>{p}</strong><span>{i ? "86" : "0"} cheers · {i ? "12" : "0"} comments</span></article>)}</div>
      </section>

      {creating && <div className="modal-backdrop"><div className="modal small-modal"><button className="modal-close" onClick={() => setCreating(false)}><Icon name="close" /></button><span className="eyebrow">Share an update</span><h2>Bring supporters along</h2><label>Post<textarea value={post} onChange={e => setPost(e.target.value)} placeholder="What happened in training today?" /></label><button className="button full" disabled={!post.trim()} onClick={() => { onCreate(post); setCreating(false); setPost(""); }}>Publish update</button></div></div>}
    </main>
  );
}

export function DashboardScreen() {
  const { role, athletes, posts, addPost, mounted } = useStarlete();
  const router = useRouter();

  useEffect(() => {
    if (mounted && !role) router.replace("/login");
  }, [mounted, role, router]);

  if (!role) return null;
  if (role === "athlete") {
    return <AthleteDashboard athlete={athletes[0]} posts={posts} onCreate={addPost} />;
  }
  return <SupporterDashboard athletes={athletes} />;
}
