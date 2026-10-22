"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { Icon, Progress, peso } from "@/src/app/shared/ui";
import { PostCard } from "@/src/app/shared/post-card";
import { DonationsPanel } from "@/src/app/shared/donations-panel";
import { useStarlete } from "@/src/app/store";
import { useAsync } from "@/src/app/shared/async-state";
import { getPostsForCatalogAthlete } from "@/src/app/services/feed";

export function AthleteProfileScreen({ id }: { id: number }) {
  const { getAthlete, role, openDonation, mounted } = useStarlete();
  const router = useRouter();
  const athlete = getAthlete(id);

  // Latest updates for this athlete come from the database (showcase posts).
  const { data: athletePosts, loading: postsLoading, reload: reloadPosts } = useAsync(
    () => getPostsForCatalogAthlete(id),
    [id],
  );

  // Until the store hydrates, the athlete list may be the default seed; once
  // mounted, an unknown id is a genuine 404.
  if (!athlete) {
    if (mounted) notFound();
    return null;
  }

  const percent = Math.round((athlete.raised / athlete.goal) * 100);

  const onSupport = () => {
    if (!role) {
      router.push("/login");
      return;
    }
    openDonation(athlete);
  };

  return (
    <main className="profile-page">
      <Link className="back-button" href="/discover"><Icon name="back" /> Back to athletes</Link>
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
        <div><span className="eyebrow">Latest updates</span><div className="profile-feed">{postsLoading ? <article className="post"><p>Loading updates…</p></article> : athletePosts && athletePosts.length ? athletePosts.map((p) => <PostCard key={p.id} post={p} showAuthor={false} onChanged={reloadPosts} />) : <article className="post"><p>No updates yet. Check back soon.</p></article>}</div></div>
      </section>
    </main>
  );
}
