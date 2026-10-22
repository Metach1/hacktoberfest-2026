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
  location?: string;
}

export async function signUp({ email, password, role, firstName, lastName, sport, location }: SignUpInput) {
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
        location: role === "athlete" ? location ?? null : null,
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
