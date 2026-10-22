"use client";

import { useState } from "react";
import { Icon } from "@/src/app/shared/ui";
import { PostCard } from "@/src/app/shared/post-card";
import { useSession } from "@/src/app/shared/session-provider";
import { useAsync, ErrorState } from "@/src/app/shared/async-state";
import { getFeed, createPost } from "@/src/app/services/feed";

export function FeedScreen() {
  const { role, user } = useSession();
  const { data: posts, loading, error, reload } = useAsync(() => getFeed(), []);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isAthlete = role === "athlete";

  const publish = async () => {
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createPost(text);
      setDraft("");
      setCreating(false);
      reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Couldn't publish your update.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell feed-page">
      <div className="feed-hero">
        <span className="eyebrow light">Community feed</span>
        <h1>Updates from the athletes you back.</h1>
        <p>Follow the training diaries, wins, and setbacks—then cheer them on.</p>
        {isAthlete && (
          <button className="button gold" onClick={() => setCreating(true)}>
            <Icon name="plus" /> Share an update
          </button>
        )}
      </div>

      <section className="feed-list">
        {loading && <div className="empty"><h3>Loading the feed…</h3></div>}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && posts && posts.length > 0 &&
          posts.map((p) => <PostCard key={p.id} post={p} onChanged={reload} />)}
        {!loading && !error && posts && posts.length === 0 && (
          <div className="empty"><h3>No posts yet</h3><p>Check back soon—athletes are just getting started.</p></div>
        )}
      </section>

      {creating && (
        <div className="modal-backdrop">
          <div className="modal small-modal">
            <button className="modal-close" onClick={() => setCreating(false)}><Icon name="close" /></button>
            <span className="eyebrow">Share an update</span>
            <h2>Bring supporters along</h2>
            <label>Post<textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What happened in training today?" /></label>
            {submitError && <p className="field-error" role="alert">{submitError}</p>}
            {!user && <p className="field-error">You must be signed in to post.</p>}
            <button className="button full" disabled={!draft.trim() || submitting} onClick={publish}>
              {submitting ? "Publishing…" : "Publish update"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
