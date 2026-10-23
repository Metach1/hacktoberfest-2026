"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Icon } from "@/src/app/shared/ui";
import { AthleteProfileView } from "@/src/app/shared/athlete-profile-view";
import { useStarlete } from "@/src/app/store";
import { useSession } from "@/src/app/shared/session-provider";
import { getPublicAthleteProfile } from "@/src/app/services/profile";
import { toAthlete } from "@/src/app/lib/profile-adapter";
import { confirmedTotalsByProfile } from "@/src/app/lib/donations.mjs";
import type { Athlete } from "@/src/app/data/athletes";
import { REGION_MAP } from "@/src/app/lib/region-map";

export function AthleteProfileScreen({ id }: { id: string }) {
  const { getAthlete, role, openDonation, posts, mounted, donations } = useStarlete();
  const { user } = useSession();
  const router = useRouter();
  const numericId = /^\d+$/.test(id) ? Number(id) : null;
  const demoAthlete = numericId == null ? undefined : getAthlete(numericId);
  const [registeredAthlete, setRegisteredAthlete] = useState<Athlete | null>(null);
  const [profileLoading, setProfileLoading] = useState(numericId == null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (numericId != null) return;
    let active = true;
    getPublicAthleteProfile(id)
      .then((profile) => {
        if (active && profile) setRegisteredAthlete(toAthlete(profile, -1));
      })
      .catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : "Could not load this athlete profile.");
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => { active = false; };
  }, [id, numericId]);

  // Reconcile a registered athlete's funding totals against the store's
  // donations. toAthlete() seeds raised/supporters at 0 and is sourced outside
  // the store's reconciledAthletes, so confirmed donations (matched by the
  // stable Supabase profile id) must be folded in here or "Raised so far"
  // would always read ₱0. Demo/seed athletes are already reconciled by the
  // store, so they pass through untouched.
  const reconciledRegistered = registeredAthlete
    ? (() => {
        const { total, count } = confirmedTotalsByProfile(donations, registeredAthlete.profileId ?? "");
        return { ...registeredAthlete, raised: total, supporters: count };
      })()
    : null;
  const athlete = demoAthlete ?? reconciledRegistered;
  const searchParams = useSearchParams();

  // "Back to athletes" returns to the region the user came from, when a valid
  // `?from=<regionCode>` was threaded through the originating link. Otherwise it
  // falls back to the full Discover map.
  const fromParam = searchParams.get("from");
  const backHref = fromParam && REGION_MAP.regions.some((r) => r.regionCode === fromParam)
    ? `/discover?region=${encodeURIComponent(fromParam)}`
    : "/discover";

  // Until the store hydrates, the athlete list may be the default seed; once
  // mounted, an unknown id is a genuine 404.
  if (!athlete) {
    if (profileLoading) return <main className="profile-page"><p className="muted-line">Loading athlete profile…</p></main>;
    if (profileError) return <main className="profile-page"><p className="field-error" role="alert">{profileError}</p></main>;
    if (mounted || numericId == null) notFound();
    return null;
  }

  // The signed-in athlete is viewing their OWN public profile when the session
  // user id matches this profile's Supabase owner id — only then do we surface
  // the "Edit profile" affordance and hide the Support button.
  const isOwnProfile = !!user?.id && !!athlete.profileId && user.id === athlete.profileId;
  const athletePosts = posts
    .filter((post) => athlete.profileId
      ? post.ownerId === athlete.profileId
      : post.authorAthleteId === athlete.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const onSupport = () => {
    if (!role) {
      router.push("/login");
      return;
    }
    openDonation(athlete);
  };

  return (
    <main className="profile-page">
      <Link className="back-button" href={backHref}><Icon name="back" /> Back to athletes</Link>
      <AthleteProfileView
        athlete={athlete}
        isOwner={isOwnProfile}
        showSupport={role !== "athlete"}
        onSupport={onSupport}
        posts={athletePosts}
      />
    </main>
  );
}
