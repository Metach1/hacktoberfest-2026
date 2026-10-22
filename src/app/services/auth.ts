"use client";

/**
 * Auth service — thin wrapper over Supabase Auth for the browser.
 *
 * Supabase manages password hashing, JWTs, refresh tokens, and session
 * persistence. We never handle raw passwords beyond passing them to Supabase,
 * and never touch the service-role key.
 */
import { createClient } from "@/src/app/lib/supabase/client";
import { regionName } from "@/src/app/lib/regions";

export type Role = "athlete" | "supporter";

export type SignUpInput =
  | { email: string; password: string; role: "supporter"; firstName?: string }
  | {
      email: string;
      password: string;
      role: "athlete";
      firstName?: string;
      sport: string;
      regionCode: string;
    };

/**
 * Create an account. The `role` and `first_name` are stored in the auth user's
 * metadata; a database trigger (`handle_new_user`) copies them into `profiles`
 * and creates the athlete profile with its selected region and sport.
 */
export async function signUp(input: SignUpInput) {
  const supabase = createClient();
  const { email, password, firstName } = input;
  const athleteMetadata =
    input.role === "athlete"
      ? (() => {
          const location = regionName(input.regionCode);
          if (!location) throw new Error("Please select a valid location.");
          return {
            sport: input.sport,
            region_code: input.regionCode,
            location,
          };
        })()
      : {};
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: input.role, first_name: firstName ?? null, ...athleteMetadata },
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
