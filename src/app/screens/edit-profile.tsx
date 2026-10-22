"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";
import { getMyProfile, updateMyProfile, uploadMyProfilePicture } from "@/src/app/services/profile";
import { useSession } from "@/src/app/shared/session-provider";

export function EditProfileScreen() {
  const { role, athletes, mounted } = useStarlete();
  const { user, refresh } = useSession();
  const router = useRouter();
  const demoAthlete = athletes[0];
  const pictureInput = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(demoAthlete?.name ?? "");
  const [location, setLocation] = useState(demoAthlete?.location ?? "");
  const [bio, setBio] = useState(demoAthlete?.bio ?? "");
  const [sport, setSport] = useState(demoAthlete?.sport ?? "");
  const [achievement, setAchievement] = useState(demoAthlete?.achievement ?? "");
  const [goal, setGoal] = useState(String(demoAthlete?.goal ?? ""));
  const [profilePicture, setProfilePicture] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mounted && !role) router.replace("/login");
  }, [mounted, role, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getMyProfile()
      .then((profile) => {
        if (!active || !profile) return;
        setFullName([profile.firstName, profile.lastName].filter(Boolean).join(" ") || demoAthlete?.name || "");
        setLocation(profile.location);
        setBio(profile.bio);
        setSport(profile.sport);
        setAchievement(profile.achievement);
        setGoal(profile.fundingGoal == null ? "" : String(profile.fundingGoal));
        setProfilePicture(profile.profilePicture);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load your profile.");
      });
    return () => { active = false; };
  }, [demoAthlete?.name, user]);

  if (!role) return null;

  const athleteInitials = fullName.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();

  const goalValue = Number(goal);
  const goalError =
    role === "athlete" && (goal.trim() === "" || !Number.isFinite(goalValue) || goalValue <= 0)
      ? "Funding goal must be greater than zero."
      : null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (goalError) return; // block submit on an invalid goal
    setError(null);
    setSaving(true);
    const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);
    try {
      await updateMyProfile({
        firstName,
        lastName: lastNameParts.join(" "),
        bio,
        sport: role === "athlete" ? sport : undefined,
        location: role === "athlete" ? location : undefined,
        achievement: role === "athlete" ? achievement : undefined,
        fundingGoal: role === "athlete" ? goalValue : undefined,
      });
      await refresh();
      router.push("/dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
      setSaving(false);
    }
  };

  const choosePicture = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      setProfilePicture(await uploadMyProfilePicture(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload your profile picture.");
    } finally {
      setUploading(false);
      if (pictureInput.current) pictureInput.current.value = "";
    }
  };

  return (
    <main className="settings page-shell">
      <div className="settings-head"><span className="eyebrow">Account settings</span><h1>Edit your profile</h1><p>Keep your information current for the Startlete community.</p></div>
      <div className="settings-card">
        <div className="profile-avatar">
          {profilePicture && <img src={profilePicture} alt="Profile" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />}
          {!profilePicture && athleteInitials}
          <input ref={pictureInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { void choosePicture(event.target.files?.[0]); }} />
          <button type="button" aria-label="Change profile picture" disabled={uploading} onClick={() => pictureInput.current?.click()}><Icon name="plus" size={16} /></button>
        </div>
        <form onSubmit={save}>
          <label>Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
          {role === "athlete" && <div className="field-row"><label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label><label>Sport<input value={sport} onChange={(event) => setSport(event.target.value)} /></label></div>}
          <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} /></label>
          {role === "athlete" && <div className="field-row"><label>Achievement<input value={achievement} onChange={(event) => setAchievement(event.target.value)} /></label><label>Funding goal (₱)<input type="number" min="1" step="1" inputMode="numeric" value={goal} onChange={event => setGoal(event.target.value)} aria-invalid={goalError ? true : undefined} />{goalError && <small className="field-error">{goalError}</small>}</label></div>}
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="form-actions"><button type="button" className="button secondary" onClick={() => router.push("/dashboard")}>Cancel</button><button className="button" disabled={saving || uploading || !!goalError}>{saving ? "Saving…" : "Save changes"}</button></div>
        </form>
      </div>
    </main>
  );
}
