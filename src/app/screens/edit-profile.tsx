"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/app/shared/ui";
import { useSession } from "@/src/app/shared/session-provider";
import { useAsync, ErrorState } from "@/src/app/shared/async-state";
import { getMyProfile, updateMyProfile } from "@/src/app/services/profile";

export function EditProfileScreen() {
  const { role, user, loading: sessionLoading, refresh } = useSession();
  const router = useRouter();

  // Redirect out once hydration settles and there's no session.
  useEffect(() => {
    if (!sessionLoading && !user) router.replace("/login");
  }, [sessionLoading, user, router]);

  const { data: profile, loading, error, reload } = useAsync(() => getMyProfile(), [user?.id]);

  // Local editable form state, seeded from the loaded profile.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");
  const [goal, setGoal] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Populate the form once the profile loads (guard so edits aren't clobbered).
  useEffect(() => {
    if (profile && !seeded) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setBio(profile.bio);
      setSport(profile.sport);
      setLocation(profile.location);
      setGoal(profile.fundingGoal != null ? String(profile.fundingGoal) : "");
      setSeeded(true);
    }
  }, [profile, seeded]);

  if (!user && !sessionLoading) return null;

  const isAthlete = role === "athlete";
  const goalValue = Number(goal);
  const goalError =
    isAthlete && goal.trim() !== "" && (!Number.isFinite(goalValue) || goalValue <= 0)
      ? "Funding goal must be greater than zero."
      : null;

  const initials = (firstName || user?.email || "?")
    .split(/[\s@.]+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (goalError) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateMyProfile({
        firstName,
        lastName,
        bio,
        sport: isAthlete ? sport : undefined,
        location: isAthlete ? location : undefined,
        fundingGoal: isAthlete ? (goal.trim() === "" ? null : goalValue) : undefined,
      });
      await refresh(); // update header display name
      router.push("/dashboard");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your profile.");
      setSaving(false);
    }
  };

  return (
    <main className="settings page-shell">
      <div className="settings-head"><span className="eyebrow">Account settings</span><h1>Edit your profile</h1><p>Keep your information current for the Startlete community.</p></div>
      <div className="settings-card">
        {loading && <div className="empty"><h3>Loading your profile…</h3></div>}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && (
          <>
            <div className="profile-avatar">{initials}<button type="button"><Icon name="plus" size={16} /></button></div>
            <form onSubmit={save}>
              <div className="field-row">
                <label>First name<input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" /></label>
                <label>Last name<input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" /></label>
              </div>
              {isAthlete && (
                <div className="field-row">
                  <label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City / Province" /></label>
                </div>
              )}
              <label>Bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={isAthlete ? "Tell supporters about your journey." : "Tell the community about yourself."} /></label>
              {isAthlete && (
                <div className="field-row">
                  <label>Sport<input value={sport} onChange={(e) => setSport(e.target.value)} placeholder="e.g. Track & Field" /></label>
                  <label>Funding goal (₱)<input type="number" min="1" step="1" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} aria-invalid={goalError ? true : undefined} placeholder="e.g. 80000" />{goalError && <small className="field-error">{goalError}</small>}</label>
                </div>
              )}
              {saveError && <p className="field-error" role="alert">{saveError}</p>}
              <div className="form-actions">
                <button type="button" className="button secondary" onClick={() => router.push("/dashboard")}>Cancel</button>
                <button className="button" disabled={!!goalError || saving}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
