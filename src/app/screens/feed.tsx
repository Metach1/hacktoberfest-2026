"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/src/app/shared/ui";
import { PostCard } from "@/src/app/shared/post-card";
import { useStarlete } from "@/src/app/store";

export function FeedScreen() {
  const { role, athletes, posts, addPost } = useStarlete();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  // Newest first. Sorting a copy keeps the store array untouched.
  const ordered = useMemo(
    () => [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts],
  );

  const isAthlete = role === "athlete";
  const publish = () => {
    if (!isAthlete || !draft.trim()) return;
    addPost(athletes[0].id, draft);
    setDraft("");
    setCreating(false);
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
        {ordered.length ? (
          ordered.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
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
            <button className="button full" disabled={!draft.trim()} onClick={publish}>Publish update</button>
          </div>
        </div>
      )}
    </main>
  );
}
