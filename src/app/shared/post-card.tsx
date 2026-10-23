"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/src/app/shared/ui";
import { TimeAgo } from "@/src/app/shared/time-ago";
import { useStarlete, actorIdForRole } from "@/src/app/store";
import { postAuthor, type Post, type Comment } from "@/src/app/data/posts";
import { useSession } from "@/src/app/shared/session-provider";
import { isSupabaseConfigured } from "@/src/app/lib/supabase/client";

/**
 * A single feed post with author header, like toggle, and a comment thread.
 * Reads interaction state/actions from the store so it works identically on the
 * global feed and on athlete profiles.
 *
 * `showAuthor` can be turned off on an athlete's own profile where every post
 * shares the same author shown in the page header.
 */
export function PostCard({ post, showAuthor = true }: { post: Post; showAuthor?: boolean }) {
  const { role, athletes, toggleLike, addComment, editComment, deleteComment } = useStarlete();
  const { user, displayName } = useSession();
  const actorId = actorIdForRole(role, athletes);
  const author = postAuthor(post.authorAthleteId, post);

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  const liked = post.likedBy.includes(actorId);
  const actorName = displayName || (role === "athlete" ? athletes[0]?.name ?? "Athlete" : "A supporter");

  // Whether the current user authored a given comment (so they can edit/delete
  // it). Supabase mode matches the owner UUID; the demo matches the actor id.
  const canManageComment = (c: Post["comments"][number]) =>
    isSupabaseConfigured() ? Boolean(c.ownerId && user?.id === c.ownerId) : c.authorId === actorId;

  const submitComment = () => {
    const text = comment.trim();
    if (!text) return;
    addComment(post.id, actorId, actorName, text);
    setComment("");
    setShowComments(true);
  };

  return (
    <article className="feed-post">
      {showAuthor && (
        <header className="feed-post-head">
          <Link className="feed-author" href={`/athletes/${post.authorProfileId ?? post.authorAthleteId}`}>
            {author.image ? <img src={author.image} alt="" /> : <span className="feed-avatar-fallback" aria-hidden="true">{author.name.charAt(0)}</span>}
            <span className="feed-author-meta">
              <strong>{author.name}{author.verified && <span className="verified inline-verified"><Icon name="check" size={11} /></span>}</strong>
              <small>{author.sport} · <TimeAgo iso={post.createdAt} /></small>
            </span>
          </Link>
        </header>
      )}
      {!showAuthor && <small className="feed-post-time"><TimeAgo iso={post.createdAt} /></small>}

      <p className="feed-post-text">{post.text}</p>

      <div className="feed-actions">
        <button
          type="button"
          className={liked ? "feed-action liked" : "feed-action"}
          aria-pressed={liked}
          onClick={() => toggleLike(post.id, actorId)}
        >
          <Icon name="heart" size={18} /> {post.likes} {post.likes === 1 ? "heart" : "hearts"}
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

      {showComments && (
        <div className="feed-comments">
          {post.comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              canManage={canManageComment(c)}
              onEdit={(text) => editComment(post.id, c.id, text)}
              onDelete={() => deleteComment(post.id, c.id)}
            />
          ))}
          {role ? (
            <form
              className="feed-comment-form"
              onSubmit={(e) => { e.preventDefault(); submitComment(); }}
            >
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                aria-label="Add a comment"
              />
              <button type="submit" className="icon-only" aria-label="Post comment" disabled={!comment.trim()}>
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

/**
 * One comment row. Shows the author/time/text, plus a three-dot menu (Edit /
 * Delete) when the current user owns it. Edit swaps the text for an inline
 * input with Save/Cancel; Delete asks for a small inline confirmation. Mirrors
 * the PaymentRowMenu dropdown pattern (outside-click / Escape dismiss).
 */
function CommentRow({
  comment,
  canManage,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  canManage: boolean;
  onEdit: (text: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Dismiss the dropdown on outside click and Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const startEdit = () => {
    setMenuOpen(false);
    setDraft(comment.text);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft(comment.text);
  };
  const saveEdit = () => {
    const text = draft.trim();
    if (!text) return; // blank is a no-op; use Cancel to discard
    onEdit(text);
    setEditing(false);
  };

  return (
    <div className="feed-comment" key={comment.id}>
      <span className="feed-comment-avatar" aria-hidden="true">{comment.authorName.charAt(0)}</span>
      <div className="feed-comment-body">
        <strong>{comment.authorName}</strong> <small><TimeAgo iso={comment.createdAt} /></small>
        {editing ? (
          <form className="feed-comment-edit" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Edit comment"
              autoFocus
            />
            <div className="feed-comment-edit-actions">
              <button type="button" className="text-button" onClick={cancelEdit}>Cancel</button>
              <button type="submit" className="text-button" disabled={!draft.trim()}>Save</button>
            </div>
          </form>
        ) : (
          <p>{comment.text}</p>
        )}
        {confirmingDelete && (
          <div className="feed-comment-confirm">
            <span>Delete this comment?</span>
            <button type="button" className="text-button" onClick={() => setConfirmingDelete(false)}>Cancel</button>
            <button type="button" className="text-button danger" onClick={() => { setConfirmingDelete(false); onDelete(); }}>Delete</button>
          </div>
        )}
      </div>

      {canManage && !editing && (
        <div className="payment-menu feed-comment-menu" ref={wrapRef}>
          <button
            className="icon-button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Comment actions"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="dots" size={16} />
          </button>
          {menuOpen && (
            <div className="payment-menu-pop" role="menu">
              <button role="menuitem" onClick={startEdit}>Edit comment</button>
              <button role="menuitem" className="danger" onClick={() => { setMenuOpen(false); setConfirmingDelete(true); }}>Delete comment</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
