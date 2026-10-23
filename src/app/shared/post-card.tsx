"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Icon } from "@/src/app/shared/ui";
import { TimeAgo } from "@/src/app/shared/time-ago";
import { ImageUploadControls } from "@/src/app/shared/image-upload";
import { useStarlete, actorIdForRole } from "@/src/app/store";
import { postAuthor, type Post, type PostImage } from "@/src/app/data/posts";

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

async function removeImage(id: string) {
  const response = await fetch(`/api/post-images/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (response.status === 404) return;
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? "Could not remove this image.");
  }
}

export function PostCard({ post, showAuthor = true }: { post: Post; showAuthor?: boolean }) {
  const { role, athletes, toggleLike, addComment, editPost, deletePost } = useStarlete();
  const actorId = actorIdForRole(role, athletes);
  const author = postAuthor(post.authorAthleteId);
  const isOwner = role === "athlete" && athletes[0]?.id === post.authorAthleteId;

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editImages, setEditImages] = useState<PostImage[]>(post.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [selectedImage, setSelectedImage] = useState<PostImage | null>(null);
  const [imageStatuses, setImageStatuses] = useState<Record<string, PostImage["status"]>>({});
  const [unavailableImages, setUnavailableImages] = useState<Set<string>>(new Set());
  const [reportMessage, setReportMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const images = post.images ?? [];
    void Promise.all(images.map(async (image) => {
      try {
        const response = await fetch(`/api/post-images/${encodeURIComponent(image.id)}?metadata=1`);
        if (!response.ok) return { id: image.id, unavailable: true as const };
        const metadata = await response.json();
        return { id: image.id, status: metadata.status as PostImage["status"], unavailable: false as const };
      } catch {
        return { id: image.id, unavailable: true as const };
      }
    })).then((results) => {
      if (!active) return;
      setImageStatuses((current) => {
        const next = { ...current };
        for (const result of results) {
          if ("status" in result && result.status) next[result.id] = result.status;
        }
        return next;
      });
      setUnavailableImages((current) => {
        const next = new Set(current);
        for (const result of results) {
          if (result.unavailable) next.add(result.id);
          else next.delete(result.id);
        }
        return next;
      });
    });
    return () => { active = false; };
  }, [post.id, post.images]);

  const liked = post.likedBy.includes(actorId);
  const actorName = role === "athlete" ? athletes[0]?.name ?? "Athlete" : "Jamie";

  const submitComment = () => {
    const text = comment.trim();
    if (!text) return;
    addComment(post.id, actorId, actorName, text);
    setComment("");
    setShowComments(true);
  };

  const report = async (targetType: "post" | "image", targetId: string, reason: string) => {
    setReportMessage("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit this report.");
      setReportMessage("Report sent to the admin review queue.");
    } catch (cause) {
      setReportMessage(cause instanceof Error ? cause.message : "Could not submit this report.");
    }
  };

  const saveEdit = async () => {
    if (!editText.trim() || saving || !isOwner) return;
    setSaving(true);
    setError("");
    try {
      const nextImages = [...editImages, ...(
        newFiles.length ? await uploadImages(newFiles, post.id, post.authorAthleteId) : []
      )];
      const kept = new Set(editImages.map((image) => image.id));
      await Promise.all((post.images ?? []).filter((image) => !kept.has(image.id)).map((image) => removeImage(image.id)));
      editPost(post.id, editText, nextImages);
      setNewFiles([]);
      setShowEdit(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this post.");
    } finally {
      setSaving(false);
    }
  };

  const removePost = async () => {
    if (!isOwner || saving) return;
    setSaving(true);
    setError("");
    try {
      await Promise.all((post.images ?? []).map((image) => removeImage(image.id)));
      deletePost(post.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this post.");
    } finally {
      setSaving(false);
    }
  };

  const visibleImages = (post.images ?? [])
    .map((image) => ({ ...image, status: imageStatuses[image.id] ?? image.status }))
    .filter((image) => !unavailableImages.has(image.id) && image.status !== "rejected" && (image.status === "approved" || isOwner));

  return (
    <article className="feed-post">
      {showAuthor && (
        <header className="feed-post-head">
          <Link className="feed-author" href={`/athletes/${post.authorAthleteId}`}>
            <Avatar src={author.image} name={author.name} size={46} className="feed-author-avatar" />
            <span className="feed-author-meta">
              <strong>{author.name}{author.verified && <span className="verified inline-verified"><Icon name="check" size={11} /></span>}</strong>
              <small>{author.sport} · <TimeAgo iso={post.createdAt} /></small>
            </span>
          </Link>
        </header>
      )}
      {!showAuthor && <small className="feed-post-time"><TimeAgo iso={post.createdAt} /></small>}

      {showEdit ? (
        <div className="post-edit">
          <label>Post<textarea value={editText} onChange={(event) => setEditText(event.target.value)} /></label>
          <div className="post-edit-images">
            {editImages.map((image) => (
              <div className="post-edit-image" key={image.id}>
                <img src={`/api/post-images/${encodeURIComponent(image.id)}`} alt={image.alt} />
                {image.status === "needs_review" && <small>Pending review</small>}
                <button type="button" className="image-remove" aria-label="Remove image" onClick={() => setEditImages((items) => items.filter((item) => item.id !== image.id))}>
                  <Icon name="close" size={15} />
                </button>
              </div>
            ))}
          </div>
          <ImageUploadControls files={newFiles} onFiles={setNewFiles} existingCount={editImages.length} />
          <div className="post-edit-actions">
            <button type="button" className="button secondary small" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="button" className="button small" disabled={!editText.trim() || saving} onClick={saveEdit}>
              {saving ? "Checking images…" : "Save changes"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="feed-post-text">{post.text}</p>
          {visibleImages.length > 0 && (
            <div className={`post-image-grid image-count-${Math.min(visibleImages.length, 4)}`}>
              {visibleImages.map((image) => (
                <figure className="post-image" key={image.id}>
                  <button type="button" className="post-image-button" onClick={() => setSelectedImage(image)} aria-label={`View ${image.alt}`}>
                    <img src={`/api/post-images/${encodeURIComponent(image.id)}`} alt={image.alt} loading="lazy" />
                  </button>
                  {image.status === "needs_review" && isOwner && <figcaption className="pending-image-label">Pending review</figcaption>}
                  {role && <button className="image-report-button" onClick={() => report("image", image.id, "sexualized_image")}>Report image</button>}
                </figure>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {reportMessage && <p className="report-status" role="status">{reportMessage}</p>}

      <div className="feed-actions">
        <button type="button" className={liked ? "feed-action liked" : "feed-action"} aria-pressed={liked} onClick={() => toggleLike(post.id, actorId)}>
          <Icon name="heart" size={18} /> {post.likes} {post.likes === 1 ? "like" : "likes"}
        </button>
        <button type="button" className="feed-action" aria-expanded={showComments} onClick={() => setShowComments((value) => !value)}>
          <Icon name="comment" size={18} /> {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
        </button>
        {role && <button type="button" className="feed-action" onClick={() => report("post", post.id, "other")}>Report post</button>}
        {isOwner && !showEdit && (
          <>
            <button type="button" className="feed-action" onClick={() => { setEditText(post.text); setEditImages(post.images ?? []); setNewFiles([]); setShowEdit(true); }}>Edit</button>
            <button type="button" className="feed-action danger-text" disabled={saving} onClick={removePost}>Delete</button>
          </>
        )}
      </div>

      {showComments && (
        <div className="feed-comments">
          {post.comments.map((item) => (
            <div className="feed-comment" key={item.id}>
              <span className="feed-comment-avatar" aria-hidden="true">{item.authorName.charAt(0)}</span>
              <div>
                <strong>{item.authorName}</strong> <small><TimeAgo iso={item.createdAt} /></small>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
          {role ? (
            <form className="feed-comment-form" onSubmit={(event) => { event.preventDefault(); submitComment(); }}>
              <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment…" aria-label="Add a comment" />
              <button type="submit" className="icon-only" aria-label="Post comment" disabled={!comment.trim()}><Icon name="send" size={18} /></button>
            </form>
          ) : (
            <p className="feed-comment-signin"><Link href="/login">Log in</Link> to join the conversation.</p>
          )}
        </div>
      )}

      {selectedImage && (
        <div className="post-image-viewer" role="dialog" aria-modal="true" aria-label={selectedImage.alt} onClick={() => setSelectedImage(null)}>
          <button type="button" className="modal-close" aria-label="Close image" onClick={() => setSelectedImage(null)}><Icon name="close" /></button>
          <img src={`/api/post-images/${encodeURIComponent(selectedImage.id)}`} alt={selectedImage.alt} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </article>
  );
}
