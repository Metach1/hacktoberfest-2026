"use client";

/**
 * Real authentication/session state, backed by Supabase Auth.
 *
 * This is the source of truth for "who is signed in" and their role. It reads
 * the Supabase session on mount, subscribes to auth changes, and loads the
 * user's role from their `profiles` row. Screens should read auth state from
 * here (via `useSession`) rather than the legacy in-memory store.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/app/lib/supabase/client";

export type Role = "athlete" | "supporter";

interface SessionState {
  /** Whether the initial session + profile load has completed. */
  loading: boolean;
  /** The signed-in auth user, or null. */
  user: User | null;
  /** The user's role from their profile, or null when signed out. */
  role: Role | null;
  /** The user's display name (first name or email local part). */
  displayName: string | null;
  signOut: () => Promise<void>;
  /** Re-read the current session and profile (after sign in/up). */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setRole(null);
      setDisplayName(null);
      return;
    }
    const supabase = createClient();
    let { data } = await supabase
      .from("profiles")
      .select("role, first_name")
      .eq("id", currentUser.id)
      .maybeSingle();

    const metaRole = (currentUser.user_metadata?.role as Role | undefined) ?? null;
    const metaName = (currentUser.user_metadata?.first_name as string | undefined) ?? null;

    // Defensive backstop: if this user somehow has no profile row (e.g. an
    // account created before the signup trigger existed, or an imported user),
    // create one now so interactions that FK to profiles don't fail. New
    // signups normally get their row from the handle_new_user() trigger.
    if (!data) {
      const { data: created } = await supabase
        .from("profiles")
        .insert({ id: currentUser.id, role: metaRole ?? "supporter", first_name: metaName })
        .select("role, first_name")
        .maybeSingle();
      if (created) data = created;
    }

    setRole((data?.role as Role | undefined) ?? metaRole);
    setDisplayName(
      data?.first_name ??
        metaName ??
        currentUser.email?.split("@")[0] ??
        null,
    );
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    await loadProfile(data.user);
  }, [loadProfile]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user);
      await loadProfile(data.user);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setDisplayName(null);
  }, []);

  const value = useMemo<SessionState>(
    () => ({ loading, user, role, displayName, signOut, refresh }),
    [loading, user, role, displayName, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
