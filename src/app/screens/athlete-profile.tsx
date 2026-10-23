"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Icon } from "@/src/app/shared/ui";
import { AthleteProfileView } from "@/src/app/shared/athlete-profile-view";
import { useStarlete } from "@/src/app/store";
import { REGION_MAP } from "@/src/app/lib/region-map";

export function AthleteProfileScreen({ id }: { id: number }) {
  const { getAthlete, role, openDonation, posts, mounted, currentAthlete } = useStarlete();
  const router = useRouter();
  const searchParams = useSearchParams();
  const athlete = getAthlete(id);

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
    if (mounted) notFound();
    return null;
  }

  // Owner view: a logged-in athlete looking at their own profile (demo = the
  // first athlete). Owners get an "Edit profile" button and no Support button.
  const isOwner = role === "athlete" && currentAthlete?.id === athlete.id;

  const athletePosts = posts
    .filter((p) => p.authorAthleteId === athlete.id)
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
        isOwner={isOwner}
        showSupport={role !== "athlete"}
        onSupport={onSupport}
        posts={athletePosts}
      />
    </main>
  );
}
