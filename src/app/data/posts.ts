/**
 * Social feed data layer for the Starlete demo.
 *
 * Posts are authored by athletes; supporters (and athletes) can like and
 * comment. Everything is in-memory/localStorage only — there is no backend and
 * no real identities. See `data/README.md` for the fake-data safety rules.
 */
import { athletes } from "@/src/app/data/athletes";

/** A supporter is represented by this sentinel id in the demo (no real users). */
export const SUPPORTER_ID = "supporter" as const;

/** Author of a like or comment: an athlete id, or the demo supporter. */
export type ActorId = number | typeof SUPPORTER_ID;

export interface Comment {
  id: string;
  /** Who wrote the comment. */
  authorId: ActorId;
  /** Display name shown with the comment. */
  authorName: string;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface PostImage {
  id: string;
  alt: string;
  status: "approved" | "needs_review" | "rejected";
  reason?: string;
}

export interface Post {
  id: string;
  /** The athlete who authored the post. */
  authorAthleteId: number;
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
  /** Moderated server-uploaded images; older persisted posts omit this field. */
  images?: PostImage[];
}

/** Monotonic-ish id generator good enough for an in-memory demo. */
let seq = 0;
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * Seed feed. Two posts migrated from the previous `string[]` model plus a few
 * extra so the global feed looks alive on first load. Authors are spread across
 * the first athletes; dates are staggered into the past.
 */
function buildSeedPosts(): Post[] {
  const a = athletes;
  const day = 86_400_000;
  const now = Date.now();
  const seeds: Array<{ author: number; text: string; daysAgo: number; likes: number; comments: Array<[ActorId, string, string]> }> = [
    {
      author: a[0]?.id ?? 1,
      text: "One step closer to nationals — this week's time trial was a new personal best. Thank you for helping me access better recovery and coaching.",
      daysAgo: 3,
      likes: 86,
      comments: [
        [SUPPORTER_ID, "Jamie", "So proud of you! Keep flying 🇵🇭"],
        [a[1]?.id ?? 2, a[1]?.name ?? "A teammate", "Let's go! Inspiring work."],
      ],
    },
    {
      author: a[0]?.id ?? 1,
      text: "Recovery, reset, repeat. Rest days are part of the grind too.",
      daysAgo: 7,
      likes: 42,
      comments: [[SUPPORTER_ID, "Carlo M.", "Rest well, champ."]],
    },
    {
      author: a[1]?.id ?? 2,
      text: "Sparring went well today. Felt sharp and fast. Grateful for every supporter in my corner.",
      daysAgo: 1,
      likes: 58,
      comments: [],
    },
    {
      author: a[2]?.id ?? 3,
      text: "New shoes, new goals. Chasing a spot on the national team this season.",
      daysAgo: 5,
      likes: 73,
      comments: [[SUPPORTER_ID, "Nina A.", "Rooting for you!"]],
    },
  ];

  return seeds.map((s) => ({
    id: newId("post"),
    authorAthleteId: s.author,
    text: s.text,
    createdAt: new Date(now - s.daysAgo * day).toISOString(),
    likes: s.likes,
    likedBy: [],
    comments: s.comments.map(([authorId, authorName, text], i) => ({
      id: newId("cmt"),
      authorId,
      authorName,
      text,
      createdAt: new Date(now - s.daysAgo * day + (i + 1) * 3_600_000).toISOString(),
    })),
    images: [],
  }));
}

export const seedPosts: Post[] = buildSeedPosts();

/**
 * Migrate the legacy `string[]` post model to `Post[]`. Each legacy string is
 * attributed to the first athlete (the demo athlete account) with a staggered
 * date so order is stable.
 */
export function migrateLegacyPosts(legacy: string[]): Post[] {
  const firstAthleteId = athletes[0]?.id ?? 1;
  const now = Date.now();
  return legacy.map((text, i) => ({
    id: newId("post"),
    authorAthleteId: firstAthleteId,
    text,
    createdAt: new Date(now - i * 86_400_000).toISOString(),
    likes: 0,
    likedBy: [],
    comments: [],
    images: [],
  }));
}

/** Resolve an athlete's display name/image for rendering a post header. */
export function postAuthor(authorAthleteId: number) {
  const athlete = athletes.find((a) => a.id === authorAthleteId);
  return {
    name: athlete?.name ?? "Starlete athlete",
    image: athlete?.image ?? "",
    sport: athlete?.sport ?? "",
    verified: athlete?.verified ?? false,
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
