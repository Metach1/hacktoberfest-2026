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
import type { User } from "@supabase/supabase-js";
import {
  createClient,
  isSupabaseConfigured,
} from "@/src/app/lib/supabase/client";
import { resolveDisplayName } from "@/src/app/lib/profile-display.mjs";

export type Role = "athlete" | "supporter";

interface SessionState {
  loading: boolean;
  user: User | null;
  role: Role | null;
  displayName: string | null;
  profilePicture: string | null;
  error: string | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setRole(null);
      setDisplayName(null);
      setProfilePicture(null);
      setError(null);
      return;
    }
    const supabase = createClient();
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("role, first_name, last_name, profile_picture")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setError(null);
    const metaRole = currentUser.user_metadata?.role as Role | undefined;
    const metaName = currentUser.user_metadata?.first_name as string | undefined;
    setRole((data?.role as Role | undefined) ?? metaRole ?? null);
    setDisplayName(resolveDisplayName(
      data?.first_name,
      data?.last_name,
      metaName || currentUser.email?.split("@")[0] || null,
    ));
    setProfilePicture((data?.profile_picture as string | null | undefined) ?? null);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    setError(null);
    setUser(data.user);
    await loadProfile(data.user);
  }, [loadProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!active) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      await loadProfile(currentUser);
      if (active) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setRole(null);
    setDisplayName(null);
    setProfilePicture(null);
    setError(null);
  }, []);

  const value = useMemo<SessionState>(
    () => ({ loading, user, role, displayName, profilePicture, error, signOut, refresh }),
    [loading, user, role, displayName, profilePicture, error, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within a SessionProvider");
  return context;
}
