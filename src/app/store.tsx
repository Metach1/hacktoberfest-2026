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
} from "@/src/app/data/athletes";
import {
  applyAutoConfirm,
  confirmDonation as confirmDonationRecord,
  rejectDonation as rejectDonationRecord,
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

export type Role = "supporter" | "athlete";

/** A payment QR code an athlete publishes, labeled by payment method. */
export interface QrCode {
  id: string;
  /** Payment method label, e.g. "GCash", "Maya", "BPI". */
  method: string;
  /** Account display name / handle shown under the QR (fictional). */
  label: string;
  /** Image data URL or path for the QR graphic (fictional placeholder). */
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
 * Bumped whenever persisted data shapes change. v5 adds supporter identity and
 * the reject lifecycle to donations (on top of v4's QR codes, donations, and
 * structured social posts).
 */
const DATA_VERSION = "v5";

/**
 * A tiny, dependency-free inline-SVG "QR" placeholder as a data URL. It is NOT
 * a scannable code — the demo never processes payments — but it gives each
 * method a distinct, deterministic graphic without any remote asset.
 */
function placeholderQr(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells: string[] = [];
  const grid = 7;
  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid; x += 1) {
      // Deterministic pseudo-random fill from the seed hash.
      const bit = (h >>> ((y * grid + x) % 31)) & 1;
      const corner =
        (x < 2 && y < 2) || (x > grid - 3 && y < 2) || (x < 2 && y > grid - 3);
      if (bit || corner) {
        cells.push(`<rect x="${x * 8 + 6}" y="${y * 8 + 6}" width="8" height="8"/>`);
      }
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
    `<rect width="80" height="80" rx="10" fill="#fff"/>` +
    `<g fill="#0b1f33">${cells.join("")}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Build a fictional QR entry for a method. */
function makeQr(athleteId: number, method: string, label: string): QrCode {
  return {
    id: `qr-${athleteId}-${method.toLowerCase().replace(/\s+/g, "-")}`,
    method,
    label,
    image: placeholderQr(`${athleteId}-${method}`),
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
      makeQr(first.id, "GCash", "J. Santos · 0917•••1234"),
      makeQr(first.id, "Maya", "J. Santos · 0917•••1234"),
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
  /** Published payment QR codes keyed by athlete id. */
  qrCodes: Record<number, QrCode[]>;
  /** All QR-based donations across the demo (pending + confirmed). */
  donations: Donation[];

  login: (role: Role) => void;
  logout: () => void;
  getAthlete: (id: number) => Athlete | undefined;
  openDonation: (athlete: Athlete) => void;
  closeDonation: () => void;
  // QR management (athlete side).
  getQrCodes: (athleteId: number) => QrCode[];
  addQrCode: (athleteId: number, method: string, label: string, image?: string) => void;
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
  const [qrCodes, setQrCodes] = useState<Record<number, QrCode[]>>(() => seedQrCodes(seedAthletes));
  const [donations, setDonations] = useState<Donation[]>([]);

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
      setRole(savedRole ?? null);
      if (savedVersion === DATA_VERSION || savedVersion === "v4" || savedVersion === "v3") {
        if (savedAthletes) setAthletes(JSON.parse(savedAthletes) as Athlete[]);
        if (savedQr) setQrCodes(JSON.parse(savedQr) as Record<number, QrCode[]>);
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
      } else {
        // Reset stale caches when the combined payment and social data shape changes.
        setAthletes(seedAthletes);
        setPosts(seedPosts);
        setQrCodes(seedQrCodes(seedAthletes));
        setDonations([]);
        window.localStorage.removeItem("starlete-athletes");
        window.localStorage.removeItem("starlete-posts");
        window.localStorage.removeItem("starlete-qr");
        window.localStorage.removeItem("starlete-donations");
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
    } catch {
      // ignore
    }
  }, [athletes, posts, qrCodes, donations, mounted]);

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

  const openDonation = useCallback((athlete: Athlete) => setDonationTarget(athlete), []);
  const closeDonation = useCallback(() => setDonationTarget(null), []);

  // --- QR management -------------------------------------------------------
  const getQrCodes = useCallback(
    (athleteId: number) => qrCodes[athleteId] ?? [],
    [qrCodes],
  );

  const addQrCode = useCallback(
    (athleteId: number, method: string, label: string, image?: string) => {
      setQrCodes((map) => {
        const existing = map[athleteId] ?? [];
        const qr: QrCode = {
          id: `qr-${athleteId}-${Date.now()}`,
          method,
          label,
          image: image || placeholderQr(`${athleteId}-${method}-${Date.now()}`),
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

  const submitDonation = useCallback<StarleteState["submitDonation"]>((input) => {
    const donation = createPendingDonation({ ...input, supporterId: SUPPORTER_ID }) as Donation;
    setDonations((list) => [donation, ...list]);
    return donation;
  }, []);

  const confirmDonation = useCallback((donationId: string) => {
    setDonations((list) =>
      list.map((d) => (d.id === donationId ? (confirmDonationRecord(d, "athlete") as Donation) : d)),
    );
  }, []);

  const rejectDonation = useCallback((donationId: string, reason: string, note?: string) => {
    setDonations((list) =>
      list.map((d) =>
        d.id === donationId ? (rejectDonationRecord(d, reason, note ?? "") as Donation) : d,
      ),
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
  }, []);

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
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = p.likedBy.includes(actorId);
        const likedBy = liked
          ? p.likedBy.filter((id) => id !== actorId)
          : [...p.likedBy, actorId];
        return { ...p, likedBy, likes: p.likes + (liked ? -1 : 1) };
      }),
    );
  }, []);

  const addComment = useCallback(
    (postId: string, authorId: ActorId, authorName: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [
                  ...p.comments,
                  {
                    id: newId("cmt"),
                    authorId,
                    authorName,
                    text: trimmed,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : p,
        ),
      );
    },
    [],
  );

  const value = useMemo<StarleteState>(
    () => ({
      mounted,
      role,
      athletes: reconciledAthletes,
      posts,
      donationTarget,
      qrCodes,
      donations,
      login,
      logout,
      getAthlete,
      openDonation,
      closeDonation,
      getQrCodes,
      addQrCode,
      replaceQrCode,
      removeQrCode,
      submitDonation,
      confirmDonation,
      rejectDonation,
      getDonationsForAthlete,
      supporterId,
      getDonationsForSupporter,
      addPost,
      editPost,
      deletePost,
      toggleLike,
      addComment,
    }),
    [
      mounted, role, reconciledAthletes, posts, donationTarget, qrCodes, donations,
      login, logout, getAthlete, openDonation, closeDonation,
      getQrCodes, addQrCode, replaceQrCode, removeQrCode,
      submitDonation, confirmDonation, rejectDonation, getDonationsForAthlete,
      supporterId, getDonationsForSupporter, addPost, editPost, deletePost, toggleLike, addComment,
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
