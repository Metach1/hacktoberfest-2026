"use client";

import { createClient } from "@/src/app/lib/supabase/client";
import { SUPPORTER_ID, type ActorId, type Comment, type Post } from "@/src/app/data/posts";

interface PostRow {
  id: string;
  owner_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
}

interface ProfileRow {
  id: string;
  role: "athlete" | "supporter";
  first_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
}

interface AthleteProfileRow {
  user_id: string;
  sport: string | null;
  verified: boolean;
}

interface CommentRow {
  id: string;
  post_id: string;
  owner_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface ReactionRow {
  post_id: string;
  owner_id: string;
}

interface PostAuthor {
  profile: ProfileRow;
  athlete?: AthleteProfileRow;
}

function displayName(profile: ProfileRow): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Athlete";
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("You must be signed in to interact with posts.");
  return data.user.id;
}

async function getPostAuthor(userId: string, requireAthlete = false): Promise<PostAuthor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, profile_picture")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Your profile could not be found.");

  const profile = data as ProfileRow;
  if (requireAthlete && profile.role !== "athlete") {
    throw new Error("Only athlete accounts can publish posts.");
  }

  if (profile.role !== "athlete") return { profile };
  const { data: athleteData, error: athleteError } = await supabase
    .from("athlete_profiles")
    .select("user_id, sport, verified")
    .eq("user_id", userId)
    .maybeSingle();
  if (athleteError) throw new Error(athleteError.message);
  return { profile, athlete: (athleteData as AthleteProfileRow | null) ?? undefined };
}

function toPost(
  row: PostRow,
  author: PostAuthor,
  comments: CommentRow[],
  reactions: ReactionRow[],
  currentUserId: string | null,
  actorId: ActorId,
): Post {
  const postComments: Comment[] = comments
    .filter((comment) => comment.post_id === row.id)
    .map((comment) => ({
      id: comment.id,
      authorId: comment.owner_id === currentUserId ? actorId : SUPPORTER_ID,
      ownerId: comment.owner_id,
      authorName: comment.author_name,
      text: comment.content,
      createdAt: comment.created_at,
    }));
  const postReactions = reactions.filter((reaction) => reaction.post_id === row.id);

  return {
    id: row.id,
    authorAthleteId: 0,
    ownerId: row.owner_id,
    authorProfileId: author.profile.id,
    authorName: displayName(author.profile),
    authorImage: author.profile.profile_picture ?? "",
    authorSport: author.athlete?.sport ?? "",
    authorVerified: author.athlete?.verified ?? false,
    text: row.content,
    createdAt: row.created_at,
    ...(row.edited_at ? { editedAt: row.edited_at } : {}),
    likes: postReactions.length,
    likedBy: currentUserId && postReactions.some((reaction) => reaction.owner_id === currentUserId)
      ? [actorId]
      : [],
    comments: postComments,
  };
}

/** Load the database feed and resolve its athlete authors and interactions. */
export async function listPosts(actorId: ActorId): Promise<Post[]> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const currentUserId = auth.user?.id ?? null;

  const { data, error } = await supabase
    .from("posts")
    .select("id, owner_id, content, created_at, edited_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const postRows = (data ?? []) as PostRow[];
  if (postRows.length === 0) return [];

  const postIds = postRows.map((post) => post.id);
  const ownerIds = [...new Set(postRows.map((post) => post.owner_id))];
  const [profilesResult, athleteProfilesResult, commentsResult, reactionsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, first_name, last_name, profile_picture")
      .in("id", ownerIds),
    supabase
      .from("athlete_profiles")
      .select("user_id, sport, verified")
      .in("user_id", ownerIds),
    supabase
      .from("comments")
      .select("id, post_id, owner_id, author_name, content, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("reactions")
      .select("post_id, owner_id")
      .in("post_id", postIds),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (athleteProfilesResult.error) throw new Error(athleteProfilesResult.error.message);
  if (commentsResult.error) throw new Error(commentsResult.error.message);
  if (reactionsResult.error) throw new Error(reactionsResult.error.message);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const athleteProfiles = (athleteProfilesResult.data ?? []) as AthleteProfileRow[];
  const comments = (commentsResult.data ?? []) as CommentRow[];
  const reactions = (reactionsResult.data ?? []) as ReactionRow[];
  const athleteById = new Map(athleteProfiles.map((profile) => [profile.user_id, profile]));
  const authorById = new Map(
    profiles.map((profile) => [
      profile.id,
      { profile, athlete: athleteById.get(profile.id) },
    ]),
  );

  return postRows.flatMap((row) => {
    const author = authorById.get(row.owner_id);
    return author ? [toPost(row, author, comments, reactions, currentUserId, actorId)] : [];
  });
}

/** Create a post owned by the authenticated athlete account. */
export async function createPost(text: string): Promise<Post> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const author = await getPostAuthor(userId, true);
  const { data, error } = await supabase
    .from("posts")
    .insert({ owner_id: userId, content: text })
    .select("id, owner_id, content, created_at, edited_at")
    .single();
  if (error) throw new Error(error.message);
  return toPost(data as PostRow, author, [], [], userId, 0);
}

/** Update an athlete-owned post and return its new text/timestamp. */
export async function updatePost(postId: string, text: string): Promise<void> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("posts")
    .update({ content: text, edited_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This post could not be found or you do not own it.");
}

/** Delete an athlete-owned post. */
export async function deletePost(postId: string): Promise<void> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This post could not be found or you do not own it.");
}

/** Toggle this user's persisted reaction and report whether it changed. */
export async function togglePostReaction(
  postId: string,
): Promise<{ added: boolean; removed: boolean }> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const { data: existingReaction, error: readError } = await supabase
    .from("reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  let added = false;
  let removed = false;

  if (existingReaction) {
    const { data, error } = await supabase
      .from("reactions")
      .delete()
      .eq("post_id", postId)
      .eq("owner_id", userId)
      .select("post_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    removed = Boolean(data);
  } else {
    const { data, error } = await supabase
      .from("reactions")
      .upsert(
        { post_id: postId, owner_id: userId },
        { onConflict: "post_id,owner_id", ignoreDuplicates: true },
      )
      .select("post_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    added = Boolean(data);
  }

  return { added, removed };
}

/** Save a comment under the authenticated user's profile. */
export async function createPostComment(
  postId: string,
  fallbackName: string,
  text: string,
  actorId: ActorId,
): Promise<Comment> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const { profile } = await getPostAuthor(userId);
  const authorName = displayName(profile) === "Athlete"
    ? fallbackName.trim() || "Community member"
    : displayName(profile);
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      owner_id: userId,
      author_name: authorName,
      content: text,
    })
    .select("id, post_id, owner_id, author_name, content, created_at")
    .single();
  if (error) throw new Error(error.message);

  const comment = data as CommentRow;
  return {
    id: comment.id,
    authorId: actorId,
    ownerId: comment.owner_id,
    authorName: comment.author_name,
    text: comment.content,
    createdAt: comment.created_at,
  };
}
