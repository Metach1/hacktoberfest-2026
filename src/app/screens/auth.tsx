"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Logo } from "@/src/app/shared/ui";
import { signIn, signUp, type Role } from "@/src/app/services/auth";
import { useSession } from "@/src/app/shared/session-provider";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { refresh } = useSession();

  const [role, setRole] = useState<Role>("supporter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birth, setBirth] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showConsent = role === "athlete" && birth !== "" && new Date(birth) > new Date("2008-10-19");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Keep the existing minor-consent guard for athletes.
    if (mode === "register" && role === "athlete") {
      const age = birth ? Math.floor((Date.now() - new Date(birth).getTime()) / 31557600000) : 99;
      if (age < 18 && !consent) {
        setError("A parent or guardian must confirm consent for athletes under 18.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        await signUp({ email, password, role, firstName: fullName.split(" ")[0] || undefined });
      } else {
        await signIn(email, password);
      }
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-art"><Logo /><div><span className="eyebrow light">A community behind every dream</span><h1>{mode === "login" ? "Welcome back to your team." : "Your journey starts with people who believe."}</h1><p>Connect with the Filipino sports community and help turn potential into podiums.</p></div><small>© 2025 Startlete · Built for the Filipino athlete</small></div>
      <div className="auth-panel">
        <div className="auth-form"><span className="eyebrow">{mode === "login" ? "Welcome back" : "Join Startlete"}</span><h2>{mode === "login" ? "Log in to continue" : "Create your account"}</h2><p>{mode === "login" ? "Sign in with your email and password." : "First, tell us how you want to be part of the community."}</p>
          {mode === "register" && (
            <div className="role-switch"><button type="button" className={role === "supporter" ? "selected" : ""} onClick={() => setRole("supporter")}><Icon name="heart" /><span><b>Supporter</b><small>Discover and fund athletes</small></span></button><button type="button" className={role === "athlete" ? "selected" : ""} onClick={() => setRole("athlete")}><Icon name="spark" /><span><b>Athlete</b><small>Share your journey</small></span></button></div>
          )}
          <form onSubmit={submit}>
            {mode === "register" && <label>Full name<input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan dela Cruz" /></label>}
            <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            {mode === "register" && role === "athlete" && <><div className="field-row"><label>Birth date<input type="date" required value={birth} onChange={e => setBirth(e.target.value)} /></label><label>Sport<select required><option>Track &amp; Field</option><option>Boxing</option><option>Basketball</option><option>Swimming</option></select></label></div><label>City / Province<input required placeholder="Cebu City" /></label>{showConsent && <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span><b>Parental consent confirmed</b><small>A parent or guardian has approved this athlete profile.</small></span></label>}</>}
            {error && <p className="field-error" role="alert">{error}</p>}
            <button className="button full" type="submit" disabled={submitting}>{submitting ? "Please wait…" : mode === "login" ? `Log in` : "Create account"} <Icon name="arrow" /></button>
          </form>
          <p className="auth-switch">{mode === "login" ? "New to Startlete?" : "Already a member?"} <Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Log in"}</Link></p>
        </div>
      </div>
    </main>
  );
}
