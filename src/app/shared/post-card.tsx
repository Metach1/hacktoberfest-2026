"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/src/app/shared/ui";
import { TimeAgo } from "@/src/app/shared/time-ago";
import { useStarlete, actorIdForRole } from "@/src/app/store";
import { postAuthor, type Post } from "@/src/app/data/posts";
import { useSession } from "@/src/app/shared/session-provider";

/**
 * A single feed post with author header, like toggle, and a comment thread.
 * Reads interaction state/actions from the store so it works identically on the
 * global feed and on athlete profiles.
 *
 * `showAuthor` can be turned off on an athlete's own profile where every post
 * shares the same author shown in the page header.
 */
export function PostCard({ post, showAuthor = true }: { post: Post; showAuthor?: boolean }) {
  const { role, athletes, toggleLike, addComment } = useStarlete();
  const { displayName } = useSession();
  const actorId = actorIdForRole(role, athletes);
  const author = postAuthor(post.authorAthleteId, post);

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  const liked = post.likedBy.includes(actorId);
  const actorName = displayName || (role === "athlete" ? athletes[0]?.name ?? "Athlete" : "A supporter");

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
          <Icon name="heart" size={18} /> {post.likes} {post.likes === 1 ? "like" : "likes"}
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
            <div className="feed-comment" key={c.id}>
              <span className="feed-comment-avatar" aria-hidden="true">{c.authorName.charAt(0)}</span>
              <div>
                <strong>{c.authorName}</strong> <small><TimeAgo iso={c.createdAt} /></small>
                <p>{c.text}</p>
              </div>
            </div>
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
