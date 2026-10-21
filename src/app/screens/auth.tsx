"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Logo } from "@/src/app/shared/ui";
import { useStarlete, type Role } from "@/src/app/store";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const { login } = useStarlete();
  const router = useRouter();
  const [role, setRole] = useState<Role>("supporter");
  const [birth, setBirth] = useState("");
  const [consent, setConsent] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const age = birth ? Math.floor((Date.now() - new Date(birth).getTime()) / 31557600000) : 99;
    if (role === "athlete" && age < 18 && !consent) return;
    login(role);
    router.push("/dashboard");
  };

  const showConsent = role === "athlete" && birth !== "" && new Date(birth) > new Date("2008-10-19");

  return (
    <main className="auth-page">
      <div className="auth-art"><Logo /><div><span className="eyebrow light">A community behind every dream</span><h1>{mode === "login" ? "Welcome back to your team." : "Your journey starts with people who believe."}</h1><p>Connect with the Filipino sports community and help turn potential into podiums.</p></div><small>© 2025 Startlete · Built for the Filipino athlete</small></div>
      <div className="auth-panel">
        <div className="auth-form"><span className="eyebrow">{mode === "login" ? "Welcome back" : "Join Startlete"}</span><h2>{mode === "login" ? "Log in to continue" : "Create your account"}</h2><p>{mode === "login" ? "Choose a demo role to explore the full experience." : "First, tell us how you want to be part of the community."}</p>
          <div className="role-switch"><button type="button" className={role === "supporter" ? "selected" : ""} onClick={() => setRole("supporter")}><Icon name="heart" /><span><b>Supporter</b><small>Discover and fund athletes</small></span></button><button type="button" className={role === "athlete" ? "selected" : ""} onClick={() => setRole("athlete")}><Icon name="spark" /><span><b>Athlete</b><small>Share your journey</small></span></button></div>
          <form onSubmit={submit}>
            {mode === "register" && <label>Full name<input required placeholder="Juan dela Cruz" /></label>}
            <label>Email address<input type="email" required defaultValue={mode === "login" ? (role === "supporter" ? "supporter@startlete.ph" : "athlete@startlete.ph") : ""} placeholder="you@example.com" /></label>
            <label>Password<input type="password" required defaultValue={mode === "login" ? "demo123" : ""} placeholder="At least 8 characters" /></label>
            {mode === "register" && role === "athlete" && <><div className="field-row"><label>Birth date<input type="date" required value={birth} onChange={e => setBirth(e.target.value)} /></label><label>Sport<select required><option>Track &amp; Field</option><option>Boxing</option><option>Basketball</option><option>Swimming</option></select></label></div><label>City / Province<input required placeholder="Cebu City" /></label>{showConsent && <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span><b>Parental consent confirmed</b><small>A parent or guardian has approved this simulated athlete profile.</small></span></label>}</>}
            <button className="button full" type="submit">{mode === "login" ? `Continue as ${role}` : "Create account"} <Icon name="arrow" /></button>
          </form>
          {mode === "login" && <div className="demo-note"><b>Demo account</b><span>Credentials are pre-filled. No real account is created.</span></div>}
          <p className="auth-switch">{mode === "login" ? "New to Startlete?" : "Already a member?"} <Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Log in"}</Link></p>
        </div>
      </div>
    </main>
  );
}
