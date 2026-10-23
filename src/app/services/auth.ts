"use client";

import { createClient } from "@/src/app/lib/supabase/client";

export type Role = "athlete" | "supporter";

interface SignUpInput {
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  sport?: string;
  /** Canonical region code (e.g. "NCR", "Region XI"); stored as region_code. */
  regionCode?: string;
  /** Human-readable region/location label stored alongside the code. */
  location?: string;
  /** Province within the chosen region; stored as province. */
  province?: string;
  /** City/municipality within the chosen province; stored as city. */
  city?: string;
}

export async function signUp({ email, password, role, firstName, lastName, sport, regionCode, location, province, city }: SignUpInput) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        first_name: firstName ?? null,
        last_name: lastName ?? null,
        sport: role === "athlete" ? sport ?? null : null,
        // The registration trigger reads region_code and location separately
        // (see handle_new_user). Send the canonical code so Discover's
        // region filtering works, plus the readable name as the location.
        region_code: role === "athlete" ? regionCode ?? null : null,
        location: role === "athlete" ? location ?? null : null,
        province: role === "athlete" ? province ?? null : null,
        city: role === "athlete" ? city ?? null : null,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
