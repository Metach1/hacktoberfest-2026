"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  athletes as seedAthletes,
  type Athlete,
  type AthletePhoto,
  type Achievement,
} from "@/src/app/data/athletes";
import {
  addPhoto as addPhotoRecord,
  buildPhoto,
  movePhoto as movePhotoRecord,
  profilePhotoSrc,
  removePhoto as removePhotoRecord,
  PHOTO_PLACEHOLDER,
} from "@/src/app/lib/athlete-photos.mjs";
import {
  addAchievement as addAchievementRecord,
  buildAchievement,
  deleteAchievement as deleteAchievementRecord,
  editAchievement as editAchievementRecord,
  markProudest as markProudestRecord,
  proudestAchievement,
  validateAchievement,
} from "@/src/app/lib/achievements.mjs";
import {
  applyAutoConfirm,
  confirmDonation as confirmDonationRecord,
  rejectDonation as rejectDonationRecord,
  resubmitDonation as resubmitDonationRecord,
  canResubmitDonation,
  canDeleteDonation,
  confirmedTotals,
  createPendingDonation,
  DONATION_STATUS,
} from "@/src/app/lib/donations.mjs";
import {
  seedPosts,
  migrateLegacyPosts,
  newId,
  SUPPORTER_ID,
  type Post,
  type ActorId,
} from "@/src/app/data/posts";
import { rejectionReasonLabel } from "@/src/app/lib/donations.mjs";
import {
  buildNotification,
  notificationsForRole,
  unreadCountForRole,
  markRead as markReadRecord,
  markAllRead as markAllReadRecord,
  normalizeNotification,
  donationStatusNotification,
  donationResubmissionNotification,
  postLikeNotification,
  postCommentNotification,
} from "@/src/app/lib/notifications.mjs";

export type Role = "supporter" | "athlete";

/** Who a notification is shown to; maps directly to the current role. */
export type NotificationAudience = "athlete" | "supporter";

/** Kinds of in-app notifications the demo emits. */
export type NotificationType =
  | "donation_pending"
  | "post_like"
  | "post_comment"
  | "donation_confirmed"
  | "donation_rejected"
  | "new_post";

/** An in-app notification (in-memory + localStorage only; no backend). */
export interface Notification {
  id: string;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  body: string;
  /** Epoch ms. */
  createdAt: number;
  read: boolean;
  /** Optional in-app destination for the notification. */
  href?: string;
}

/** A payment QR code an athlete publishes, labeled by payment method. */
export interface QrCode {
  id: string;
  /** Payment method label, e.g. "GCash", "Maya", "BPI". */
  method: string;
  /** Account display name / handle shown under the QR (fictional). */
  label: string;
  /** Mandatory account number / handle supporters pay to (fictional). */
  accountNumber: string;
  /** Image data URL or path for the QR graphic; "" when none was uploaded. */
  image: string;
}

export type DonationStatus = "pending" | "confirmed" | "rejected";

/** A QR-based donation moving through the pending -> confirmed/rejected lifecycle. */
export interface Donation {
  id: string;
  athleteId: number;
  /** Stable supporter identity this submission belongs to (demo sentinel). */
  supporterId: ActorId | null;
  amount: number;
  method: string;
  reference: string;
  supporterName: string;
  receiptName: string;
  receiptPreview: string;
  note: string;
  status: DonationStatus;
  createdAt: number;
  confirmedAt: number | null;
  confirmedBy: "athlete" | "auto" | null;
  /** When the athlete rejected this donation (epoch ms), else null. */
  rejectedAt: number | null;
  /** Stored rejection reason value (see REJECTION_REASONS), else null. */
  rejectionReason: string | null;
  /** Optional athlete note explaining the rejection. */
  rejectionNote: string;
}

/**
 * Bumped whenever persisted data shapes change. v6 adds in-app notifications
 * (on top of v5's supporter identity + reject lifecycle, v4's QR codes,
 * donations, and structured social posts).
 */
const DATA_VERSION = "v7";

/**
 * Backfill the photo gallery + achievement list onto a persisted athlete saved
 * before v7 (which only had a single `image`/`achievement`). Keeps existing
 * athletes — including the three seed athletes — rendering correctly:
 *  - no `photos`      -> wrap the legacy `image` as a one-photo gallery
 *  - no `achievements`-> wrap the legacy `achievement` string as one proudest
 *  - always re-derive `image` (first photo) and `achievement` (proudest title)
 *    so the backward-compatible fields stay in sync with the arrays.
 * Defensive only; never drops data a newer record already has.
 */
function normalizeAthlete(a: Partial<Athlete> & { id: number; name: string }): Athlete {
  const photos: AthletePhoto[] = Array.isArray(a.photos) && a.photos.length > 0
    ? a.photos.map((p, i) => ({
        id: String(p?.id ?? `photo-${a.id}-${i}`),
        name: String(p?.name ?? `photo-${a.id}-${i}.img`),
        src: String(p?.src ?? ""),
        alt: String(p?.alt ?? `Photo of ${a.name}`),
      }))
    : a.image
      ? [{ id: `photo-${a.id}-legacy`, name: `legacy-${a.id}.img`, src: a.image, alt: `Photo of ${a.name}` }]
      : [];

  const achievements: Achievement[] = Array.isArray(a.achievements) && a.achievements.length > 0
    ? a.achievements.map((ac, i) => ({
        id: String(ac?.id ?? `ach-${a.id}-${i}`),
        title: String(ac?.title ?? ""),
        event: String(ac?.event ?? ""),
        date: String(ac?.date ?? ""),
        description: String(ac?.description ?? ""),
        isProudest: Boolean(ac?.isProudest),
      }))
    : a.achievement
      ? [{ id: `ach-${a.id}-legacy`, title: a.achievement, event: "", date: "", description: "", isProudest: true }]
      : [];

  // Enforce the "at most one proudest" invariant defensively on load.
  let seenProudest = false;
  for (const ac of achievements) {
    if (ac.isProudest && !seenProudest) seenProudest = true;
    else ac.isProudest = false;
  }
  const proudest = achievements.find((ac) => ac.isProudest) ?? achievements[0];

  return {
    ...(a as Athlete),
    photos,
    image: photos[0]?.src ?? PHOTO_PLACEHOLDER,
    achievements,
    achievement: proudest?.title ?? "",
  };
}

/** Build a fictional QR entry for a method. */
function makeQr(athleteId: number, method: string, label: string, accountNumber: string): QrCode {
  return {
    id: `qr-${athleteId}-${method.toLowerCase().replace(/\s+/g, "-")}`,
    method,
    label,
    accountNumber,
    // No placeholder graphic — a QR without an uploaded image has no image.
    image: "",
  };
}

/**
 * Seed a couple of fictional QR codes for the first demo athlete (the one the
 * athlete dashboard represents), so the supporter flow has something to show
 * out of the box. All values are fake.
 */
function seedQrCodes(athletes: Athlete[]): Record<number, QrCode[]> {
  const map: Record<number, QrCode[]> = {};
  const first = athletes[0];
  if (first) {
    map[first.id] = [
      makeQr(first.id, "GCash", "J. Santos", "0917 123 4567"),
      makeQr(first.id, "Maya", "J. Santos", "0918 765 4321"),
    ];
  }
  return map;
}

/**
 * Fixed seed baseline of each athlete's pre-existing (fictional) funding and
 * supporter count. Confirmed QR donations are added on top of this baseline so
 * totals stay correct across reloads without double-counting. Captured from the
 * seed — never from persisted (already-reconciled) athlete state.
 */
const BASELINES: Record<number, { raised: number; supporters: number }> = Object.fromEntries(
  seedAthletes.map((a) => [a.id, { raised: a.raised, supporters: a.supporters }]),
);

interface StarleteState {
  mounted: boolean;
  role: Role | null;
  athletes: Athlete[];
  /** Social feed posts (athlete-authored, with likes and comments). */
  posts: Post[];
  /** The athlete currently targeted by the donation modal, if open. */
  donationTarget: Athlete | null;
  /**
   * When the donation modal was opened to retry a rejected donation, the
   * original record whose details prefill the flow and which is resubmitted
   * in place. `null` for a brand-new donation.
   */
  donationPrefill: Donation | null;
  /** Published payment QR codes keyed by athlete id. */
  qrCodes: Record<number, QrCode[]>;
  /** All QR-based donations across the demo (pending + confirmed). */
  donations: Donation[];
  /** All in-app notifications across both audiences (scoped on read). */
  notifications: Notification[];

  login: (role: Role) => void;
  logout: () => void;
  getAthlete: (id: number) => Athlete | undefined;
  /** The current logged-in athlete (demo convention: the first athlete). */
  currentAthlete: Athlete | undefined;

  // --- Athlete profile editing (owner-only; demo = athletes[0]) -----------
  /** Patch an athlete's editable profile fields (name, location, bio, goal). */
  updateAthlete: (id: number, patch: Partial<Pick<Athlete, "name" | "location" | "bio" | "goal" | "sport">>) => void;
  /**
   * Commit a full edited profile draft in one atomic update: text fields plus
   * the complete photos and achievements arrays (used by the edit page's
   * "Save changes", so nothing persists until the athlete confirms). The
   * backward-compatible `image`/`achievement` fields are re-derived.
   */
  saveAthleteProfile: (
    id: number,
    draft: Pick<Athlete, "name" | "location" | "bio" | "sport" | "goal" | "photos" | "achievements">,
  ) => void;
  // Photo gallery.
  /**
   * Validate and append a photo from a data URL. Returns `{ ok }` or
   * `{ ok: false, error }` so the UI can surface a clear message.
   */
  addAthletePhoto: (id: number, input: { type: string; size?: number; dataUrl: string }) => { ok: boolean; error?: string };
  /** Move a photo one slot toward the start (-1) or end (+1). First = profile. */
  moveAthletePhoto: (id: number, index: number, dir: -1 | 1) => void;
  /** Delete a photo by id. */
  removeAthletePhoto: (id: number, photoId: string) => void;
  // Achievements.
  /** Validate and add an achievement. Returns `{ ok }` or `{ ok, errors }`. */
  addAchievement: (id: number, input: { title: string; event?: string; date?: string; description?: string }) => { ok: boolean; errors?: Record<string, string> };
  /** Validate and edit an achievement in place. */
  editAchievement: (id: number, achievementId: string, input: { title: string; event?: string; date?: string; description?: string }) => { ok: boolean; errors?: Record<string, string> };
  /** Delete an achievement by id. */
  deleteAchievement: (id: number, achievementId: string) => void;
  /** Mark exactly one achievement proudest (clears any previous proudest). */
  markProudestAchievement: (id: number, achievementId: string) => void;
  openDonation: (athlete: Athlete) => void;
  /**
   * Open the donation flow to edit and retry a REJECTED donation the current
   * supporter owns. Returns false (and does nothing) if the donation can't be
   * retried — e.g. it isn't rejected or isn't owned by this supporter.
   */
  openResubmission: (donationId: string) => boolean;
  closeDonation: () => void;
  // QR management (athlete side).
  getQrCodes: (athleteId: number) => QrCode[];
  addQrCode: (athleteId: number, method: string, label: string, accountNumber: string, image?: string) => void;
  replaceQrCode: (athleteId: number, qrId: string, patch: Partial<Omit<QrCode, "id">>) => void;
  removeQrCode: (athleteId: number, qrId: string) => void;

  // Donation lifecycle.
  submitDonation: (input: {
    athleteId: number;
    amount: number;
    method: string;
    reference: string;
    supporterName?: string;
    receiptName?: string;
    receiptPreview?: string;
    note?: string;
  }) => Donation;
  confirmDonation: (donationId: string) => void;
  /** Reject a pending donation with a required reason and optional note. */
  rejectDonation: (donationId: string, reason: string, note?: string) => void;
  /**
   * Edit and resubmit the current supporter's REJECTED donation in place,
   * preserving its id/athlete/supporter, returning it to pending, clearing
   * stale rejection/confirmation metadata, and restarting the auto-confirm
   * window. No-op unless the donation is rejected and owned by this supporter.
   */
  resubmitDonation: (
    donationId: string,
    patch: {
      amount: number;
      method: string;
      reference: string;
      supporterName?: string;
      receiptName?: string;
      receiptPreview?: string;
      note?: string;
    },
  ) => void;
  /**
   * Permanently remove the current supporter's PENDING or REJECTED donation
   * from their history. No-op unless the donation is owned by this supporter
   * and deletable (a CONFIRMED donation is never removed, so confirmed totals
   * are never disturbed).
   */
  removeDonation: (donationId: string) => void;
  getDonationsForAthlete: (athleteId: number) => Donation[];
  /** The current demo supporter's stable identity. */
  supporterId: ActorId;
  /** Donations the current supporter submitted (never another supporter's). */
  getDonationsForSupporter: () => Donation[];

  /** Publish a new post authored by the given athlete. */
  addPost: (authorAthleteId: number, text: string) => void;
  /** Update the text of an existing post (owner-scoped by the caller). */
  editPost: (postId: string, text: string) => void;
  /** Permanently remove a post. */
  deletePost: (postId: string) => void;
  /** Toggle a like on a post for the current actor (supporter or athlete). */
  toggleLike: (postId: string, actorId: ActorId) => void;
  /** Add a comment to a post. */
  addComment: (postId: string, authorId: ActorId, authorName: string, text: string) => void;

  // Notifications (scoped to the current role's audience).
  /** Notifications for the current role, newest first (empty when role null). */
  getNotifications: () => Notification[];
  /** Count of unread notifications for the current role. */
  unreadCount: number;
  /** Mark one notification read. */
  markNotificationRead: (id: string) => void;
  /** Mark every notification for the current role read. */
  markAllNotificationsRead: () => void;
}

/** The id for the current actor, used for likes/comments in the demo. */
export function actorIdForRole(role: Role | null, athletes: Athlete[]): ActorId {
  return role === "athlete" ? athletes[0]?.id ?? SUPPORTER_ID : SUPPORTER_ID;
}

/**
 * Fill any fields missing from a persisted donation so older records load
 * safely after a shape change (e.g. before supporterId / rejection fields
 * existed). Defensive only — never changes a present value.
 */
function normalizeDonation(d: Partial<Donation>): Donation {
  return {
    id: String(d.id ?? `don-${d.createdAt ?? Date.now()}`),
    athleteId: Number(d.athleteId),
    supporterId: d.supporterId ?? null,
    amount: Number(d.amount ?? 0),
    method: d.method ?? "",
    reference: d.reference ?? "",
    supporterName: d.supporterName || "Anonymous supporter",
    receiptName: d.receiptName ?? "",
    receiptPreview: d.receiptPreview ?? "",
    note: d.note ?? "",
    status: (d.status as DonationStatus) ?? "pending",
    createdAt: Number(d.createdAt ?? Date.now()),
    confirmedAt: d.confirmedAt ?? null,
    confirmedBy: d.confirmedBy ?? null,
    rejectedAt: d.rejectedAt ?? null,
    rejectionReason: d.rejectionReason ?? null,
    rejectionNote: d.rejectionNote ?? "",
  };
}

const StarleteContext = createContext<StarleteState | null>(null);

export function StarleteProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>(seedAthletes);
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [donationTarget, setDonationTarget] = useState<Athlete | null>(null);
  // When set, the donation modal is retrying this rejected record in place.
  const [donationPrefill, setDonationPrefill] = useState<Donation | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<number, QrCode[]>>(() => seedQrCodes(seedAthletes));
  const [donations, setDonations] = useState<Donation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Hydrate persisted state from localStorage once on client mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const savedRole = window.localStorage.getItem("starlete-role") as Role | null;
      const savedVersion = window.localStorage.getItem("starlete-data-version");
      const savedAthletes = window.localStorage.getItem("starlete-athletes");
      const savedQr = window.localStorage.getItem("starlete-qr");
      const savedDonations = window.localStorage.getItem("starlete-donations");
      const savedPosts = window.localStorage.getItem("starlete-posts");
      const savedNotifications = window.localStorage.getItem("starlete-notifications");
      setRole(savedRole ?? null);
      if (savedVersion === DATA_VERSION || savedVersion === "v6" || savedVersion === "v4" || savedVersion === "v3") {
        if (savedAthletes) {
          // Normalize so athletes saved before v7 gain photos[]/achievements[].
          const loadedAthletes = JSON.parse(savedAthletes) as (Partial<Athlete> & { id: number; name: string })[];
          setAthletes(loadedAthletes.map(normalizeAthlete));
        }
        if (savedQr) {
          // Normalize older QR records to the current shape: default a missing
          // accountNumber to "" and a missing image to "" (no placeholder).
          const loadedQr = JSON.parse(savedQr) as Record<number, Partial<QrCode>[]>;
          const normalizedQr: Record<number, QrCode[]> = {};
          for (const [athleteId, list] of Object.entries(loadedQr)) {
            normalizedQr[Number(athleteId)] = (list ?? []).map((q) => ({
              id: String(q.id ?? `qr-${athleteId}-${Date.now()}`),
              method: q.method ?? "",
              label: q.label ?? "",
              accountNumber: q.accountNumber ?? "",
              image: q.image ?? "",
            }));
          }
          setQrCodes(normalizedQr);
        }
        if (savedPosts) {
          const loadedPosts: unknown = JSON.parse(savedPosts);
          if (Array.isArray(loadedPosts) && loadedPosts.every((post) => typeof post === "string")) {
            setPosts(migrateLegacyPosts(loadedPosts));
          } else {
            setPosts(loadedPosts as Post[]);
          }
        }
        if (savedDonations) {
          // Normalize older records to the current shape (adds supporterId and
          // rejection fields when missing), apply the demo auto-confirm rule to
          // anything that aged past the window while the app was closed, then
          // reconcile athlete totals.
          const loaded = (JSON.parse(savedDonations) as Partial<Donation>[]).map(normalizeDonation);
          const reconciled = applyAutoConfirm(loaded) as Donation[];
          setDonations(reconciled);
        }
        if (savedNotifications) {
          const loadedNtf = JSON.parse(savedNotifications) as Partial<Notification>[];
          setNotifications(
            (loadedNtf ?? []).map((n, i) => normalizeNotification(n, `ntf-legacy-${i}`) as Notification),
          );
        }
      } else {
        // Reset stale caches when the combined payment and social data shape changes.
        setAthletes(seedAthletes);
        setPosts(seedPosts);
        setQrCodes(seedQrCodes(seedAthletes));
        setDonations([]);
        setNotifications([]);
        window.localStorage.removeItem("starlete-athletes");
        window.localStorage.removeItem("starlete-posts");
        window.localStorage.removeItem("starlete-qr");
        window.localStorage.removeItem("starlete-donations");
        window.localStorage.removeItem("starlete-notifications");
        window.localStorage.setItem("starlete-data-version", DATA_VERSION);
      }
    } catch {
      // ignore unavailable/corrupt storage
    } finally {
      setMounted(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist core collections.
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem("starlete-data-version", DATA_VERSION);
      window.localStorage.setItem("starlete-athletes", JSON.stringify(athletes));
      window.localStorage.setItem("starlete-posts", JSON.stringify(posts));
      window.localStorage.setItem("starlete-qr", JSON.stringify(qrCodes));
      window.localStorage.setItem("starlete-donations", JSON.stringify(donations));
      window.localStorage.setItem("starlete-notifications", JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [athletes, posts, qrCodes, donations, notifications, mounted]);

  // Periodically sweep for demo auto-confirm so a long-lived session confirms
  // donations that cross the 3-day window without a reload.
  useEffect(() => {
    if (!mounted) return;
    const sweep = () => setDonations((list) => applyAutoConfirm(list) as Donation[]);
    const timer = window.setInterval(sweep, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [mounted]);

  const login = useCallback((nextRole: Role) => {
    setRole(nextRole);
    try { window.localStorage.setItem("starlete-role", nextRole); } catch {}
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    try { window.localStorage.removeItem("starlete-role"); } catch {}
  }, []);

  // Athlete totals are *derived*, not stored: raised/supporters = fixed seed
  // baseline + confirmed donations. Deriving (instead of mutating athlete state
  // in an effect) keeps a single source of truth and avoids cascading renders.
  const reconciledAthletes = useMemo<Athlete[]>(
    () =>
      athletes.map((a) => {
        const base = BASELINES[a.id];
        if (!base) return a;
        const { total, count } = confirmedTotals(donations, a.id) as {
          total: number;
          count: number;
        };
        return { ...a, raised: base.raised + total, supporters: base.supporters + count };
      }),
    [athletes, donations],
  );

  const getAthlete = useCallback(
    (id: number) => reconciledAthletes.find((a) => a.id === id),
    [reconciledAthletes],
  );

  const currentAthlete = reconciledAthletes[0];

  // --- Athlete profile editing -------------------------------------------
  // All athlete edits go through this helper, which maps over the *base*
  // athletes state (raised/supporters are re-derived by reconciledAthletes, so
  // we never touch them here) and re-derives the backward-compatible `image`
  // and `achievement` fields so they always track the arrays.
  const patchAthlete = useCallback(
    (id: number, mutate: (a: Athlete) => Athlete) => {
      setAthletes((list) =>
        list.map((a) => {
          if (a.id !== id) return a;
          const next = mutate(a);
          const photos = Array.isArray(next.photos) ? next.photos : [];
          const proudest = proudestAchievement(next.achievements) as Achievement | null;
          return {
            ...next,
            image: profilePhotoSrc(photos) as string,
            achievement: proudest?.title ?? "",
          };
        }),
      );
    },
    [],
  );

  const updateAthlete = useCallback<StarleteState["updateAthlete"]>(
    (id, patch) => patchAthlete(id, (a) => ({ ...a, ...patch })),
    [patchAthlete],
  );

  const saveAthleteProfile = useCallback<StarleteState["saveAthleteProfile"]>(
    (id, draft) =>
      patchAthlete(id, (a) => ({
        ...a,
        name: draft.name,
        location: draft.location,
        bio: draft.bio,
        sport: draft.sport,
        goal: draft.goal,
        photos: Array.isArray(draft.photos) ? draft.photos : a.photos,
        achievements: Array.isArray(draft.achievements) ? draft.achievements : a.achievements,
      })),
    [patchAthlete],
  );

  const addAthletePhoto = useCallback<StarleteState["addAthletePhoto"]>(
    (id, input) => {
      const athlete = athletes.find((a) => a.id === id);
      if (!athlete) return { ok: false, error: "Athlete not found." };
      const built = buildPhoto({
        athleteId: id,
        athleteName: athlete.name,
        type: input.type,
        size: input.size,
        dataUrl: input.dataUrl,
        currentCount: athlete.photos?.length ?? 0,
      }) as { ok: boolean; error?: string; photo?: AthletePhoto };
      if (!built.ok || !built.photo) return { ok: false, error: built.error };
      const photo = built.photo;
      patchAthlete(id, (a) => ({ ...a, photos: addPhotoRecord(a.photos, photo) as AthletePhoto[] }));
      return { ok: true };
    },
    [athletes, patchAthlete],
  );

  const moveAthletePhoto = useCallback<StarleteState["moveAthletePhoto"]>(
    (id, index, dir) =>
      patchAthlete(id, (a) => ({ ...a, photos: movePhotoRecord(a.photos, index, dir) as AthletePhoto[] })),
    [patchAthlete],
  );

  const removeAthletePhoto = useCallback<StarleteState["removeAthletePhoto"]>(
    (id, photoId) =>
      patchAthlete(id, (a) => ({ ...a, photos: removePhotoRecord(a.photos, photoId) as AthletePhoto[] })),
    [patchAthlete],
  );

  const addAchievement = useCallback<StarleteState["addAchievement"]>(
    (id, input) => {
      const built = buildAchievement(id, input) as { ok: boolean; errors?: Record<string, string>; achievement?: Achievement };
      if (!built.ok || !built.achievement) return { ok: false, errors: built.errors };
      const achievement = built.achievement;
      patchAthlete(id, (a) => ({ ...a, achievements: addAchievementRecord(a.achievements, achievement) as Achievement[] }));
      return { ok: true };
    },
    [patchAthlete],
  );

  const editAchievement = useCallback<StarleteState["editAchievement"]>(
    (id, achievementId, input) => {
      const result = validateAchievement(input) as { ok: boolean; errors?: Record<string, string>; fields?: Omit<Achievement, "id" | "isProudest"> };
      if (!result.ok || !result.fields) return { ok: false, errors: result.errors };
      const fields = result.fields;
      patchAthlete(id, (a) => ({ ...a, achievements: editAchievementRecord(a.achievements, achievementId, fields) as Achievement[] }));
      return { ok: true };
    },
    [patchAthlete],
  );

  const deleteAchievement = useCallback<StarleteState["deleteAchievement"]>(
    (id, achievementId) =>
      patchAthlete(id, (a) => ({ ...a, achievements: deleteAchievementRecord(a.achievements, achievementId) as Achievement[] })),
    [patchAthlete],
  );

  const markProudestAchievement = useCallback<StarleteState["markProudestAchievement"]>(
    (id, achievementId) =>
      patchAthlete(id, (a) => ({ ...a, achievements: markProudestRecord(a.achievements, achievementId) as Achievement[] })),
    [patchAthlete],
  );

  // Resolve an actor id to a display name for notification copy. The demo
  // supporter has no real name, so it reads as a generic "A supporter".
  const likerName = useCallback(
    (actorId: ActorId): string =>
      actorId === SUPPORTER_ID ? "A supporter" : getAthlete(actorId as number)?.name ?? "Someone",
    [getAthlete],
  );

  const openDonation = useCallback((athlete: Athlete) => {
    setDonationPrefill(null);
    setDonationTarget(athlete);
  }, []);
  const closeDonation = useCallback(() => {
    setDonationTarget(null);
    setDonationPrefill(null);
  }, []);

  const openResubmission = useCallback(
    (donationId: string): boolean => {
      const donation = donations.find((d) => d.id === donationId);
      // Owner-only, rejected-only. A confirmed/pending donation is never retried.
      if (!donation || !canResubmitDonation(donation, SUPPORTER_ID)) return false;
      const athlete = reconciledAthletes.find((a) => a.id === donation.athleteId);
      if (!athlete) return false;
      setDonationPrefill(donation);
      setDonationTarget(athlete);
      return true;
    },
    [donations, reconciledAthletes],
  );

  // --- QR management -------------------------------------------------------
  const getQrCodes = useCallback(
    (athleteId: number) => qrCodes[athleteId] ?? [],
    [qrCodes],
  );

  const addQrCode = useCallback(
    (athleteId: number, method: string, label: string, accountNumber: string, image?: string) => {
      setQrCodes((map) => {
        const existing = map[athleteId] ?? [];
        const qr: QrCode = {
          id: `qr-${athleteId}-${Date.now()}`,
          method,
          label,
          accountNumber,
          // No placeholder graphic — when no image is uploaded, store "".
          image: image ?? "",
        };
        return { ...map, [athleteId]: [...existing, qr] };
      });
    },
    [],
  );

  const replaceQrCode = useCallback(
    (athleteId: number, qrId: string, patch: Partial<Omit<QrCode, "id">>) => {
      setQrCodes((map) => {
        const existing = map[athleteId] ?? [];
        return {
          ...map,
          [athleteId]: existing.map((q) => (q.id === qrId ? { ...q, ...patch } : q)),
        };
      });
    },
    [],
  );

  const removeQrCode = useCallback((athleteId: number, qrId: string) => {
    setQrCodes((map) => {
      const existing = map[athleteId] ?? [];
      return { ...map, [athleteId]: existing.filter((q) => q.id !== qrId) };
    });
  }, []);

  // --- Donation lifecycle --------------------------------------------------
  // The demo has a single supporter identity (SUPPORTER_ID). Every submission
  // is stamped with it so "My payments" can be scoped to the current supporter
  // without ever exposing another supporter's history. (See the limitation
  // note in the docs: the demo cannot distinguish multiple real supporters.)
  const supporterId: ActorId = SUPPORTER_ID;

  // Stamp a built notification payload with id/createdAt/read and prepend it
  // (newest first). No-op when the builder returns null (nothing to emit).
  const pushNotification = useCallback((event: { type: NotificationType; data: Record<string, unknown> }) => {
    const payload = buildNotification(event) as Omit<Notification, "id" | "createdAt" | "read"> | null;
    if (!payload) return;
    const notification: Notification = {
      ...payload,
      id: newId("ntf"),
      createdAt: Date.now(),
      read: false,
    };
    setNotifications((list) => [notification, ...list]);
  }, []);

  const submitDonation = useCallback<StarleteState["submitDonation"]>((input) => {
    const donation = createPendingDonation({ ...input, supporterId: SUPPORTER_ID }) as Donation;
    setDonations((list) => [donation, ...list]);
    // Notify the athlete audience: a new pending donation needs review. Copy is
    // athlete-facing, so it names the supporter the donation came FROM.
    pushNotification({
      type: "donation_pending",
      data: { amount: donation.amount, supporterName: donation.supporterName },
    });
    return donation;
  }, [pushNotification]);

  const confirmDonation = useCallback((donationId: string) => {
    const donation = donations.find((item) => item.id === donationId);
    if (!donation) return;
    const next = confirmDonationRecord(donation, "athlete") as Donation;
    setDonations((list) => list.map((item) => (item.id === donationId ? next : item)));
    const event = donationStatusNotification(donation, "confirmed", {
      amount: donation.amount,
      athleteName: getAthlete(donation.athleteId)?.name,
    });
    if (event) pushNotification(event);
  }, [donations, pushNotification, getAthlete]);

  const rejectDonation = useCallback((donationId: string, reason: string, note?: string) => {
    const donation = donations.find((item) => item.id === donationId);
    if (!donation) return;
    const next = rejectDonationRecord(donation, reason, note ?? "") as Donation;
    setDonations((list) => list.map((item) => (item.id === donationId ? next : item)));
    const event = donationStatusNotification(donation, "rejected", {
      amount: donation.amount,
      athleteName: getAthlete(donation.athleteId)?.name,
      reasonLabel: rejectionReasonLabel(next.rejectionReason ?? reason),
    });
    if (event) pushNotification(event);
  }, [donations, pushNotification, getAthlete]);

  const resubmitDonation = useCallback<StarleteState["resubmitDonation"]>(
    (donationId, patch) => {
      const donation = donations.find((item) => item.id === donationId);
      if (!donation) return;
      const next = resubmitDonationRecord(donation, SUPPORTER_ID, patch) as Donation;
      setDonations((list) => list.map((item) => (item.id === donationId ? next : item)));
      const event = donationResubmissionNotification(donation, next);
      if (event) pushNotification(event);
    },
    [donations, pushNotification],
  );

  const removeDonation = useCallback((donationId: string) => {
    // Owner- and status-guarded: only the current supporter's pending/rejected
    // donations are removable. A confirmed donation is left intact so derived
    // totals never change behind the athlete's back.
    setDonations((list) =>
      list.filter((d) => !(d.id === donationId && canDeleteDonation(d, SUPPORTER_ID))),
    );
  }, []);

  const getDonationsForAthlete = useCallback(
    (athleteId: number) =>
      donations
        .filter((d) => d.athleteId === athleteId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [donations],
  );

  const getDonationsForSupporter = useCallback(
    () =>
      donations
        .filter((d) => d.supporterId === SUPPORTER_ID)
        .sort((a, b) => b.createdAt - a.createdAt),
    [donations],
  );

  const addPost = useCallback((authorAthleteId: number, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const post: Post = {
      id: newId("post"),
      authorAthleteId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      comments: [],
    };
    setPosts((prev) => [post, ...prev]);
    // Notify the supporter audience that a followed athlete posted. (Demo has
    // no follow graph, so this reaches the whole supporter audience.)
    pushNotification({
      type: "new_post",
      data: { athleteName: getAthlete(authorAthleteId)?.name, text: trimmed },
    });
  }, [pushNotification, getAthlete]);

  const editPost = useCallback((postId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, text: trimmed, editedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, []);

  const deletePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const toggleLike = useCallback((postId: string, actorId: ActorId) => {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    const alreadyLiked = post.likedBy.includes(actorId);
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              likedBy: alreadyLiked
                ? item.likedBy.filter((id) => id !== actorId)
                : [...item.likedBy, actorId],
              likes: item.likes + (alreadyLiked ? -1 : 1),
            }
          : item,
      ),
    );
    const event = postLikeNotification(post, actorId, likerName(actorId));
    if (event) pushNotification(event);
  }, [posts, pushNotification, likerName]);

  const addComment = useCallback(
    (postId: string, authorId: ActorId, authorName: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const post = posts.find((item) => item.id === postId);
      if (!post) return;
      const comment = {
        id: newId("cmt"),
        authorId,
        authorName,
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) =>
        prev.map((item) =>
          item.id === postId ? { ...item, comments: [...item.comments, comment] } : item,
        ),
      );
      const event = postCommentNotification(
        post,
        authorId,
        authorName || likerName(authorId),
        trimmed,
      );
      if (event) pushNotification(event);
    },
    [posts, pushNotification, likerName],
  );

  // --- Notifications -------------------------------------------------------
  // Everything is scoped to the current role's audience so an athlete never
  // sees supporter notifications and vice-versa; a null role sees none.
  const getNotifications = useCallback(
    () => notificationsForRole(notifications, role) as Notification[],
    [notifications, role],
  );

  const unreadCount = useMemo(
    () => unreadCountForRole(notifications, role) as number,
    [notifications, role],
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((list) => markReadRecord(list, id) as Notification[]);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((list) => markAllReadRecord(list, role) as Notification[]);
  }, [role]);

  const value = useMemo<StarleteState>(
    () => ({
      mounted,
      role,
      athletes: reconciledAthletes,
      posts,
      donationTarget,
      donationPrefill,
      qrCodes,
      donations,
      notifications,
      login,
      logout,
      getAthlete,
      currentAthlete,
      updateAthlete,
      saveAthleteProfile,
      addAthletePhoto,
      moveAthletePhoto,
      removeAthletePhoto,
      addAchievement,
      editAchievement,
      deleteAchievement,
      markProudestAchievement,
      openDonation,
      openResubmission,
      closeDonation,
      getQrCodes,
      addQrCode,
      replaceQrCode,
      removeQrCode,
      submitDonation,
      confirmDonation,
      rejectDonation,
      resubmitDonation,
      removeDonation,
      getDonationsForAthlete,
      supporterId,
      getDonationsForSupporter,
      addPost,
      editPost,
      deletePost,
      toggleLike,
      addComment,
      getNotifications,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      mounted, role, reconciledAthletes, posts, donationTarget, donationPrefill, qrCodes, donations, notifications,
      login, logout, getAthlete, currentAthlete, updateAthlete, saveAthleteProfile,
      addAthletePhoto, moveAthletePhoto, removeAthletePhoto,
      addAchievement, editAchievement, deleteAchievement, markProudestAchievement,
      openDonation, openResubmission, closeDonation,
      getQrCodes, addQrCode, replaceQrCode, removeQrCode,
      submitDonation, confirmDonation, rejectDonation, resubmitDonation, removeDonation, getDonationsForAthlete,
      supporterId, getDonationsForSupporter, addPost, editPost, deletePost, toggleLike, addComment,
      getNotifications, unreadCount, markNotificationRead, markAllNotificationsRead,
    ],
  );

  return <StarleteContext.Provider value={value}>{children}</StarleteContext.Provider>;
}

export function useStarlete(): StarleteState {
  const ctx = useContext(StarleteContext);
  if (!ctx) {
    throw new Error("useStarlete must be used within a StarleteProvider");
  }
  return ctx;
}

export { DONATION_STATUS };
