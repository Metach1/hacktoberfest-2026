"use client";

/**
 * Auth service — thin wrapper over Supabase Auth for the browser.
 *
 * Supabase manages password hashing, JWTs, refresh tokens, and session
 * persistence. We never handle raw passwords beyond passing them to Supabase,
 * and never touch the service-role key.
 */
import { createClient } from "@/src/app/lib/supabase/client";

export type Role = "athlete" | "supporter";

export interface SignUpInput {
  email: string;
  password: string;
  role: Role;
  firstName?: string;
}

/**
 * Create an account. The `role` and `first_name` are stored in the auth user's
 * metadata; a database trigger (`handle_new_user`) copies them into the
 * `profiles` row on signup.
 */
export async function signUp({ email, password, role, firstName }: SignUpInput) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, first_name: firstName ?? null },
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
