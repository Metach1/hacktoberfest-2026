/** Social-feed view models shared by the store and post components. */
import { athletes } from "@/src/app/data/athletes";

/** A supporter is represented by this sentinel id in the demo (no real users). */
export const SUPPORTER_ID = "supporter" as const;

/** Author of a like or comment: an athlete id, or the demo supporter. */
export type ActorId = number | typeof SUPPORTER_ID;

export interface Comment {
  id: string;
  /** Who wrote the comment. */
  authorId: ActorId;
  /** Supabase profile UUID when the comment has a registered author. */
  ownerId?: string;
  /** Display name shown with the comment. */
  authorName: string;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface Post {
  id: string;
  /** The athlete who authored the post. */
  authorAthleteId: number;
  /** Supabase user UUID for registered authors. */
  ownerId?: string;
  /** Supabase UUID used by the public athlete profile route. */
  authorProfileId?: string;
  authorName?: string;
  authorImage?: string;
  authorSport?: string;
  authorVerified?: boolean;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp of the last edit, if the post has been edited. */
  editedAt?: string;
  /** Total like count (derived from `likedBy`). */
  likes: number;
  /** Actor ids that have liked this post, used to toggle and prevent dupes. */
  likedBy: ActorId[];
  comments: Comment[];
}

/** Monotonic-ish ids for local notification records. */
let seq = 0;
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Resolve an athlete's display name/image for rendering a post header. */
export function postAuthor(authorAthleteId: number, post?: Post) {
  const athlete = athletes.find((a) => a.id === authorAthleteId);
  return {
    name: post?.authorName || athlete?.name || "Starlete athlete",
    image: post?.authorImage ?? athlete?.image ?? "",
    sport: post?.authorSport ?? athlete?.sport ?? "",
    verified: post?.authorVerified ?? athlete?.verified ?? false,
  };
}

/**
 * Human-friendly relative time for the demo (e.g. "3 days ago"), computed
 * against an explicit `now`. The caller supplies `now` so this stays pure and
 * never reads the clock during a static prerender (Next.js 16 Cache Components
 * rejects `Date.now()` in the client render path). Use the `TimeAgo` component
 * for UI, which defers the clock read to a post-mount effect.
 */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.round(day / 7);
  return `${wk} week${wk === 1 ? "" : "s"} ago`;
}

/** Stable absolute-date fallback shown during prerender / before hydration. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
