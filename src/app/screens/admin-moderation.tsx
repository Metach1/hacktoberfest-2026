"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";
import type { StoredPostImage, StoredReport } from "@/src/app/lib/local-image-store";

type AdminImage = StoredPostImage & { url: string };

const reportOutcomes: Array<{ value: Exclude<StoredReport["outcome"], "pending">; label: string }> = [
  { value: "dismissed", label: "Dismissed" },
  { value: "warning", label: "Warning" },
  { value: "content_removed", label: "Content removed" },
  { value: "account_suspended", label: "Account suspended" },
];

export function AdminModerationScreen() {
  const { deletePost } = useStarlete();
  const [token, setToken] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [images, setImages] = useState<AdminImage[]>([]);
  const [allImages, setAllImages] = useState<AdminImage[]>([]);
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [rejectedCounts, setRejectedCounts] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadQueue = useCallback(async () => {
    const [imageResponse, reportResponse] = await Promise.all([
      fetch("/api/admin/images"),
      fetch("/api/admin/reports"),
    ]);
    if (imageResponse.status === 403 || reportResponse.status === 403) {
      setAuthorized(false);
      return;
    }
    const imageData = await imageResponse.json();
    const reportData = await reportResponse.json();
    if (!imageResponse.ok) throw new Error(imageData.error ?? "Could not load image reviews.");
    if (!reportResponse.ok) throw new Error(reportData.error ?? "Could not load reports.");
    setAuthorized(true);
    setImages(imageData.images);
    setAllImages(imageData.allImages);
    setRejectedCounts(imageData.rejectedCounts);
    setReports(reportData.reports);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQueue().catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not load the moderation queue.");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQueue]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/demo-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Admin access was denied.");
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin access was denied.");
    }
  };

  const moderateImage = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/admin/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update this image.");
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this image.");
    } finally {
      setBusyId("");
    }
  };

  const removeImage = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/post-images/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove this image.");
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this image.");
    } finally {
      setBusyId("");
    }
  };

  const updateReport = async (id: string, outcome: Exclude<StoredReport["outcome"], "pending">) => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, outcome }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update this report.");
      const report = reports.find((item) => item.id === id);
      if (outcome === "content_removed" && report?.targetType === "post") deletePost(report.targetId);
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this report.");
    } finally {
      setBusyId("");
    }
  };

  if (!authorized) {
    return (
      <main className="admin-page page-shell">
        <section className="admin-signin">
          <span className="eyebrow">Admin moderation</span>
          <h1>Review community uploads</h1>
          <p>Enter the local development admin token configured in <code>DEMO_ADMIN_TOKEN</code>.</p>
          <form onSubmit={signIn}>
            <label>Admin token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button" type="submit">Continue <Icon name="arrow" size={16} /></button>
          </form>
          <p className="muted-line">This demo queue uses local files and is not a production admin system.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page page-shell">
      <header className="admin-heading">
        <span className="eyebrow">Admin moderation</span>
        <h1>Review community content</h1>
        <p>Images are blurred by default. Select an image to reveal it for review.</p>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="admin-section">
        <div className="section-head"><div><span className="eyebrow">Needs review</span><h2>Images waiting for review</h2></div><span className="count-pill">{images.length}</span></div>
        {images.length ? (
          <div className="admin-image-grid">
            {images.map((image) => (
              <article className="admin-image-card" key={image.id}>
                <button type="button" className="admin-image-reveal" onClick={() => setRevealed((current) => new Set(current).add(image.id))} aria-label={revealed.has(image.id) ? image.alt : "Reveal blurred image"}>
                  <img className={revealed.has(image.id) ? "" : "blurred"} src={image.url} alt={image.alt} />
                </button>
                <p>{image.reason}</p>
                <small>Uploader: {image.ownerId}</small>
                {(rejectedCounts[image.ownerId] ?? 0) >= 3 && <strong className="flagged-user">Flagged: {rejectedCounts[image.ownerId]} rejected uploads</strong>}
                <div className="admin-actions">
                  <button className="button small secondary" disabled={busyId === image.id} onClick={() => moderateImage(image.id, "reject")}>Reject</button>
                  <button className="button small" disabled={busyId === image.id} onClick={() => moderateImage(image.id, "approve")}>Approve</button>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="muted-line">No images are waiting for review.</p>}
      </section>

      <section className="admin-section">
        <div className="section-head"><div><span className="eyebrow">Image library</span><h2>All active images</h2></div><span className="count-pill">{allImages.length}</span></div>
        {allImages.length ? (
          <div className="admin-image-grid">
            {allImages.map((image) => (
              <article className="admin-image-card" key={image.id}>
                <button type="button" className="admin-image-reveal" onClick={() => setRevealed((current) => new Set(current).add(image.id))} aria-label={revealed.has(image.id) ? image.alt : "Reveal blurred image"}>
                  <img className={revealed.has(image.id) ? "" : "blurred"} src={image.url} alt={image.alt} />
                </button>
                <p>{image.status === "needs_review" ? "Pending review" : "Approved"}</p>
                <button className="button small secondary" disabled={busyId === image.id} onClick={() => removeImage(image.id)}>Remove image</button>
              </article>
            ))}
          </div>
        ) : <p className="muted-line">No uploaded images yet.</p>}
      </section>

      <section className="admin-section">
        <div className="section-head"><div><span className="eyebrow">Community reports</span><h2>Reported posts and images</h2></div><span className="count-pill">{reports.filter((report) => report.outcome === "pending").length}</span></div>
        {reports.length ? (
          <div className="admin-report-list">
            {reports.map((report) => (
              <article className="admin-report" key={report.id}>
                <div><strong>{report.targetType === "image" ? "Image" : "Post"} report</strong><p>Reason: {report.reason.replaceAll("_", " ")} · Outcome: {report.outcome.replaceAll("_", " ")}</p><small>Target {report.targetId} · Reported by {report.reporterId}</small></div>
                {report.outcome === "pending" && (
                  <div className="admin-actions">
                    {reportOutcomes.map((outcome) => (
                      <button key={outcome.value} className="button small secondary" disabled={busyId === report.id} onClick={() => updateReport(report.id, outcome.value)}>{outcome.label}</button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : <p className="muted-line">No reports have been submitted.</p>}
      </section>
    </main>
  );
}
