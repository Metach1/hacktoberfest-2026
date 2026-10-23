"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/src/app/shared/ui";
import { PostCard } from "@/src/app/shared/post-card";
import { ImageUploadControls } from "@/src/app/shared/image-upload";
import { useStarlete } from "@/src/app/store";
import { newId, type PostImage } from "@/src/app/data/posts";

async function uploadImages(files: File[], postId: string, athleteId: number): Promise<PostImage[]> {
  const form = new FormData();
  form.set("postId", postId);
  form.set("athleteId", String(athleteId));
  files.forEach((file) => form.append("images", file));
  const response = await fetch("/api/post-images", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not upload the selected images.");
  return result.images as PostImage[];
}

export function FeedScreen() {
  const { role, athletes, posts, addPost } = useStarlete();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const ordered = useMemo(
    () => [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts],
  );

  const isAthlete = role === "athlete";

  const publish = async () => {
    if (!isAthlete || !athletes[0] || !draft.trim() || saving) return;
    setSaving(true);
    setError("");
    const postId = newId("post");
    try {
      const images = files.length ? await uploadImages(files, postId, athletes[0].id) : [];
      addPost(athletes[0].id, draft, images, postId);
      setDraft("");
      setFiles([]);
      setCreating(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish this post.");
    } finally {
      setSaving(false);
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
        {ordered.length ? (
          ordered.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="empty"><h3>No posts yet</h3><p>Check back soon—athletes are just getting started.</p></div>
        )}
      </section>

      {creating && (
        <div className="modal-backdrop">
          <div className="modal small-modal" role="dialog" aria-modal="true" aria-label="Share an update">
            <button className="modal-close" onClick={() => setCreating(false)} aria-label="Close"><Icon name="close" /></button>
            <span className="eyebrow">Share an update</span>
            <h2>Bring supporters along</h2>
            <label>Post<textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What happened in training today?" /></label>
            <ImageUploadControls files={files} onFiles={setFiles} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button full" disabled={!draft.trim() || saving} onClick={publish}>
              {saving ? "Checking images…" : "Publish update"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
