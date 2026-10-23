"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Icon, Progress, peso } from "@/src/app/shared/ui";
import { PostCard } from "@/src/app/shared/post-card";
import { DonationsPanel } from "@/src/app/shared/donations-panel";
import { useStarlete } from "@/src/app/store";
import { getPublicAthleteProfile } from "@/src/app/services/profile";
import { toAthlete } from "@/src/app/lib/profile-adapter";
import { confirmedTotalsByProfile } from "@/src/app/lib/donations.mjs";
import type { Athlete } from "@/src/app/data/athletes";
import { REGION_MAP } from "@/src/app/lib/region-map";

export function AthleteProfileScreen({ id }: { id: string }) {
  const { getAthlete, role, openDonation, posts, postsLoading, postError, mounted, donations } = useStarlete();
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

  const percent = athlete.goal > 0 ? Math.round((athlete.raised / athlete.goal) * 100) : 0;
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
      <section className="profile-hero">
        <div className="profile-photo"><img src={athlete.image} alt={athlete.name} /><span>Photo from athlete profile</span></div>
        <div className="profile-summary">
          <span className="sport-pill inline">{athlete.sport}</span>
          <div className="name-line large"><h1>{athlete.name}</h1>{athlete.verified && <span className="verified"><Icon name="check" size={14} /></span>}</div>
          <p className="location"><Icon name="pin" />{athlete.location}, Philippines</p>
          <p className="profile-bio">{athlete.bio}</p>
          <div className="achievement"><span><Icon name="spark" /></span><div><small>Proudest achievement</small><strong>{athlete.achievement}</strong></div></div>
        </div>
        <aside className="support-card">
          <small>Raised so far</small><strong>{peso(athlete.raised)}</strong><span>of {peso(athlete.goal)} goal</span>
          <Progress value={percent} />
          <div className="support-stats"><span><b>{percent}%</b> funded</span><span><b>{athlete.supporters}</b> supporters</span></div>
          {role !== "athlete" && <button className="button full gold" onClick={onSupport}>Support {athlete.name.split(" ")[0]} <Icon name="heart" /></button>}
          <p className="safe-note"><Icon name="shield" size={16} /> Demo payments only. No real transaction.</p>
          <DonationsPanel athleteId={athlete.id} />
        </aside>
      </section>
      <section className="profile-content">
        <div><span className="eyebrow">The journey</span><h2>Chasing a bigger dream</h2><p>Every training session is a step closer to carrying the Philippine flag on a larger stage. Support covers essential coaching, nutrition, equipment, and the travel required to compete against the best.</p><div className="quote">&ldquo;I&rsquo;m not only running for myself. I&rsquo;m running for every young athlete back home who needs to see that we belong on the world stage.&rdquo;</div></div>
        <div><span className="eyebrow">Latest updates</span>{postError && <p className="field-error" role="alert">{postError}</p>}<div className="profile-feed">{postsLoading ? <article className="post"><p>Loading posts…</p></article> : athletePosts.length ? athletePosts.map((p) => <PostCard key={p.id} post={p} showAuthor={false} />) : <article className="post"><p>No updates yet. Check back soon.</p></article>}</div></div>
      </section>
    </main>
  );
}
