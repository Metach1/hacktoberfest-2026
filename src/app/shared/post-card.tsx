"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/src/app/shared/ui";
import { TimeAgo } from "@/src/app/shared/time-ago";
import { useSession } from "@/src/app/shared/session-provider";
import {
  addComment as addCommentSvc,
  toggleLike as toggleLikeSvc,
  editPost as editPostSvc,
  deletePost as deletePostSvc,
  type FeedPost,
} from "@/src/app/services/feed";

/**
 * A single feed post backed by Supabase data. Handles liking (optimistic),
 * commenting, and owner-only edit/delete. Author link points to the catalog
 * athlete profile when the post is a showcase post.
 *
 * `onChanged` asks the parent to refresh the feed after a mutation that changes
 * structure (new comment, edit, delete). Likes update optimistically in place.
 */
export function PostCard({
  post,
  showAuthor = true,
  onChanged,
}: {
  post: FeedPost;
  showAuthor?: boolean;
  onChanged?: () => void;
}) {
  const { user, displayName } = useSession();

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [busyLike, setBusyLike] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const profileHref = post.catalogAthleteId != null ? `/athletes/${post.catalogAthleteId}` : null;

  const onToggleLike = async () => {
    if (!user) { setActionError("Log in to like posts."); return; }
    if (busyLike) return;
    setBusyLike(true);
    // Optimistic.
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await toggleLikeSvc(post.id, liked);
    } catch (e) {
      // Roll back on failure.
      setLiked(liked);
      setLikeCount((c) => c + (next ? -1 : 1));
      setActionError(e instanceof Error ? e.message : "Couldn't update like.");
    } finally {
      setBusyLike(false);
    }
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (!text || !user) { if (!user) setActionError("Log in to comment."); return; }
    setSubmitting(true);
    setActionError(null);
    try {
      await addCommentSvc(post.id, displayName ?? "Supporter", text);
      setComment("");
      setShowComments(true);
      onChanged?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't add comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!text) return;
    setActionError(null);
    try {
      await editPostSvc(post.id, text);
      setEditing(false);
      onChanged?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't save changes.");
    }
  };

  const doDelete = async () => {
    setActionError(null);
    try {
      await deletePostSvc(post.id);
      setConfirmDelete(false);
      onChanged?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't delete post.");
    }
  };

  return (
    <article className="feed-post">
      {showAuthor && (
        <header className="feed-post-head">
          {profileHref ? (
            <Link className="feed-author" href={profileHref}>
              {post.authorImage ? <img src={post.authorImage} alt="" /> : <span className="feed-avatar-fallback" aria-hidden="true">{post.authorName.charAt(0)}</span>}
              <span className="feed-author-meta">
                <strong>{post.authorName}{post.authorVerified && <span className="verified inline-verified"><Icon name="check" size={11} /></span>}</strong>
                <small>{post.authorSport} · <TimeAgo iso={post.createdAt} />{post.editedAt ? " · edited" : ""}</small>
              </span>
            </Link>
          ) : (
            <span className="feed-author">
              {post.authorImage ? <img src={post.authorImage} alt="" /> : <span className="feed-avatar-fallback" aria-hidden="true">{post.authorName.charAt(0)}</span>}
              <span className="feed-author-meta">
                <strong>{post.authorName}{post.authorVerified && <span className="verified inline-verified"><Icon name="check" size={11} /></span>}</strong>
                <small>{post.authorSport} · <TimeAgo iso={post.createdAt} />{post.editedAt ? " · edited" : ""}</small>
              </span>
            </span>
          )}
        </header>
      )}
      {!showAuthor && <small className="feed-post-time"><TimeAgo iso={post.createdAt} />{post.editedAt ? " · edited" : ""}</small>}

      {editing ? (
        <div className="feed-edit">
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edit post" />
          <div className="post-actions">
            <button type="button" className="text-button" disabled={!editText.trim()} onClick={saveEdit}>Save</button>
            <button type="button" className="text-button" onClick={() => { setEditing(false); setEditText(post.content); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <p className="feed-post-text">{post.content}</p>
      )}

      <div className="feed-actions">
        <button
          type="button"
          className={liked ? "feed-action liked" : "feed-action"}
          aria-pressed={liked}
          disabled={busyLike}
          onClick={onToggleLike}
        >
          <Icon name="heart" size={18} /> {likeCount} {likeCount === 1 ? "like" : "likes"}
        </button>
        <button
          type="button"
          className="feed-action"
          aria-expanded={showComments}
          onClick={() => setShowComments((v) => !v)}
        >
          <Icon name="comment" size={18} /> {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
        </button>
      </div>

      {post.canManage && !editing && (
        <div className="post-actions">
          {confirmDelete ? (
            <>
              <span className="confirm-text">Delete this post?</span>
              <button type="button" className="text-button danger" onClick={doDelete}>Delete</button>
              <button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button type="button" className="text-button" onClick={() => { setEditing(true); setEditText(post.content); }}>Edit</button>
              <button type="button" className="text-button danger" onClick={() => setConfirmDelete(true)}>Delete</button>
            </>
          )}
        </div>
      )}

      {actionError && <p className="field-error" role="alert">{actionError}</p>}

      {showComments && (
        <div className="feed-comments">
          {post.comments.map((c) => (
            <div className="feed-comment" key={c.id}>
              <span className="feed-comment-avatar" aria-hidden="true">{c.authorName.charAt(0)}</span>
              <div>
                <strong>{c.authorName}</strong> <small><TimeAgo iso={c.createdAt} /></small>
                <p>{c.content}</p>
              </div>
            </div>
          ))}
          {user ? (
            <form className="feed-comment-form" onSubmit={(e) => { e.preventDefault(); submitComment(); }}>
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" />
              <button type="submit" className="icon-only" aria-label="Post comment" disabled={!comment.trim() || submitting}>
                <Icon name="send" size={18} />
              </button>
            </form>
          ) : (
            <p className="feed-comment-signin"><Link href="/login">Log in</Link> to join the conversation.</p>
          )}
        </div>
      )}
    </article>
  );
}
