"use client";

import Link from "next/link";
import { Icon, Progress, peso } from "@/src/app/shared/ui";
import { PostCard } from "@/src/app/shared/post-card";
import { DonationsPanel } from "@/src/app/shared/donations-panel";
import { PhotoSlideshow } from "@/src/app/shared/photo-slideshow";
import type { Athlete } from "@/src/app/data/athletes";
import type { Post } from "@/src/app/data/posts";
import { proudestAchievement, sortNewestFirst } from "@/src/app/lib/achievements.mjs";

/**
 * Presentational athlete profile. Rendered by BOTH the live profile route and
 * the edit-page preview, so the two can never drift. It takes a plain `Athlete`
 * plus display options and renders no store state of its own — the preview
 * passes an unsaved draft athlete, the live page passes the stored one.
 *
 * Options:
 *  - preview      hides the funding/donations aside and the posts feed (there
 *                 is nothing to transact against an unsaved draft).
 *  - isOwner      shows the "Edit profile" button on the live page.
 *  - onSupport    supporter's "Support" handler (live page only).
 *  - posts        the athlete's posts (live page only).
 *  - showSupport  whether to render the Support button (false for the owner).
 */
export function AthleteProfileView({
  athlete,
  preview = false,
  isOwner = false,
  onSupport,
  posts = [],
  showSupport = true,
}: {
  athlete: Athlete;
  preview?: boolean;
  isOwner?: boolean;
  onSupport?: () => void;
  posts?: Post[];
  showSupport?: boolean;
}) {
  const percent = athlete.goal > 0 ? Math.round((athlete.raised / athlete.goal) * 100) : 0;
  const proudest = proudestAchievement(athlete.achievements) as Athlete["achievements"][number] | null;
  // Newest first, with the proudest pulled to the very top of the list.
  const ordered = sortNewestFirst(athlete.achievements) as Athlete["achievements"];
  const rest = proudest ? ordered.filter((a) => a.id !== proudest.id) : ordered;

  return (
    <>
      <section className="profile-hero">
        <PhotoSlideshow photos={athlete.photos} athleteName={athlete.name} />
        <div className="profile-summary">
          <span className="sport-pill inline">{athlete.sport}</span>
          <div className="name-line large">
            <h1>{athlete.name}</h1>
            {athlete.verified && <span className="verified"><Icon name="check" size={14} /></span>}
          </div>
          <p className="location"><Icon name="pin" />{athlete.location}, Philippines</p>
          {athlete.institution && (
            <p className="location institution"><Icon name="users" size={15} /><span className="institution-name">{athlete.institution}</span></p>
          )}
          <p className="profile-bio">{athlete.bio}</p>
          {proudest && (
            <div className="achievement">
              <span><Icon name="spark" /></span>
              <div>
                <small>Proudest achievement</small>
                <strong>{proudest.title}</strong>
                {(proudest.event || proudest.date) && (
                  <span className="achievement-meta">
                    {[proudest.event, proudest.date].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            </div>
          )}
          {isOwner && !preview && (
            <Link className="button small secondary edit-profile-link" href="/dashboard/edit">
              <Icon name="users" size={16} /> Edit profile
            </Link>
          )}
        </div>
        {!preview && (
          <aside className="support-card">
            <small>Raised so far</small><strong>{peso(athlete.raised)}</strong><span>of {peso(athlete.goal)} goal</span>
            <Progress value={percent} />
            <div className="support-stats"><span><b>{percent}%</b> funded</span><span><b>{athlete.supporters}</b> supporters</span></div>
            {showSupport && (
              <button className="button full gold" onClick={onSupport}>
                Support {athlete.name.split(" ")[0]} <Icon name="heart" />
              </button>
            )}
            <p className="safe-note"><Icon name="shield" size={16} /> Demo payments only. No real transaction.</p>
            <DonationsPanel athleteId={athlete.id} />
          </aside>
        )}
      </section>

      {rest.length > 0 && (
        <section className="profile-achievements">
          <span className="eyebrow">Achievements</span>
          <ul className="achievement-list">
            {rest.map((a) => (
              <li key={a.id} className="achievement-item">
                <div className="achievement-item-head">
                  <strong>{a.title}</strong>
                  {a.date && <small>{a.date}</small>}
                </div>
                {a.event && <p className="achievement-event">{a.event}</p>}
                {a.description && <p className="achievement-desc">{a.description}</p>}
              </li>
            ))}
          </ul>
          <p className="muted-line achievement-note">Achievements are self-reported by the athlete.</p>
        </section>
      )}

      <section className="profile-content">
        <div>
          <span className="eyebrow">The journey</span>
          <h2>Chasing a bigger dream</h2>
          <p>Every training session is a step closer to carrying the Philippine flag on a larger stage. Support covers essential coaching, nutrition, equipment, and the travel required to compete against the best.</p>
          <div className="quote">&ldquo;I&rsquo;m not only running for myself. I&rsquo;m running for every young athlete back home who needs to see that we belong on the world stage.&rdquo;</div>
        </div>
        {!preview && (
          <div>
            <span className="eyebrow">Latest updates</span>
            <div className="profile-feed">
              {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} showAuthor={false} />) : <article className="post"><p>No updates yet. Check back soon.</p></article>}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
