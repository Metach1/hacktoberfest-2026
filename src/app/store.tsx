"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  athletes as seedAthletes,
  type Athlete,
} from "@/src/app/data/athletes";
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
  newId,
  SUPPORTER_ID,
  type Post,
  type ActorId,
} from "@/src/app/data/posts";
import {
  createPost as createDatabasePost,
  createPostComment,
  deletePost as deleteDatabasePost,
  listPosts,
  setPostReaction,
  updatePost as updateDatabasePost,
} from "@/src/app/services/posts";
import {
  autoConfirmDueDonations,
  confirmDonation as confirmDatabaseDonation,
  createDonation as createDatabaseDonation,
  deleteDonation as deleteDatabaseDonation,
  listDonations as listDatabaseDonations,
  rejectDonation as rejectDatabaseDonation,
  resubmitDonation as resubmitDatabaseDonation,
  type DonationRecord,
} from "@/src/app/services/donations";
import {
  createQrCode,
  deleteQrCode,
  listMyQrCodes,
  listQrCodes,
  updateQrCode,
} from "@/src/app/services/qr";
import { isSupabaseConfigured } from "@/src/app/lib/supabase/client";
import { useSession } from "@/src/app/shared/session-provider";
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
  athleteProfileId?: string | null;
  athleteName?: string;
  /** Stable supporter identity this submission belongs to (demo sentinel). */
  supporterId: string | number | null;
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
const DATA_VERSION = "v6";

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
  postsLoading: boolean;
  postError: string | null;
  /**
   * Last error from a donation or QR operation. Kept separate from postError
   * so donation/QR failures surface near the donation UI and never leak into
   * the posts / "Latest updates" section.
   */
  donationError: string | null;
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
    athleteProfileId: d.athleteProfileId ?? null,
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

function mapDonationsForUi(
  records: DonationRecord[],
  role: Role | null,
  userId: string | undefined,
): Donation[] {
  return records.map((record) =>
    role === "athlete" && record.athleteProfileId === userId
      ? { ...record, athleteId: seedAthletes[0]?.id ?? record.athleteId }
      : record,
  );
}

const StarleteContext = createContext<StarleteState | null>(null);

interface PendingLikeUpdate {
  desiredLiked: boolean;
  persistedLiked: boolean;
  running: boolean;
  post: Post;
}

export function StarleteProvider({ children }: { children: ReactNode }) {
  const { user, loading: sessionLoading, displayName } = useSession();
  const [role, setRole] = useState<Role | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>(seedAthletes);
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [donationTarget, setDonationTarget] = useState<Athlete | null>(null);
  // When set, the donation modal is retrying this rejected record in place.
  const [donationPrefill, setDonationPrefill] = useState<Donation | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<number, QrCode[]>>(() => seedQrCodes(seedAthletes));
  const [donations, setDonations] = useState<Donation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pendingLikes = useRef(new Map<string, PendingLikeUpdate>());

  // Hydrate persisted state from localStorage once on client mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const savedRole = window.localStorage.getItem("starlete-role") as Role | null;
      const savedVersion = window.localStorage.getItem("starlete-data-version");
      const savedAthletes = window.localStorage.getItem("starlete-athletes");
      const savedQr = window.localStorage.getItem("starlete-qr");
      const savedDonations = window.localStorage.getItem("starlete-donations");
      const savedNotifications = window.localStorage.getItem("starlete-notifications");
      setRole(savedRole ?? null);
      window.localStorage.removeItem("starlete-posts");
      if (savedVersion === DATA_VERSION || savedVersion === "v4" || savedVersion === "v3") {
        if (savedAthletes) setAthletes(JSON.parse(savedAthletes) as Athlete[]);
        if (savedQr && !isSupabaseConfigured()) {
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
        if (savedDonations && !isSupabaseConfigured()) {
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
        setPosts([]);
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
      if (isSupabaseConfigured()) {
        window.localStorage.removeItem("starlete-qr");
        window.localStorage.removeItem("starlete-donations");
      } else {
        window.localStorage.setItem("starlete-qr", JSON.stringify(qrCodes));
        window.localStorage.setItem("starlete-donations", JSON.stringify(donations));
      }
      window.localStorage.setItem("starlete-notifications", JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [athletes, qrCodes, donations, notifications, mounted]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!mounted || sessionLoading) return;
    if (!isSupabaseConfigured()) {
      setPosts([]);
      setPostsLoading(false);
      return;
    }

    let active = true;
    setPostsLoading(true);
    setPostError(null);
    listPosts(actorIdForRole(role, seedAthletes))
      .then((loadedPosts) => {
        if (active) setPosts(loadedPosts);
      })
      .catch((error: unknown) => {
        if (active) {
          setPostError(error instanceof Error ? error.message : "Could not load posts.");
        }
      })
      .finally(() => {
        if (active) setPostsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mounted, sessionLoading, user?.id, role]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted || sessionLoading || !isSupabaseConfigured()) return;

    let active = true;
    // The account change must clear data from the previous session before the
    // next database request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDonations([]);
    const initialQrCodes = seedQrCodes(seedAthletes);
    if (role === "athlete" && seedAthletes[0]) initialQrCodes[seedAthletes[0].id] = [];
    setQrCodes(initialQrCodes);

    setDonationError(null);
    void (async () => {
      // Run the demo auto-confirm sweep first, but never let its failure block
      // the donation load below: a missing/failed RPC must not keep "Pending
      // receipts" and "My payments" empty. Its error goes to donationError.
      if (user?.id) {
        try {
          await autoConfirmDueDonations();
        } catch (error: unknown) {
          if (active) {
            setDonationError(error instanceof Error ? error.message : "Could not auto-confirm due donations.");
          }
        }
      }

      try {
        const loaded = await listDatabaseDonations();
        if (active) {
          setDonations(mapDonationsForUi(loaded, role, user?.id));
        }
      } catch (error: unknown) {
        if (active) {
          setDonationError(error instanceof Error ? error.message : "Could not load donations.");
        }
      }

      if (role === "athlete" && user?.id) {
        try {
          const loadedQrCodes = await listMyQrCodes();
          if (active) {
            setQrCodes((current) => ({
              ...current,
              [seedAthletes[0]?.id ?? -1]: loadedQrCodes,
            }));
          }
        } catch (error: unknown) {
          if (active) {
            setDonationError(error instanceof Error ? error.message : "Could not load payment QR codes.");
          }
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [mounted, sessionLoading, user?.id, role]);

  // Periodically sweep for demo auto-confirm so a long-lived session confirms
  // donations that cross the 3-day window without a reload.
  useEffect(() => {
    if (!mounted) return;
    const sweep = () => {
      if (!isSupabaseConfigured()) {
        setDonations((list) => applyAutoConfirm(list) as Donation[]);
        return;
      }
      if (!user?.id) return;

      void autoConfirmDueDonations()
        .then(async (updated) => {
          if (updated > 0) {
            const loaded = await listDatabaseDonations();
            setDonations(mapDonationsForUi(loaded, role, user?.id));
          }
        })
        .catch((error: unknown) => {
          setDonationError(error instanceof Error ? error.message : "Could not auto-confirm due donations.");
        });
    };
    const timer = window.setInterval(sweep, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [mounted, role, user?.id]);

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
        // Seed athletes carry a fixed baseline; Supabase-registered athletes
        // (synthetic negative ids) have none, so treat their baseline as zero
        // and still fold in confirmed donations. This keeps raised/supporters
        // derived for ALL athletes, not just seeded ones.
        const base = BASELINES[a.id] ?? { raised: 0, supporters: 0 };
        const { total, count } = confirmedTotals(donations, a.id) as {
          total: number;
          count: number;
        };
        return { ...a, raised: base.raised + total, supporters: base.supporters + count };
      }),
    [athletes, donations],
  );

  const getAthlete = useCallback(
    (id: number) => {
      const athlete = reconciledAthletes.find((item) => item.id === id);
      if (athlete) return athlete;
      const donation = donations.find((item) => item.athleteId === id && item.athleteName);
      if (!donation?.athleteName) return undefined;
      // A Supabase-registered athlete the store only knows through donations
      // (synthetic negative id): derive raised/supporters from confirmed
      // donations with a zero baseline, rather than inheriting the seed
      // athlete's fictional funding figures.
      const { total, count } = confirmedTotals(donations, id) as { total: number; count: number };
      return {
        ...seedAthletes[0],
        id,
        profileId: donation.athleteProfileId ?? undefined,
        name: donation.athleteName,
        raised: total,
        supporters: count,
      };
    },
    [reconciledAthletes, donations],
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
    if (isSupabaseConfigured() && athlete.profileId) {
      setDonationError(null);
      void listQrCodes(athlete.profileId)
        .then((loaded) => {
          setQrCodes((current) => ({ ...current, [athlete.id]: loaded }));
        })
        .catch((error: unknown) => {
          setDonationError(error instanceof Error ? error.message : "Could not load payment QR codes.");
        });
    }
  }, []);
  const closeDonation = useCallback(() => {
    setDonationTarget(null);
    setDonationPrefill(null);
  }, []);

  const openResubmission = useCallback(
    (donationId: string): boolean => {
      const donation = donations.find((d) => d.id === donationId);
      // Owner-only, rejected-only. A confirmed/pending donation is never retried.
      const currentSupporterId = isSupabaseConfigured() ? user?.id ?? null : SUPPORTER_ID;
      if (!donation || !canResubmitDonation(donation, currentSupporterId)) return false;
      const athlete = reconciledAthletes.find((a) => a.id === donation.athleteId);
      const target = athlete ?? (donation.athleteProfileId
        ? {
            ...seedAthletes[0],
            id: donation.athleteId,
            profileId: donation.athleteProfileId,
            name: donation.athleteName ?? seedAthletes[0].name,
          }
        : undefined);
      if (!target) return false;
      setDonationPrefill(donation);
      setDonationTarget(target);
      if (isSupabaseConfigured() && target.profileId) {
        setDonationError(null);
        void listQrCodes(target.profileId)
          .then((loaded) => {
            setQrCodes((current) => ({ ...current, [target.id]: loaded }));
          })
          .catch((error: unknown) => {
            setDonationError(error instanceof Error ? error.message : "Could not load payment QR codes.");
          });
      }
      return true;
    },
    [donations, reconciledAthletes, user?.id],
  );

  // --- QR management -------------------------------------------------------
  const getQrCodes = useCallback(
    (athleteId: number) => qrCodes[athleteId] ?? [],
    [qrCodes],
  );

  const addQrCode = useCallback(
    (athleteId: number, method: string, label: string, accountNumber: string, image?: string) => {
      if (isSupabaseConfigured()) {
        void createQrCode({ method, label, accountNumber, image: image ?? "" })
          .then((qr) => {
            setQrCodes((map) => ({ ...map, [athleteId]: [...(map[athleteId] ?? []), qr] }));
          })
          .catch((error: unknown) => {
            setDonationError(error instanceof Error ? error.message : "Could not publish this QR code.");
          });
        return;
      }
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
      if (isSupabaseConfigured()) {
        void updateQrCode(qrId, patch)
          .then(() => {
            setQrCodes((map) => ({
              ...map,
              [athleteId]: (map[athleteId] ?? []).map((qr) =>
                qr.id === qrId ? { ...qr, ...patch } : qr,
              ),
            }));
          })
          .catch((error: unknown) => {
            setDonationError(error instanceof Error ? error.message : "Could not update this QR code.");
          });
        return;
      }
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
    if (isSupabaseConfigured()) {
      void deleteQrCode(qrId)
        .then(() => {
          setQrCodes((map) => ({
            ...map,
            [athleteId]: (map[athleteId] ?? []).filter((qr) => qr.id !== qrId),
          }));
        })
        .catch((error: unknown) => {
          setDonationError(error instanceof Error ? error.message : "Could not remove this QR code.");
        });
      return;
    }
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
    const supporterIdentity = isSupabaseConfigured() ? user?.id ?? SUPPORTER_ID : SUPPORTER_ID;
    const donation = {
      ...createPendingDonation({ ...input, supporterId: supporterIdentity }),
      athleteProfileId: donationTarget?.profileId ?? null,
      athleteName: donationTarget?.name,
    } as Donation;

    if (!isSupabaseConfigured()) {
      setDonations((list) => [donation, ...list]);
      pushNotification({
        type: "donation_pending",
        data: { amount: donation.amount, supporterName: donation.supporterName },
      });
      return donation;
    }

    setDonationError(null);
    setDonations((list) => [donation, ...list]);
    void createDatabaseDonation({
      ...input,
      athleteProfileId: donationTarget?.profileId ?? null,
    })
      .then((saved) => {
        const persisted = {
          ...saved,
          athleteId: input.athleteId,
          athleteName: donation.athleteName,
        } as Donation;
        setDonations((list) => list.map((item) => item.id === donation.id ? persisted : item));
        pushNotification({
          type: "donation_pending",
          data: { amount: persisted.amount, supporterName: persisted.supporterName },
        });
      })
      .catch((error: unknown) => {
        setDonations((list) => list.filter((item) => item.id !== donation.id));
        setDonationError(error instanceof Error ? error.message : "Could not submit this donation.");
      });
    return donation;
  }, [donationTarget, pushNotification, user?.id]);

  const confirmDonation = useCallback((donationId: string) => {
    const donation = donations.find((item) => item.id === donationId);
    if (!donation) return;

    if (isSupabaseConfigured()) {
      void confirmDatabaseDonation(donationId)
        .then((saved) => {
          const next = { ...saved, athleteId: donation.athleteId } as Donation;
          setDonations((list) => list.map((item) => item.id === donationId ? next : item));
          const event = donationStatusNotification(donation, "confirmed", {
            amount: donation.amount,
            athleteName: getAthlete(donation.athleteId)?.name ?? donation.athleteName,
          });
          if (event) pushNotification(event);
        })
        .catch((error: unknown) => {
          setDonationError(error instanceof Error ? error.message : "Could not confirm this donation.");
        });
      return;
    }

    const next = confirmDonationRecord(donation, "athlete") as Donation;
    setDonations((list) => list.map((item) => (item.id === donationId ? next : item)));
    const event = donationStatusNotification(donation, "confirmed", {
      amount: donation.amount,
      athleteName: getAthlete(donation.athleteId)?.name ?? donation.athleteName,
    });
    if (event) pushNotification(event);
  }, [donations, pushNotification, getAthlete]);

  const rejectDonation = useCallback((donationId: string, reason: string, note?: string) => {
    const donation = donations.find((item) => item.id === donationId);
    if (!donation) return;

    if (isSupabaseConfigured()) {
      void rejectDatabaseDonation(donationId, reason, note ?? "")
        .then((saved) => {
          const next = { ...saved, athleteId: donation.athleteId } as Donation;
          setDonations((list) => list.map((item) => item.id === donationId ? next : item));
          const event = donationStatusNotification(donation, "rejected", {
            amount: donation.amount,
            athleteName: getAthlete(donation.athleteId)?.name ?? donation.athleteName,
            reasonLabel: rejectionReasonLabel(next.rejectionReason ?? reason),
          });
          if (event) pushNotification(event);
        })
        .catch((error: unknown) => {
          setDonationError(error instanceof Error ? error.message : "Could not reject this donation.");
        });
      return;
    }

    const next = rejectDonationRecord(donation, reason, note ?? "") as Donation;
    setDonations((list) => list.map((item) => (item.id === donationId ? next : item)));
    const event = donationStatusNotification(donation, "rejected", {
      amount: donation.amount,
      athleteName: getAthlete(donation.athleteId)?.name ?? donation.athleteName,
      reasonLabel: rejectionReasonLabel(next.rejectionReason ?? reason),
    });
    if (event) pushNotification(event);
  }, [donations, pushNotification, getAthlete]);

  const resubmitDonation = useCallback<StarleteState["resubmitDonation"]>(
    (donationId, patch) => {
      const donation = donations.find((item) => item.id === donationId);
      if (!donation) return;
      const currentSupporterId = isSupabaseConfigured() ? user?.id ?? null : SUPPORTER_ID;
      const next = resubmitDonationRecord(donation, currentSupporterId, patch) as Donation;

      if (isSupabaseConfigured()) {
        void resubmitDatabaseDonation(donationId, patch)
          .then((saved) => {
            const persisted = { ...saved, athleteId: donation.athleteId } as Donation;
            setDonations((list) => list.map((item) => item.id === donationId ? persisted : item));
            const event = donationResubmissionNotification(donation, persisted);
            if (event) pushNotification(event);
          })
          .catch((error: unknown) => {
            setDonations((list) => list.map((item) => item.id === donationId ? donation : item));
            setDonationError(error instanceof Error ? error.message : "Could not resubmit this donation.");
          });
        setDonations((list) => list.map((item) => item.id === donationId ? next : item));
        return;
      }

      setDonations((list) => list.map((item) => (item.id === donationId ? next : item)));
      const event = donationResubmissionNotification(donation, next);
      if (event) pushNotification(event);
    },
    [donations, pushNotification, user?.id],
  );

  const removeDonation = useCallback((donationId: string) => {
    // Owner- and status-guarded: only the current supporter's pending/rejected
    // donations are removable. A confirmed donation is left intact so derived
    // totals never change behind the athlete's back.
    const currentSupporterId = isSupabaseConfigured() ? user?.id ?? null : SUPPORTER_ID;
    const donation = donations.find((item) => item.id === donationId);
    if (!donation || !canDeleteDonation(donation, currentSupporterId)) return;
    if (isSupabaseConfigured()) {
      void deleteDatabaseDonation(donationId)
        .then(() => setDonations((list) => list.filter((item) => item.id !== donationId)))
        .catch((error: unknown) => {
          setDonationError(error instanceof Error ? error.message : "Could not remove this donation.");
        });
      return;
    }
    setDonations((list) => list.filter((item) => item.id !== donationId));
  }, [donations, user?.id]);

  const currentUserId = user?.id;
  const getDonationsForAthlete = useCallback(
    (athleteId: number) => {
      const ownedByCurrentAthlete = isSupabaseConfigured()
        && role === "athlete"
        && currentUserId
        && (athleteId === seedAthletes[0]?.id || athleteId === -1);
      return donations
        .filter((d) => ownedByCurrentAthlete
          ? d.athleteProfileId === currentUserId
          : d.athleteId === athleteId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    [donations, role, currentUserId],
  );

  const getDonationsForSupporter = useCallback(
    () =>
      donations
        .filter((d) => d.supporterId === (isSupabaseConfigured() ? user?.id : SUPPORTER_ID))
        .sort((a, b) => b.createdAt - a.createdAt),
    [donations, user?.id],
  );

  const addPost = useCallback((authorAthleteId: number, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPostError(null);
    void createDatabasePost(trimmed)
      .then((post) => {
        setPosts((previous) => [post, ...previous]);
        pushNotification({
          type: "new_post",
          data: { athleteName: post.authorName ?? getAthlete(authorAthleteId)?.name, text: trimmed },
        });
      })
      .catch((error: unknown) => {
        setPostError(error instanceof Error ? error.message : "Could not publish this post.");
      });
  }, [pushNotification, getAthlete]);

  const editPost = useCallback((postId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPostError(null);
    void updateDatabasePost(postId, trimmed)
      .then(() => {
        setPosts((previous) => previous.map((post) =>
          post.id === postId
            ? { ...post, text: trimmed, editedAt: new Date().toISOString() }
            : post,
        ));
      })
      .catch((error: unknown) => {
        setPostError(error instanceof Error ? error.message : "Could not update this post.");
      });
  }, []);

  const deletePost = useCallback((postId: string) => {
    setPostError(null);
    void deleteDatabasePost(postId)
      .then(() => {
        setPosts((previous) => previous.filter((post) => post.id !== postId));
      })
      .catch((error: unknown) => {
        setPostError(error instanceof Error ? error.message : "Could not delete this post.");
      });
  }, []);

  const toggleLike = useCallback((postId: string, actorId: ActorId) => {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    const operationKey = `${postId}:${actorId}`;
    const operation = pendingLikes.current.get(operationKey) ?? (() => {
      const liked = post.likedBy.includes(actorId);
      const pending: PendingLikeUpdate = {
        desiredLiked: liked,
        persistedLiked: liked,
        running: false,
        post,
      };
      pendingLikes.current.set(operationKey, pending);
      return pending;
    })();
    operation.desiredLiked = !operation.desiredLiked;
    const desiredLiked = operation.desiredLiked;
    setPostError(null);
    const applyLikeState = (item: Post, liked: boolean): Post => {
      const currentlyLiked = item.likedBy.includes(actorId);
      if (currentlyLiked === liked) return item;
      return {
        ...item,
        likedBy: liked
          ? [...item.likedBy, actorId]
          : item.likedBy.filter((id) => id !== actorId),
        likes: Math.max(0, item.likes + (liked ? 1 : -1)),
      };
    };
    setPosts((previous) => previous.map((item) =>
      item.id === postId ? applyLikeState(item, desiredLiked) : item,
    ));

    if (operation.running) return;
    operation.running = true;
    void (async () => {
      try {
        while (operation.desiredLiked !== operation.persistedLiked) {
          const target = operation.desiredLiked;
          try {
            await setPostReaction(postId, target);
          } catch (error: unknown) {
            setPostError(error instanceof Error ? error.message : "Could not update this like.");
            operation.desiredLiked = operation.persistedLiked;
            const persistedLiked = operation.persistedLiked;
            setPosts((previous) => previous.map((item) =>
              item.id === postId ? applyLikeState(item, persistedLiked) : item,
            ));
            continue;
          }
          operation.persistedLiked = target;
          if (target) {
            const event = postLikeNotification(
              operation.post,
              actorId,
              displayName ?? likerName(actorId),
              user?.id,
            );
            if (event) pushNotification(event);
          }
        }
      } finally {
        operation.running = false;
        if (pendingLikes.current.get(operationKey) === operation) {
          pendingLikes.current.delete(operationKey);
        }
      }
    })();
  }, [posts, pushNotification, likerName, user?.id, displayName]);

  const addComment = useCallback(
    (postId: string, authorId: ActorId, authorName: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const post = posts.find((item) => item.id === postId);
      if (!post) return;
      setPostError(null);
      void createPostComment(postId, authorName || displayName || likerName(authorId), trimmed, authorId)
        .then((comment) => {
          setPosts((previous) => previous.map((item) =>
            item.id === postId ? { ...item, comments: [...item.comments, comment] } : item,
          ));
          const event = postCommentNotification(
            post,
            authorId,
            comment.authorName || displayName || likerName(authorId),
            trimmed,
            user?.id,
          );
          if (event) pushNotification(event);
        })
        .catch((error: unknown) => {
          setPostError(error instanceof Error ? error.message : "Could not add this comment.");
        });
    },
    [posts, pushNotification, likerName, displayName, user?.id],
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
      postsLoading,
      postError,
      donationError,
      donationTarget,
      donationPrefill,
      qrCodes,
      donations,
      notifications,
      login,
      logout,
      getAthlete,
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
      mounted, role, reconciledAthletes, posts, postsLoading, postError, donationError, donationTarget, donationPrefill, qrCodes, donations, notifications,
      login, logout, getAthlete, openDonation, openResubmission, closeDonation,
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
