"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/app/shared/ui";
import { AthleteProfileView } from "@/src/app/shared/athlete-profile-view";
import { useStarlete } from "@/src/app/store";
import type { Athlete, Achievement } from "@/src/app/data/athletes";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTOS,
  buildPhoto,
  movePhoto,
  removePhoto,
  addPhoto,
} from "@/src/app/lib/athlete-photos.mjs";
import {
  buildAchievement,
  deleteAchievement as deleteAchievementRecord,
  editAchievement as editAchievementRecord,
  markProudest,
  sortNewestFirst,
  validateAchievement,
  TITLE_MAX,
  EVENT_MAX,
  DESCRIPTION_MAX,
} from "@/src/app/lib/achievements.mjs";
import { commitDraft, draftErrors } from "@/src/app/lib/profile-draft.mjs";

type AchievementDraft = { title: string; event: string; date: string; description: string };
const emptyAchievement: AchievementDraft = { title: "", event: "", date: "", description: "" };

/** Read a File as a data URL (the demo's client-only "upload"). */
function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function EditProfileScreen() {
  const { role, mounted, currentAthlete, saveAthleteProfile } = useStarlete();
  const router = useRouter();

  // The DRAFT holds all unsaved edits. Nothing is written to the store until
  // "Save changes"; "Discard changes" resets the draft to the stored athlete.
  const [draft, setDraft] = useState<Athlete | null>(null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [achForm, setAchForm] = useState<AchievementDraft>(emptyAchievement);
  const [achErrors, setAchErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Seed the draft once from the stored athlete after hydration. This mirrors
  // external store state into local editing state (a legitimate sync), the same
  // pattern the store uses to hydrate from localStorage.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (mounted && role === "athlete" && currentAthlete && !draft) {
      setDraft(structuredClone(currentAthlete));
    }
  }, [mounted, role, currentAthlete, draft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (mounted && !role) router.replace("/login");
  }, [mounted, role, router]);

  // Warn before leaving (reload / close tab) with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const mutateDraft = useCallback((fn: (d: Athlete) => Athlete) => {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
  }, []);

  if (!role) return null;

  // Supporters keep the simple account form (no athlete profile to preview).
  if (role !== "athlete") {
    return <SupporterSettings />;
  }

  if (!draft) return null;

  // --- Validation (text fields; shared with the tested draft model) -------
  const errors = draftErrors(draft) as { name?: string; goal?: string };
  const goalError = errors.goal ?? null;
  const nameError = errors.name ?? null;
  const hasErrors = !!goalError || !!nameError;

  // --- Photos -------------------------------------------------------------
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ""; // allow re-selecting same file
    if (!file) return;
    // Validate BEFORE reading to give an immediate, clear error.
    let dataUrl: string;
    try {
      dataUrl = await readDataUrl(file);
    } catch {
      setPhotoError("Could not read the image.");
      return;
    }
    const built = buildPhoto({
      athleteId: draft.id,
      athleteName: draft.name,
      type: file.type,
      size: file.size,
      dataUrl,
      currentCount: draft.photos.length,
    }) as { ok: boolean; error?: string; photo?: Athlete["photos"][number] };
    if (!built.ok || !built.photo) {
      setPhotoError(built.error ?? "That image could not be added.");
      return;
    }
    const photo = built.photo;
    mutateDraft((d) => ({ ...d, photos: addPhoto(d.photos, photo) as Athlete["photos"] }));
  };

  const movePhotoBy = (index: number, dir: -1 | 1) =>
    mutateDraft((d) => ({ ...d, photos: movePhoto(d.photos, index, dir) as Athlete["photos"] }));
  const deletePhoto = (photoId: string) =>
    mutateDraft((d) => ({ ...d, photos: removePhoto(d.photos, photoId) as Athlete["photos"] }));

  // --- Achievements -------------------------------------------------------
  const submitAchievement = () => {
    if (editingId) {
      const result = validateAchievement(achForm) as { ok: boolean; errors?: Record<string, string>; fields?: Omit<Achievement, "id" | "isProudest"> };
      if (!result.ok || !result.fields) { setAchErrors(result.errors ?? {}); return; }
      const fields = result.fields;
      mutateDraft((d) => ({ ...d, achievements: editAchievementRecord(d.achievements, editingId, fields) as Achievement[] }));
    } else {
      const built = buildAchievement(draft.id, achForm) as { ok: boolean; errors?: Record<string, string>; achievement?: Achievement };
      if (!built.ok || !built.achievement) { setAchErrors(built.errors ?? {}); return; }
      const achievement = built.achievement;
      mutateDraft((d) => ({ ...d, achievements: [...d.achievements, achievement] }));
    }
    setAchForm(emptyAchievement);
    setAchErrors({});
    setEditingId(null);
  };

  const startEdit = (a: Achievement) => {
    setEditingId(a.id);
    setAchForm({ title: a.title, event: a.event, date: a.date, description: a.description });
    setAchErrors({});
  };
  const cancelEdit = () => { setEditingId(null); setAchForm(emptyAchievement); setAchErrors({}); };
  const deleteAch = (id: string) =>
    mutateDraft((d) => ({ ...d, achievements: deleteAchievementRecord(d.achievements, id) as Achievement[] }));
  const makeProudest = (id: string) =>
    mutateDraft((d) => ({ ...d, achievements: markProudest(d.achievements, id) as Achievement[] }));

  // --- Save / discard -----------------------------------------------------
  // The draft is a complete Athlete, so one atomic store write commits text,
  // photos (in order), and achievements together. `commitDraft` is the shared,
  // tested gate: it returns a patch ONLY when confirmed AND valid, else null —
  // so a Preview (unconfirmed) or an invalid draft never touches the store.
  const commit = () => {
    const patch = commitDraft(draft, true) as Parameters<typeof saveAthleteProfile>[1] | null;
    if (!patch) return false;
    saveAthleteProfile(draft.id, patch);
    setDirty(false);
    return true;
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (commit()) router.push(`/athletes/${draft.id}`);
  };

  const discard = () => {
    if (currentAthlete) setDraft(structuredClone(currentAthlete));
    setDirty(false);
    setPreview(false);
    setAchForm(emptyAchievement);
    setAchErrors({});
    setEditingId(null);
    setPhotoError(null);
  };

  const orderedAch = sortNewestFirst(draft.achievements) as Achievement[];

  // --- Preview mode -------------------------------------------------------
  if (preview) {
    return (
      <main className="profile-page preview-page">
        <div className="preview-bar">
          <span className="preview-flag"><Icon name="spark" size={16} /> Preview — unsaved changes</span>
          <div className="preview-actions">
            <button type="button" className="button secondary" onClick={() => setPreview(false)}>Back to editing</button>
            <button type="button" className="button" disabled={hasErrors} onClick={() => { if (commit()) router.push(`/athletes/${draft.id}`); }}>Save changes</button>
          </div>
        </div>
        <AthleteProfileView athlete={draft} preview isOwner />
      </main>
    );
  }

  return (
    <main className="settings page-shell">
      <div className="settings-head">
        <span className="eyebrow">Account settings</span>
        <h1>Edit your profile</h1>
        <p>Keep your information current for the Startlete community.{dirty && <strong className="unsaved-flag"> You have unsaved changes.</strong>}</p>
      </div>

      <div className="settings-card">
        <form onSubmit={save}>
          {/* Photos */}
          <fieldset className="editor-section">
            <legend>Photos <small>({draft.photos.length}/{MAX_PHOTOS}) · first photo is your profile picture</small></legend>
            {draft.photos.length === 0 ? (
              <p className="muted-line">No photos yet. Add one to set your profile picture.</p>
            ) : (
              <ul className="photo-manage-list">
                {draft.photos.map((p, i) => (
                  <li key={p.id} className="photo-manage-row">
                    <img src={p.src} alt={p.alt} />
                    {i === 0 && <span className="profile-pic-tag">Profile picture</span>}
                    <div className="photo-manage-actions">
                      <button type="button" className="icon-only" aria-label="Move left" disabled={i === 0} onClick={() => movePhotoBy(i, -1)}><Icon name="back" size={16} /></button>
                      <button type="button" className="icon-only" aria-label="Move right" disabled={i === draft.photos.length - 1} onClick={() => movePhotoBy(i, 1)}><Icon name="arrow" size={16} /></button>
                      <button type="button" className="icon-only danger" aria-label={`Delete photo ${i + 1}`} onClick={() => deletePhoto(p.id)}><Icon name="close" size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_PHOTO_TYPES.join(",")}
              className="sr-only"
              onChange={onPickPhoto}
            />
            <button
              type="button"
              className="button small secondary"
              disabled={draft.photos.length >= MAX_PHOTOS}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="plus" size={16} /> Add photo
            </button>
            {photoError && <small className="field-error" role="alert">{photoError}</small>}
          </fieldset>

          {/* Text fields */}
          <div className="field-row">
            <label>Full name
              <input value={draft.name} onChange={(e) => mutateDraft((d) => ({ ...d, name: e.target.value }))} aria-invalid={nameError ? true : undefined} />
              {nameError && <small className="field-error">{nameError}</small>}
            </label>
            <label>Location
              <input value={draft.location} onChange={(e) => mutateDraft((d) => ({ ...d, location: e.target.value }))} />
            </label>
          </div>
          <label>Bio<textarea value={draft.bio} onChange={(e) => mutateDraft((d) => ({ ...d, bio: e.target.value }))} /></label>
          <div className="field-row">
            <label>Sport<input value={draft.sport} onChange={(e) => mutateDraft((d) => ({ ...d, sport: e.target.value }))} /></label>
            <label>Funding goal (₱)
              <input type="number" min="1" step="1" inputMode="numeric" value={String(draft.goal)} onChange={(e) => mutateDraft((d) => ({ ...d, goal: Number(e.target.value) }))} aria-invalid={goalError ? true : undefined} />
              {goalError && <small className="field-error">{goalError}</small>}
            </label>
          </div>

          {/* Achievements */}
          <fieldset className="editor-section">
            <legend>Achievements <small>· mark one as your proudest</small></legend>
            {orderedAch.length === 0 ? (
              <p className="muted-line">No achievements yet.</p>
            ) : (
              <ul className="achievement-manage-list">
                {orderedAch.map((a) => (
                  <li key={a.id} className={a.isProudest ? "achievement-manage-row proudest" : "achievement-manage-row"}>
                    <div className="achievement-manage-main">
                      <strong>{a.title}{a.isProudest && <span className="proudest-tag"><Icon name="spark" size={12} /> Proudest</span>}</strong>
                      <small>{[a.event, a.date].filter(Boolean).join(" · ")}</small>
                      {a.description && <p>{a.description}</p>}
                    </div>
                    <div className="achievement-manage-actions">
                      {!a.isProudest && <button type="button" className="text-button" onClick={() => makeProudest(a.id)}>Mark proudest</button>}
                      <button type="button" className="text-button" onClick={() => startEdit(a)}>Edit</button>
                      <button type="button" className="text-button danger" onClick={() => deleteAch(a.id)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="achievement-form">
              <label>Title *
                <input value={achForm.title} maxLength={TITLE_MAX} onChange={(e) => setAchForm((f) => ({ ...f, title: e.target.value }))} aria-invalid={achErrors.title ? true : undefined} />
                {achErrors.title && <small className="field-error">{achErrors.title}</small>}
              </label>
              <div className="field-row">
                <label>Event / competition
                  <input value={achForm.event} maxLength={EVENT_MAX} onChange={(e) => setAchForm((f) => ({ ...f, event: e.target.value }))} />
                  {achErrors.event && <small className="field-error">{achErrors.event}</small>}
                </label>
                <label>Date or year
                  <input type="text" placeholder="2025 or 2025-06-01" value={achForm.date} onChange={(e) => setAchForm((f) => ({ ...f, date: e.target.value }))} aria-invalid={achErrors.date ? true : undefined} />
                  {achErrors.date && <small className="field-error">{achErrors.date}</small>}
                </label>
              </div>
              <label>Short description
                <textarea value={achForm.description} maxLength={DESCRIPTION_MAX} onChange={(e) => setAchForm((f) => ({ ...f, description: e.target.value }))} />
                {achErrors.description && <small className="field-error">{achErrors.description}</small>}
              </label>
              <div className="form-actions">
                {editingId && <button type="button" className="button small secondary" onClick={cancelEdit}>Cancel edit</button>}
                <button type="button" className="button small" onClick={submitAchievement}>{editingId ? "Update achievement" : "Add achievement"}</button>
              </div>
            </div>
          </fieldset>

          <div className="form-actions sticky-actions">
            <button type="button" className="button secondary" onClick={discard} disabled={!dirty}>Discard changes</button>
            <button type="button" className="button secondary" onClick={() => setPreview(true)}><Icon name="search" size={16} /> Preview</button>
            <button className="button" disabled={hasErrors}>Save changes</button>
          </div>
        </form>
      </div>
    </main>
  );
}

/** The original simple settings form for supporters (no athlete profile). */
function SupporterSettings() {
  const router = useRouter();
  return (
    <main className="settings page-shell">
      <div className="settings-head"><span className="eyebrow">Account settings</span><h1>Edit your profile</h1><p>Keep your information current for the Startlete community.</p></div>
      <div className="settings-card">
        <div className="profile-avatar">JD<button type="button"><Icon name="plus" size={16} /></button></div>
        <form onSubmit={(e) => { e.preventDefault(); router.push("/dashboard"); }}>
          <div className="field-row"><label>Full name<input defaultValue="Jamie Dela Cruz" /></label><label>Location<input defaultValue="Makati City" /></label></div>
          <label>Bio<textarea defaultValue="Proud supporter of Filipino athletes." /></label>
          <div className="form-actions"><button type="button" className="button secondary" onClick={() => router.push("/dashboard")}>Cancel</button><button className="button">Save changes</button></div>
        </form>
      </div>
    </main>
  );
}
