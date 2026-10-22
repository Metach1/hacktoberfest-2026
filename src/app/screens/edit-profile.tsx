"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "@/src/app/shared/session-provider";
import { useAsync, ErrorState } from "@/src/app/shared/async-state";
import { getMyProfile, updateMyProfile, uploadMyProfilePicture } from "@/src/app/services/profile";
import { REGIONS, regionName } from "@/src/app/lib/regions";

export function EditProfileScreen() {
  const { role, user, loading: sessionLoading, refresh } = useSession();
  const router = useRouter();
  const profilePictureInput = useRef<HTMLInputElement>(null);

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
  const [regionCode, setRegionCode] = useState("");
  const [goal, setGoal] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [pictureSaved, setPictureSaved] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Populate the form once the profile loads (guard so edits aren't clobbered).
  // Syncing fetched data into local form state is a legitimate effect; the
  // `!seeded` guard makes it run once and not cascade.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (profile && !seeded) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setBio(profile.bio);
      setSport(profile.sport);
      setRegionCode(profile.regionCode);
      setGoal(profile.fundingGoal != null ? String(profile.fundingGoal) : "");
      setSeeded(true);
    }
  }, [profile, seeded]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => () => {
    if (profilePicturePreview.startsWith("blob:")) URL.revokeObjectURL(profilePicturePreview);
  }, [profilePicturePreview]);

  if (!user && !sessionLoading) return null;

  const isAthlete = role === "athlete";
  const goalValue = Number(goal);
  const goalError =
    isAthlete && goal.trim() !== "" && (!Number.isFinite(goalValue) || goalValue <= 0)
      ? "Funding goal must be greater than zero."
      : null;

  const initials = (firstName || user?.email || "?")
    .split(/[\s@.]+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const profilePicture = profilePicturePreview || profile?.profilePicture;

  const selectProfilePicture = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPictureError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPictureError("Profile pictures must be 5 MB or smaller.");
      return;
    }
    if (profilePicturePreview.startsWith("blob:")) URL.revokeObjectURL(profilePicturePreview);
    setProfilePictureFile(file);
    setProfilePicturePreview(URL.createObjectURL(file));
    setPictureError(null);
    setPictureSaved(false);
  };

  const uploadPicture = async () => {
    if (!profilePictureFile) return;
    setUploadingPicture(true);
    setPictureError(null);
    setPictureSaved(false);
    try {
      const imageUrl = await uploadMyProfilePicture(profilePictureFile);
      setProfilePicturePreview(imageUrl);
      setProfilePictureFile(null);
      setPictureSaved(true);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't upload your profile picture.";
      setPictureError(
        /bucket not found/i.test(message)
          ? "Profile photo storage is not set up. Ask your project administrator to apply supabase/migrations/0013_profile_picture_storage.sql in the Supabase SQL Editor, then try again."
          : message,
      );
    } finally {
      setUploadingPicture(false);
    }
  };

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
        regionCode: isAthlete ? (regionCode || undefined) : undefined,
        location: isAthlete ? (regionCode ? regionName(regionCode) ?? undefined : undefined) : undefined,
        fundingGoal: isAthlete ? (goal.trim() === "" ? null : goalValue) : undefined,
      });
      await refresh(); // update header display name
      router.push("/dashboard");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      // Always clear the saving flag. Client-side navigation can reuse this
      // mounted component, so a stale saving=true would leave the button
      // disabled ("Saving…") next time edit-profile is opened.
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
            <section className="profile-picture-section" aria-label="Profile picture">
              <div className="profile-avatar">
                {profilePicture
                  ? <Image src={profilePicture} alt="Profile picture preview" width={76} height={76} unoptimized />
                  : initials}
              </div>
              <div className="profile-picture-controls">
                <div>
                  <strong>Profile picture</strong>
                  <p className="profile-picture-help">Publicly visible. JPEG, PNG, or WebP, up to 5 MB.</p>
                </div>
                <input
                  ref={profilePictureInput}
                  className="profile-picture-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choose a profile picture"
                  onChange={(event) => selectProfilePicture(event.target.files?.[0])}
                />
                <div className="profile-picture-actions">
                  <button type="button" className="button secondary" onClick={() => profilePictureInput.current?.click()} disabled={uploadingPicture}>
                    Choose image
                  </button>
                  {profilePictureFile && (
                    <button type="button" className="button" onClick={uploadPicture} disabled={uploadingPicture}>
                      {uploadingPicture ? "Uploading…" : "Upload picture"}
                    </button>
                  )}
                </div>
                {profilePictureFile && <p className="profile-picture-status" role="status">Selected: {profilePictureFile.name}</p>}
                {pictureSaved && <p className="profile-picture-status" role="status">Profile picture updated.</p>}
                {pictureError && <p className="field-error" role="alert">{pictureError}</p>}
              </div>
            </section>
            <form onSubmit={save}>
              <div className="field-row">
                <label>First name<input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" /></label>
                <label>Last name<input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" /></label>
              </div>
              {isAthlete && (
                <div className="field-row">
                  <label>Region
                    <select value={regionCode} onChange={(e) => setRegionCode(e.target.value)}>
                      <option value="">Select a region…</option>
                      {REGIONS.map((r) => <option key={r.regionCode} value={r.regionCode}>{r.name}</option>)}
                    </select>
                  </label>
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
                <button className="button" disabled={!!goalError || saving || uploadingPicture}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
