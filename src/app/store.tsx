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

export type Role = "supporter" | "athlete";

/**
 * Bumped whenever the shape or source of persisted athlete data changes. It
 * invalidates any athlete list cached in localStorage from an earlier version
 * (e.g. the legacy 5-profile hardcoded array) so returning visitors get the
 * current seed instead of stale data.
 */
const DATA_VERSION = "v2";

interface StarleteState {
  /** Whether client-side state has hydrated from localStorage. */
  mounted: boolean;
  /** The current demo role, or null when signed out. */
  role: Role | null;
  /** The live athlete list (funding totals mutate as donations complete). */
  athletes: Athlete[];
  /** Athlete-dashboard demo posts. */
  posts: string[];
  /** The athlete currently targeted by the donation modal, if open. */
  donationTarget: Athlete | null;

  login: (role: Role) => void;
  logout: () => void;
  getAthlete: (id: number) => Athlete | undefined;
  openDonation: (athlete: Athlete) => void;
  closeDonation: () => void;
  completeDonation: (athleteId: number, amount: number) => void;
  addPost: (post: string) => void;
}

const StarleteContext = createContext<StarleteState | null>(null);

export function StarleteProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>(seedAthletes);
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState(["One step closer to nationals", "Recovery, reset, repeat"]);
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
      setRole(savedRole ?? null);
      if (savedVersion === DATA_VERSION && savedAthletes) {
        setAthletes(JSON.parse(savedAthletes) as Athlete[]);
      } else {
        setAthletes(seedAthletes);
        window.localStorage.removeItem("starlete-athletes");
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
    } catch {
      // ignore
    }
  }, [athletes, mounted]);

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

  const addPost = useCallback((post: string) => setPosts((prev) => [post, ...prev]), []);

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
    }),
    [mounted, role, athletes, posts, donationTarget, login, logout, getAthlete, openDonation, closeDonation, completeDonation, addPost],
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
