"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";
import { getMyProfile, updateMyProfile, uploadMyProfilePicture } from "@/src/app/services/profile";
import { useSession } from "@/src/app/shared/session-provider";
import { REGIONS, regionName } from "@/src/app/lib/regions";
import { provincesForRegion, citiesForProvince } from "@/src/app/lib/locations";

export function EditProfileScreen() {
  const { role, athletes, mounted } = useStarlete();
  const { user, refresh } = useSession();
  const router = useRouter();
  const demoAthlete = athletes[0];
  const pictureInput = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(demoAthlete?.name ?? "");
  // Location as cascading region -> province -> city, matching registration.
  // regionCode is the canonical code (dropdown value); province/city are scoped
  // to the choice above them.
  const [regionCode, setRegionCode] = useState(demoAthlete?.regionCode ?? "");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
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
        setRegionCode(profile.regionCode);
        setProvince(profile.province);
        setCity(profile.city);
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

  // Cascading location options + resets: a parent change clears its children so
  // a selection can never be inconsistent with the one above it.
  const provinceOptions = provincesForRegion(regionCode);
  const cityOptions = citiesForProvince(regionCode, province);
  const onRegionChange = (value: string) => { setRegionCode(value); setProvince(""); setCity(""); };
  const onProvinceChange = (value: string) => { setProvince(value); setCity(""); };

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
        regionCode: role === "athlete" ? regionCode || undefined : undefined,
        location: role === "athlete" ? regionName(regionCode) || undefined : undefined,
        province: role === "athlete" ? province || undefined : undefined,
        city: role === "athlete" ? city || undefined : undefined,
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
      await refresh();
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
          {role === "athlete" && <><div className="field-row"><label>Region<select value={regionCode} onChange={(event) => onRegionChange(event.target.value)}><option value="">Select your region…</option>{REGIONS.map(r => <option key={r.regionCode} value={r.regionCode}>{r.name}</option>)}</select></label><label>Sport<input value={sport} onChange={(event) => setSport(event.target.value)} /></label></div><div className="field-row"><label>Province<select disabled={!regionCode} value={province} onChange={(event) => onProvinceChange(event.target.value)}><option value="">{regionCode ? "Select your province…" : "Select a region first"}</option>{provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></label><label>City<select disabled={!province} value={city} onChange={(event) => setCity(event.target.value)}><option value="">{province ? "Select your city…" : "Select a province first"}</option>{cityOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></label></div></>}
          <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} /></label>
          {role === "athlete" && <div className="field-row"><label>Achievement<input value={achievement} onChange={(event) => setAchievement(event.target.value)} /></label><label>Funding goal (₱)<input type="number" min="1" step="1" inputMode="numeric" value={goal} onChange={event => setGoal(event.target.value)} aria-invalid={goalError ? true : undefined} />{goalError && <small className="field-error">{goalError}</small>}</label></div>}
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="form-actions"><button type="button" className="button secondary" onClick={() => router.push("/dashboard")}>Cancel</button><button className="button" disabled={saving || uploading || !!goalError}>{saving ? "Saving…" : "Save changes"}</button></div>
        </form>
      </div>
    </main>
  );
}
