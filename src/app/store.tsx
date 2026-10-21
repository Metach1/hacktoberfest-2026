"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  athletes as seedAthletes,
  type Athlete,
} from "@/src/app/data/athletes";
import {
  seedPosts,
  newId,
  SUPPORTER_ID,
  type Post,
  type ActorId,
} from "@/src/app/data/posts";

export type Role = "supporter" | "athlete";

/**
 * Bumped whenever the shape or source of persisted athlete data changes. It
 * invalidates any athlete list cached in localStorage from an earlier version
 * (e.g. the legacy 5-profile hardcoded array) so returning visitors get the
 * current seed instead of stale data.
 *
 * v3: posts moved from a flat `string[]` to structured `Post[]` objects with
 * likes and comments.
 */
const DATA_VERSION = "v3";

interface StarleteState {
  /** Whether client-side state has hydrated from localStorage. */
  mounted: boolean;
  /** The current demo role, or null when signed out. */
  role: Role | null;
  /** The live athlete list (funding totals mutate as donations complete). */
  athletes: Athlete[];
  /** Social feed posts (athlete-authored, with likes and comments). */
  posts: Post[];
  /** The athlete currently targeted by the donation modal, if open. */
  donationTarget: Athlete | null;

  login: (role: Role) => void;
  logout: () => void;
  getAthlete: (id: number) => Athlete | undefined;
  openDonation: (athlete: Athlete) => void;
  closeDonation: () => void;
  completeDonation: (athleteId: number, amount: number) => void;
  /** Publish a new post authored by the given athlete. */
  addPost: (authorAthleteId: number, text: string) => void;
  /** Toggle a like on a post for the current actor (supporter or athlete). */
  toggleLike: (postId: string, actorId: ActorId) => void;
  /** Add a comment to a post. */
  addComment: (postId: string, authorId: ActorId, authorName: string, text: string) => void;
}

/** The id for the current actor, used for likes/comments in the demo. */
export function actorIdForRole(role: Role | null, athletes: Athlete[]): ActorId {
  return role === "athlete" ? athletes[0]?.id ?? SUPPORTER_ID : SUPPORTER_ID;
}

const StarleteContext = createContext<StarleteState | null>(null);

export function StarleteProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>(seedAthletes);
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [donationTarget, setDonationTarget] = useState<Athlete | null>(null);

  // Hydrate persisted state from localStorage once on client mount. Reading
  // localStorage during render/SSR is unsafe, so this runs in an effect and
  // synchronizes the browser-only external store into React state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const savedRole = window.localStorage.getItem("starlete-role") as Role | null;
      const savedVersion = window.localStorage.getItem("starlete-data-version");
      const savedAthletes = window.localStorage.getItem("starlete-athletes");
      const savedPosts = window.localStorage.getItem("starlete-posts");
      setRole(savedRole ?? null);
      if (savedVersion === DATA_VERSION && savedAthletes) {
        setAthletes(JSON.parse(savedAthletes) as Athlete[]);
        if (savedPosts) setPosts(JSON.parse(savedPosts) as Post[]);
      } else {
        // Version bump (or first visit): reset to current seeds and drop stale
        // caches, including the legacy string[] posts from before v3.
        setAthletes(seedAthletes);
        setPosts(seedPosts);
        window.localStorage.removeItem("starlete-athletes");
        window.localStorage.removeItem("starlete-posts");
        window.localStorage.setItem("starlete-data-version", DATA_VERSION);
      }
    } catch {
      // ignore unavailable/corrupt storage
    } finally {
      setMounted(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem("starlete-data-version", DATA_VERSION);
      window.localStorage.setItem("starlete-athletes", JSON.stringify(athletes));
      window.localStorage.setItem("starlete-posts", JSON.stringify(posts));
    } catch {
      // ignore
    }
  }, [athletes, posts, mounted]);

  const login = useCallback((nextRole: Role) => {
    setRole(nextRole);
    try { window.localStorage.setItem("starlete-role", nextRole); } catch {}
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    try { window.localStorage.removeItem("starlete-role"); } catch {}
  }, []);

  const getAthlete = useCallback(
    (id: number) => athletes.find((a) => a.id === id),
    [athletes],
  );

  const openDonation = useCallback((athlete: Athlete) => setDonationTarget(athlete), []);
  const closeDonation = useCallback(() => setDonationTarget(null), []);

  const completeDonation = useCallback((athleteId: number, amount: number) => {
    setAthletes((list) =>
      list.map((a) =>
        a.id === athleteId
          ? { ...a, raised: a.raised + amount, supporters: a.supporters + 1 }
          : a,
      ),
    );
  }, []);

  const addPost = useCallback((authorAthleteId: number, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const post: Post = {
      id: newId("post"),
      authorAthleteId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      comments: [],
    };
    setPosts((prev) => [post, ...prev]);
  }, []);

  const toggleLike = useCallback((postId: string, actorId: ActorId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = p.likedBy.includes(actorId);
        const likedBy = liked
          ? p.likedBy.filter((id) => id !== actorId)
          : [...p.likedBy, actorId];
        return { ...p, likedBy, likes: p.likes + (liked ? -1 : 1) };
      }),
    );
  }, []);

  const addComment = useCallback(
    (postId: string, authorId: ActorId, authorName: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [
                  ...p.comments,
                  {
                    id: newId("cmt"),
                    authorId,
                    authorName,
                    text: trimmed,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : p,
        ),
      );
    },
    [],
  );

  const value = useMemo<StarleteState>(
    () => ({
      mounted,
      role,
      athletes,
      posts,
      donationTarget,
      login,
      logout,
      getAthlete,
      openDonation,
      closeDonation,
      completeDonation,
      addPost,
      toggleLike,
      addComment,
    }),
    [mounted, role, athletes, posts, donationTarget, login, logout, getAthlete, openDonation, closeDonation, completeDonation, addPost, toggleLike, addComment],
  );

  return <StarleteContext.Provider value={value}>{children}</StarleteContext.Provider>;
}

export function useStarlete(): StarleteState {
  const ctx = useContext(StarleteContext);
  if (!ctx) {
    throw new Error("useStarlete must be used within a StarleteProvider");
  }
  return ctx;
}
