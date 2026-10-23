"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/app/shared/ui";
import { AthleteProfileView } from "@/src/app/shared/athlete-profile-view";
import { useStarlete } from "@/src/app/store";
import { getMyProfile, updateMyProfile } from "@/src/app/services/profile";
import { useSession } from "@/src/app/shared/session-provider";
import { REGIONS, regionName } from "@/src/app/lib/regions";
import { provincesForRegion, citiesForProvince } from "@/src/app/lib/locations";
import { SPORTS } from "@/src/app/lib/sports";
import { Combobox } from "@/src/app/shared/combobox";
import type { Athlete, AthletePhoto, Achievement } from "@/src/app/data/athletes";
import {
  MAX_PHOTOS,
  ALLOWED_PHOTO_TYPES,
  validatePhotoUpload,
  buildPhoto,
  addPhoto,
  removePhoto,
  movePhoto,
  profilePhotoSrc,
} from "@/src/app/lib/athlete-photos.mjs";
import {
  buildAchievement,
  addAchievement,
  editAchievement,
  deleteAchievement,
  markProudest,
  sortNewestFirst,
  validateAchievement,
  TITLE_MAX,
  EVENT_MAX,
  DESCRIPTION_MAX,
} from "@/src/app/lib/achievements.mjs";
import { validateInstitution, INSTITUTION_MAX } from "@/src/app/lib/institution.mjs";

/** Field-level errors surfaced by the achievements sub-form. */
type AchievementErrors = Partial<Record<"title" | "event" | "date" | "description", string>>;

// The pure .mjs helpers carry JSDoc-inferred types where `ok` is `boolean`
// rather than a literal, so TS can't narrow their result unions on its own.
// These result shapes let us narrow explicitly after calling them.
type BuildPhotoResult = { ok: true; photo: AthletePhoto } | { ok: false; error: string };
type BuildAchievementResult = { ok: true; achievement: Achievement } | { ok: false; errors: AchievementErrors };
type ValidateAchievementResult =
  | { ok: true; fields: { title: string; event: string; date: string; description: string } }
  | { ok: false; errors: AchievementErrors };

export function EditProfileScreen() {
  const { role, athletes, mounted } = useStarlete();
  const { user, refresh } = useSession();
  const router = useRouter();
  const demoAthlete = athletes[0];
  const galleryInput = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(demoAthlete?.name ?? "");
  // Location as cascading region -> province -> city, matching registration.
  // regionCode is the canonical code (dropdown value); province/city are scoped
  // to the choice above them.
  const [regionCode, setRegionCode] = useState(demoAthlete?.regionCode ?? "");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState(demoAthlete?.bio ?? "");
  const [sport, setSport] = useState(demoAthlete?.sport ?? "");
  // The legacy single-line achievement string is no longer shown in the form
  // (the achievements list supersedes it), but we keep its loaded value and
  // pass it through save unchanged so no stored data is dropped.
  const [achievement, setAchievement] = useState(demoAthlete?.achievement ?? "");
  const [goal, setGoal] = useState(String(demoAthlete?.goal ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group B additions (athlete-only). Initialized from getMyProfile() in the
  // existing load effect so we never add a new setState-in-effect pattern.
  const [photos, setPhotos] = useState<AthletePhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [institution, setInstitution] = useState("");
  // Achievements add/edit sub-form (genuine input state).
  const [achTitle, setAchTitle] = useState("");
  const [achEvent, setAchEvent] = useState("");
  const [achDate, setAchDate] = useState("");
  const [achDescription, setAchDescription] = useState("");
  const [achErrors, setAchErrors] = useState<AchievementErrors>({});
  // Non-null when editing an existing achievement in place.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Live preview toggle (no persistence happens while previewing).
  const [previewing, setPreviewing] = useState(false);

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
        setPhotos(profile.photos);
        setAchievements(profile.achievements);
        setInstitution(profile.institution);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load your profile.");
      });
    return () => { active = false; };
  }, [demoAthlete?.name, user]);

  if (!role) return null;

  const goalValue = Number(goal);
  const goalError =
    role === "athlete" && (goal.trim() === "" || !Number.isFinite(goalValue) || goalValue <= 0)
      ? "Funding goal must be greater than zero."
      : null;

  // Institution is optional for existing athletes: only an error when a
  // non-blank value fails validation (e.g. too long). Blank never blocks save.
  const institutionCheck = validateInstitution(institution) as { ok: true; value: string } | { ok: false; error: string };
  const institutionError =
    role === "athlete" && institution.trim() !== "" && !institutionCheck.ok
      ? institutionCheck.error
      : null;

  // Cascading location options + resets: a parent change clears its children so
  // a selection can never be inconsistent with the one above it.
  const provinceOptions = provincesForRegion(regionCode);
  const cityOptions = citiesForProvince(regionCode, province);
  // Preserve a saved sport that predates (or isn't in) the canonical list.
  const sportOptions = sport && !SPORTS.includes(sport as (typeof SPORTS)[number])
    ? [sport, ...SPORTS]
    : [...SPORTS];
  const onRegionChange = (value: string) => { setRegionCode(value); setProvince(""); setCity(""); };
  const onProvinceChange = (value: string) => { setProvince(value); setCity(""); };

  // Derived (render-time) values for the gallery + preview.
  const photosFull = photos.length >= MAX_PHOTOS;
  const sortedAchievements = sortNewestFirst(achievements) as Achievement[];

  // Read one chosen file to a data URL, validate, build, and append.
  const readFileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Could not read the image."));
      reader.readAsDataURL(file);
    });

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoError(null);
    // Process sequentially so the per-athlete cap is respected across files,
    // using the latest list rather than a stale closure value.
    let current = photos;
    for (const file of Array.from(files)) {
      const check = validatePhotoUpload(file, current.length) as { ok: true } | { ok: false; error: string };
      if (!check.ok) {
        setPhotoError(check.error ?? "That image could not be added.");
        break;
      }
      try {
        const dataUrl = await readFileToDataUrl(file);
        const built = buildPhoto({
          athleteId: user?.id ?? demoAthlete?.id ?? "athlete",
          athleteName: fullName,
          type: file.type,
          size: file.size,
          dataUrl,
          currentCount: current.length,
        }) as BuildPhotoResult;
        if (!built.ok) {
          setPhotoError(built.error ?? "That image could not be added.");
          break;
        }
        current = addPhoto(current, built.photo) as AthletePhoto[];
      } catch (readError) {
        setPhotoError(readError instanceof Error ? readError.message : "Could not read the image.");
        break;
      }
    }
    setPhotos(current);
    if (galleryInput.current) galleryInput.current.value = "";
  };

  const onRemovePhoto = (id: string) => { setPhotos((list) => removePhoto(list, id) as AthletePhoto[]); };
  const onMovePhoto = (index: number, dir: -1 | 1) => { setPhotos((list) => movePhoto(list, index, dir) as AthletePhoto[]); };

  // Add a new achievement, or update the one being edited in place.
  const submitAchievement = () => {
    const athleteId = user?.id ?? demoAthlete?.id ?? "athlete";
    if (editingId) {
      const result = validateAchievement({
        title: achTitle,
        event: achEvent,
        date: achDate,
        description: achDescription,
      }) as ValidateAchievementResult;
      if (!result.ok) {
        setAchErrors(result.errors ?? {});
        return;
      }
      setAchievements((list) => editAchievement(list, editingId, result.fields) as Achievement[]);
    } else {
      const result = buildAchievement(athleteId, {
        title: achTitle,
        event: achEvent,
        date: achDate,
        description: achDescription,
      }) as BuildAchievementResult;
      if (!result.ok) {
        setAchErrors(result.errors ?? {});
        return;
      }
      setAchievements((list) => addAchievement(list, result.achievement) as Achievement[]);
    }
    setAchErrors({});
    setEditingId(null);
    setAchTitle("");
    setAchEvent("");
    setAchDate("");
    setAchDescription("");
  };

  const startEditAchievement = (a: Achievement) => {
    setEditingId(a.id);
    setAchTitle(a.title);
    setAchEvent(a.event ?? "");
    setAchDate(a.date ?? "");
    setAchDescription(a.description ?? "");
    setAchErrors({});
  };
  const cancelEditAchievement = () => {
    setEditingId(null);
    setAchTitle("");
    setAchEvent("");
    setAchDate("");
    setAchDescription("");
    setAchErrors({});
  };

  const onMarkProudest = (id: string) => { setAchievements((list) => markProudest(list, id) as Achievement[]); };
  const onDeleteAchievement = (id: string) => {
    setAchievements((list) => deleteAchievement(list, id) as Achievement[]);
    if (editingId === id) cancelEditAchievement();
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (goalError) return; // block submit on an invalid goal
    if (institutionError) return; // block only when a non-blank institution is invalid
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
        // Legacy single-line achievement value is preserved as-is (not editable
        // in the form anymore; the achievements list is the new surface).
        achievement: role === "athlete" ? achievement : undefined,
        fundingGoal: role === "athlete" ? goalValue : undefined,
        photos: role === "athlete" ? photos : undefined,
        achievements: role === "athlete" ? achievements : undefined,
        institution: role === "athlete" ? institution : undefined,
      });
      await refresh();
      router.push("/dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
      setSaving(false);
    }
  };

  // A complete Athlete assembled from the current form state, so the preview
  // renders through the SAME AthleteProfileView as the live profile (the two
  // can never drift). Nothing here is persisted — preview is read-only.
  const draftAthlete: Athlete = {
    id: -1,
    profileId: user?.id,
    name: fullName || "Your name",
    sport,
    location: [regionName(regionCode), province, city].filter(Boolean).join(" · "),
    regionCode,
    region: regionName(regionCode) ?? "",
    province,
    city,
    image: profilePhotoSrc(photos),
    raised: 0,
    goal: goalValue || 0,
    supporters: 0,
    verified: false,
    bio,
    achievement,
    photos,
    achievements,
    institution: institution.trim(),
  };

  // Athlete preview: the real athlete profile, rendered from the draft, under a
  // top bar to return to editing or save. Mirrors frontend-main.
  if (previewing && role === "athlete") {
    return (
      <main className="profile-page preview-page">
        <div className="preview-bar">
          <span className="preview-flag"><Icon name="spark" size={16} /> Preview — unsaved changes</span>
          <div className="preview-actions">
            <button type="button" className="button secondary" onClick={() => setPreviewing(false)}>Back to editing</button>
            <button type="button" className="button" disabled={!!goalError || !!institutionError || saving} onClick={(e) => { void save(e as unknown as FormEvent); }}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
        <AthleteProfileView athlete={draftAthlete} preview isOwner />
      </main>
    );
  }

  return (
    <main className="settings page-shell">
      <div className="settings-head"><span className="eyebrow">Account settings</span><h1>Edit your profile</h1><p>Keep your information current for the Startlete community.</p></div>
      <div className="settings-card">
        <form onSubmit={save}>
          {/* Athlete layout: Photos → name|institution → bio → region →
              province|city → sport|funding goal → Achievements. */}
          {role === "athlete" && (
            <fieldset className="editor-section">
              <legend>Photos <small>({photos.length}/{MAX_PHOTOS}) · first photo is your profile picture</small></legend>
              {photos.length === 0 ? (
                <p className="muted-line">No photos yet. Add one to set your profile picture.</p>
              ) : (
                <ul className="photo-manage-list">
                  {photos.map((photo, index) => (
                    <li key={photo.id} className="photo-manage-row">
                      <img src={photo.src} alt={photo.alt} />
                      {index === 0 && <span className="profile-pic-tag">Profile picture</span>}
                      <div className="photo-manage-actions">
                        <button type="button" className="icon-only" aria-label="Move left" disabled={index === 0} onClick={() => onMovePhoto(index, -1)}><Icon name="back" size={16} /></button>
                        <button type="button" className="icon-only" aria-label="Move right" disabled={index === photos.length - 1} onClick={() => onMovePhoto(index, 1)}><span style={{ display: "inline-flex", transform: "scaleX(-1)" }}><Icon name="back" size={16} /></span></button>
                        <button type="button" className="icon-only danger" aria-label={`Delete photo ${index + 1}`} onClick={() => onRemovePhoto(photo.id)}><Icon name="close" size={16} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={galleryInput}
                type="file"
                accept={ALLOWED_PHOTO_TYPES.join(",")}
                multiple
                className="sr-only"
                onChange={(event) => { void addPhotos(event.target.files); }}
              />
              <button
                type="button"
                className="button small secondary"
                disabled={photosFull}
                onClick={() => galleryInput.current?.click()}
              >
                <Icon name="plus" size={16} /> {photosFull ? `Maximum ${MAX_PHOTOS} photos` : "Add photo"}
              </button>
              {photoError && <small className="field-error" role="alert">{photoError}</small>}
            </fieldset>
          )}

          <div className="field-row">
            <label>Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
            {role === "athlete" && (
              <label>Institution
                <input value={institution} maxLength={INSTITUTION_MAX} placeholder="School, university, club, or team" onChange={(event) => setInstitution(event.target.value)} aria-invalid={institutionError ? true : undefined} />
                {institutionError && <small className="field-error">{institutionError}</small>}
              </label>
            )}
          </div>

          <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} /></label>

          {role === "athlete" && (
            <>
              <label>Region<Combobox options={REGIONS.map(r => ({ value: r.regionCode, label: r.name }))} value={regionCode} onChange={onRegionChange} ariaLabel="Region" placeholder="Type to search regions…" /></label>
              <div className="field-row">
                <label>Province<Combobox options={provinceOptions} value={province} onChange={onProvinceChange} disabled={!regionCode} ariaLabel="Province" placeholder={regionCode ? "Type to search provinces…" : "Select a region first"} /></label>
                <label>City/Municipality<Combobox options={cityOptions} value={city} onChange={setCity} disabled={!province} ariaLabel="City or municipality" placeholder={province ? "Type to search cities/municipalities…" : "Select a province first"} /></label>
              </div>
              <div className="field-row">
                <label>Sport<Combobox options={sportOptions} value={sport} onChange={setSport} ariaLabel="Sport" placeholder="Type to search sports…" /></label>
                <label>Funding goal (₱)<input type="number" min="1" step="1" inputMode="numeric" value={goal} onChange={event => setGoal(event.target.value)} aria-invalid={goalError ? true : undefined} />{goalError && <small className="field-error">{goalError}</small>}</label>
              </div>

              <fieldset className="editor-section">
                <legend>Achievements <small>· mark one as your proudest</small></legend>
                {sortedAchievements.length === 0 ? (
                  <p className="muted-line">No achievements yet.</p>
                ) : (
                  <ul className="achievement-manage-list">
                    {sortedAchievements.map((item) => (
                      <li key={item.id} className={item.isProudest ? "achievement-manage-row proudest" : "achievement-manage-row"}>
                        <div className="achievement-manage-main">
                          <strong>{item.title}{item.isProudest && <span className="proudest-tag"><Icon name="spark" size={12} /> Proudest</span>}</strong>
                          {(item.event || item.date) && <small>{[item.event, item.date].filter(Boolean).join(" · ")}</small>}
                          {item.description && <p>{item.description}</p>}
                        </div>
                        <div className="achievement-manage-actions">
                          {!item.isProudest && <button type="button" className="text-button" onClick={() => onMarkProudest(item.id)}>Mark proudest</button>}
                          <button type="button" className="text-button" onClick={() => startEditAchievement(item)}>Edit</button>
                          <button type="button" className="text-button danger" onClick={() => onDeleteAchievement(item.id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="achievement-form">
                  <label>Title *
                    <input value={achTitle} maxLength={TITLE_MAX} onChange={(event) => setAchTitle(event.target.value)} aria-invalid={achErrors.title ? true : undefined} />
                    {achErrors.title && <small className="field-error">{achErrors.title}</small>}
                  </label>
                  <div className="field-row">
                    <label>Event / competition
                      <input value={achEvent} maxLength={EVENT_MAX} onChange={(event) => setAchEvent(event.target.value)} aria-invalid={achErrors.event ? true : undefined} />
                      {achErrors.event && <small className="field-error">{achErrors.event}</small>}
                    </label>
                    <label>Date or year
                      <input type="text" placeholder="2025 or 2025-06-01" value={achDate} onChange={(event) => setAchDate(event.target.value)} aria-invalid={achErrors.date ? true : undefined} />
                      {achErrors.date && <small className="field-error">{achErrors.date}</small>}
                    </label>
                  </div>
                  <label>Short description
                    <textarea value={achDescription} maxLength={DESCRIPTION_MAX} onChange={(event) => setAchDescription(event.target.value)} aria-invalid={achErrors.description ? true : undefined} />
                    {achErrors.description && <small className="field-error">{achErrors.description}</small>}
                  </label>
                  <div className="form-actions">
                    {editingId && <button type="button" className="button small secondary" onClick={cancelEditAchievement}>Cancel edit</button>}
                    <button type="button" className="button small" onClick={submitAchievement}>{editingId ? "Update achievement" : "Add achievement"}</button>
                  </div>
                </div>
              </fieldset>
            </>
          )}

          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={() => router.push("/dashboard")}>Cancel</button>
            {role === "athlete" && <button type="button" className="button secondary" onClick={() => setPreviewing(true)}><Icon name="search" size={16} /> Preview</button>}
            <button className="button" disabled={saving || !!goalError || !!institutionError}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
