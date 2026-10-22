"use client";

/**
 * Feed data-access service (posts, comments, reactions) backed by Supabase.
 *
 * Reads are public (RLS allows select for everyone). Writes act as the
 * authenticated user and are constrained by RLS to rows the user owns:
 *   - a post is owned by its author (owner_id)
 *   - a comment / reaction is owned by the acting user
 * Seeded showcase posts (catalog_athlete_id, owner_id null) are read-only.
 *
 * Author resolution: a post is authored either by a real athlete user
 * (owner_id -> profiles/athlete_profiles) or a catalog showcase athlete
 * (catalog_athlete_id -> athletes). We resolve a display author for both.
 */
import { createClient } from "@/src/app/lib/supabase/client";

export interface FeedComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorName: string;
  authorImage: string;
  authorSport: string;
  authorVerified: boolean;
  /** Catalog athlete numeric id, when the author is a showcase athlete. */
  catalogAthleteId: number | null;
  /** Real owner's user id, when authored by a signed-up athlete. */
  ownerId: string | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
  likeCount: number;
  /** Whether the currently signed-in user has liked this post. */
  likedByMe: boolean;
  /** Whether the current user may edit/delete (is the owner). */
  canManage: boolean;
  comments: FeedComment[];
}

interface RawPost {
  id: string;
  owner_id: string | null;
  catalog_athlete_id: number | null;
  content: string;
  created_at: string;
  edited_at: string | null;
}

/**
 * Load the global feed, newest first, with author info, like counts, the
 * current user's like state, and comments. One batched set of queries rather
 * than N+1 per post.
 */
export async function getFeed(): Promise<FeedPost[]> {
  const supabase = createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, owner_id, catalog_athlete_id, content, created_at, edited_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rawPosts = (posts ?? []) as RawPost[];
  if (rawPosts.length === 0) return [];

  const postIds = rawPosts.map((p) => p.id);
  const catalogIds = [...new Set(rawPosts.map((p) => p.catalog_athlete_id).filter((v): v is number => v != null))];
  const ownerIds = [...new Set(rawPosts.map((p) => p.owner_id).filter((v): v is string => v != null))];

  // Who is the current user (for likedByMe / canManage)?
  const { data: auth } = await supabase.auth.getUser();
  const myId = auth.user?.id ?? null;

  // Batch-load catalog athletes, owner profiles, comments, and reactions.
  const [catalogRes, ownerRes, commentsRes, reactionsRes] = await Promise.all([
    catalogIds.length
      ? supabase.from("athletes").select("id, name, image, sport, verified").in("id", catalogIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length
      ? supabase
          .from("athlete_profiles")
          .select("user_id, sport, verified, profiles(first_name, profile_picture)")
          .in("user_id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("comments").select("id, post_id, author_name, content, created_at").in("post_id", postIds).order("created_at", { ascending: true }),
    supabase.from("reactions").select("post_id, owner_id").in("post_id", postIds),
  ]);

  const catalogById = new Map<number, { name: string; image: string; sport: string; verified: boolean }>();
  for (const a of (catalogRes.data ?? []) as Array<{ id: number; name: string; image: string; sport: string; verified: boolean }>) {
    catalogById.set(a.id, { name: a.name, image: a.image, sport: a.sport, verified: a.verified });
  }

  const ownerById = new Map<string, { name: string; image: string; sport: string; verified: boolean }>();
  // Supabase types a joined relation as an array; a to-one join still returns
  // (at most) one row, so read the first element defensively.
  type OwnerRow = {
    user_id: string;
    sport: string | null;
    verified: boolean;
    profiles: { first_name: string | null; profile_picture: string | null }[] | { first_name: string | null; profile_picture: string | null } | null;
  };
  for (const row of (ownerRes.data ?? []) as OwnerRow[]) {
    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    ownerById.set(row.user_id, {
      name: prof?.first_name ?? "Athlete",
      image: prof?.profile_picture ?? "",
      sport: row.sport ?? "",
      verified: row.verified ?? false,
    });
  }

  const commentsByPost = new Map<string, FeedComment[]>();
  for (const c of (commentsRes.data ?? []) as Array<{ id: string; post_id: string; author_name: string; content: string; created_at: string }>) {
    const list = commentsByPost.get(c.post_id) ?? [];
    list.push({ id: c.id, authorName: c.author_name, content: c.content, createdAt: c.created_at });
    commentsByPost.set(c.post_id, list);
  }

  const likeCountByPost = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const r of (reactionsRes.data ?? []) as Array<{ post_id: string; owner_id: string }>) {
    likeCountByPost.set(r.post_id, (likeCountByPost.get(r.post_id) ?? 0) + 1);
    if (myId && r.owner_id === myId) likedByMe.add(r.post_id);
  }

  return rawPosts.map((p) => {
    const author = p.catalog_athlete_id != null
      ? catalogById.get(p.catalog_athlete_id)
      : p.owner_id
        ? ownerById.get(p.owner_id)
        : undefined;
    return {
      id: p.id,
      authorName: author?.name ?? "Starlete athlete",
      authorImage: author?.image ?? "",
      authorSport: author?.sport ?? "",
      authorVerified: author?.verified ?? false,
      catalogAthleteId: p.catalog_athlete_id,
      ownerId: p.owner_id,
      content: p.content,
      createdAt: p.created_at,
      editedAt: p.edited_at,
      likeCount: likeCountByPost.get(p.id) ?? 0,
      likedByMe: likedByMe.has(p.id),
      canManage: Boolean(myId && p.owner_id === myId),
      comments: commentsByPost.get(p.id) ?? [],
    };
  });
}

/** Load the feed filtered to a single catalog (showcase) athlete's posts. */
export async function getPostsForCatalogAthlete(catalogAthleteId: number): Promise<FeedPost[]> {
  const all = await getFeed();
  return all.filter((p) => p.catalogAthleteId === catalogAthleteId);
}

/** Create a post authored by the current user (must be a signed-in athlete). */
export async function createPost(content: string): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You must be signed in to post.");
  const text = content.trim();
  if (!text) throw new Error("Post cannot be empty.");
  const { error } = await supabase.from("posts").insert({ owner_id: uid, content: text });
  if (error) throw error;
}

/** Edit a post's text. RLS ensures only the owner can. */
export async function editPost(postId: string, content: string): Promise<void> {
  const supabase = createClient();
  const text = content.trim();
  if (!text) throw new Error("Post cannot be empty.");
  const { error } = await supabase
    .from("posts")
    .update({ content: text, edited_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}

/** Delete a post. RLS ensures only the owner can. */
export async function deletePost(postId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

/** Add a comment as the current user. */
export async function addComment(postId: string, authorName: string, content: string): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You must be signed in to comment.");
  const text = content.trim();
  if (!text) return;
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, owner_id: uid, author_name: authorName, content: text });
  if (error) throw error;
}

/** Toggle the current user's like on a post. Returns the new liked state. */
export async function toggleLike(postId: string, currentlyLiked: boolean): Promise<boolean> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You must be signed in to like a post.");

  if (currentlyLiked) {
    const { error } = await supabase.from("reactions").delete().eq("post_id", postId).eq("owner_id", uid);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("reactions").insert({ post_id: postId, owner_id: uid });
  // Ignore unique-violation (already liked in another tab): treat as liked.
  if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
  return true;
}
