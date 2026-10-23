"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Logo } from "@/src/app/shared/ui";
import { signIn, signUp, type Role } from "@/src/app/services/auth";
import { useSession } from "@/src/app/shared/session-provider";
import { useStarlete } from "@/src/app/store";
import { REGIONS, regionName } from "@/src/app/lib/regions";
import { provincesForRegion, citiesForProvince } from "@/src/app/lib/locations";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { refresh, error: sessionError } = useSession();
  const { login } = useStarlete();
  const [role, setRole] = useState<Role>("supporter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sport, setSport] = useState("Track & Field");
  // Athlete registration location, chosen via cascading dropdowns. regionCode is
  // the canonical code (the region dropdown value); province/city are scoped to
  // the choice above them. Changing a parent resets its children (see handlers).
  const [regionCode, setRegionCode] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [birth, setBirth] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (mode !== "login") return;
    try {
      const savedEmail = window.sessionStorage.getItem("starlete-login-email");
      if (savedEmail) setEmail(savedEmail);
    } catch {
      // Email persistence is optional when browser storage is unavailable.
    }
  }, [mode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateEmail = (value: string) => {
    setEmail(value);
    if (mode !== "login") return;
    try {
      window.sessionStorage.setItem("starlete-login-email", value);
    } catch {
      // Keep the form usable when browser storage is unavailable.
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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
        const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);
        await signUp({
          email,
          password,
          role,
          firstName: firstName || undefined,
          lastName: lastNameParts.join(" ") || undefined,
          sport,
          regionCode: regionCode || undefined,
          location: regionName(regionCode) || undefined,
          province: province || undefined,
          city: city || undefined,
        });
        login(role);
      } else {
        const { user } = await signIn(email, password);
        const accountRole = user.user_metadata?.role;
        if (accountRole === "athlete" || accountRole === "supporter") login(accountRole);
        setPassword("");
      }
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(
        mode === "login" && /invalid login credentials/i.test(message)
          ? "Email or password is incorrect. Please try again."
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showConsent = role === "athlete" && birth !== "" && new Date(birth) > new Date("2008-10-19");

  // Cascading location options + resets: a parent change clears its children so
  // a selection can never be inconsistent with the one above it.
  const provinceOptions = provincesForRegion(regionCode);
  const cityOptions = citiesForProvince(regionCode, province);
  const onRegionChange = (value: string) => { setRegionCode(value); setProvince(""); setCity(""); };
  const onProvinceChange = (value: string) => { setProvince(value); setCity(""); };

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
            <label>Email address<input type="email" required autoComplete="email" value={email} onChange={e => updateEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            {mode === "register" && role === "athlete" && <><div className="field-row"><label>Birth date<input type="date" required value={birth} onChange={e => setBirth(e.target.value)} /></label><label>Sport<select required value={sport} onChange={e => setSport(e.target.value)}><option>Track &amp; Field</option><option>Boxing</option><option>Basketball</option><option>Swimming</option></select></label></div><label>Region<select required value={regionCode} onChange={e => onRegionChange(e.target.value)}><option value="" disabled>Select your region…</option>{REGIONS.map(r => <option key={r.regionCode} value={r.regionCode}>{r.name}</option>)}</select></label><div className="field-row"><label>Province<select required disabled={!regionCode} value={province} onChange={e => onProvinceChange(e.target.value)}><option value="" disabled>{regionCode ? "Select your province…" : "Select a region first"}</option>{provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></label><label>City<select required disabled={!province} value={city} onChange={e => setCity(e.target.value)}><option value="" disabled>{province ? "Select your city…" : "Select a province first"}</option>{cityOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></label></div>{showConsent && <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span><b>Parental consent confirmed</b><small>A parent or guardian has approved this simulated athlete profile.</small></span></label>}</>}
            {(error || sessionError) && (
              <div className="auth-error" role="alert" aria-live="assertive">
                <span className="auth-error-icon" aria-hidden="true">!</span>
                <span>{error || sessionError}</span>
              </div>
            )}
            <button className="button full" type="submit" disabled={submitting}>{submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"} <Icon name="arrow" /></button>
          </form>
          <p className="auth-switch">{mode === "login" ? "New to Startlete?" : "Already a member?"} <Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Log in"}</Link></p>
        </div>
      </div>
    </main>
  );
}
