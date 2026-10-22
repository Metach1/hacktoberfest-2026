"use client";

import Link from "next/link";
import { Icon, RegisteredAthleteCard } from "@/src/app/shared/ui";
import { ErrorState, useAsync } from "@/src/app/shared/async-state";
import { getPublicAthletes, type PublicAthlete } from "@/src/app/services/public-athletes";

const fundingNeeds = [
  { title: "Training and coaching", detail: "Consistent, focused preparation with experienced coaches." },
  { title: "Sports equipment", detail: "The gear and uniforms athletes need to train and compete." },
  { title: "Competition costs", detail: "Registration, travel, and accommodation for events." },
];

export function LandingScreen() {
  const { data: athletes, loading, error, reload } =
    useAsync<PublicAthlete[]>(getPublicAthletes, []);
  const featuredAthletes = athletes?.slice(0, 3) ?? [];

  return (
    <main className="funding-page">
      <section className="funding-hero">
        <div className="funding-hero-copy">
          <span className="funding-eyebrow">Fund Filipino potential</span>
          <h1>Every Dream Deserves a Chance to Compete.</h1>
          <p>
            Discover registered Filipino athletes, learn about their goals, and
            support them directly through the payment details they publish.
          </p>
          <div className="funding-actions">
            <Link className="button funding-primary" href="/discover">
              Find an athlete to support <Icon name="arrow" />
            </Link>
            <Link className="funding-secondary" href="/register">I&apos;m an athlete</Link>
          </div>
          <div className="funding-promise">
            <span />
            <p><strong>Back their journey.</strong> Support goes directly to athletes.</p>
          </div>
        </div>
        <div className="funding-hero-map">
          <img className="continuous-philippines-map" src="/philippines-outline.svg" alt="" aria-hidden="true" />
          <div className="funding-image-caption">
            <span>Startlete athlete community</span>
            <strong>Built by discipline. Moved by opportunity.</strong>
          </div>
        </div>
      </section>

      <section className="spotlight-section">
        <div className="funding-heading-row">
          <div>
            <span className="funding-eyebrow">Athlete community</span>
            <h2>Meet registered athletes.</h2>
          </div>
          <Link className="funding-link" href="/discover">Discover athletes <Icon name="arrow" /></Link>
        </div>
        {loading && <p className="muted-line">Loading athlete profiles…</p>}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && featuredAthletes.length > 0 && (
          <div className="card-grid spotlight-athlete-grid">
            {featuredAthletes.map((athlete) => (
              <RegisteredAthleteCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        )}
        {!loading && !error && !featuredAthletes.length && (
          <div className="empty-note"><p>No athletes have published payment details yet.</p></div>
        )}
      </section>

      <section className="needs-section" id="about">
        <div className="needs-intro">
          <span className="funding-eyebrow light">What support can make possible</span>
          <h2>Small Contributions. Real Opportunities.</h2>
          <p>Athletes set their own goals and share the costs they are working toward.</p>
        </div>
        <div className="needs-list-clean">
          {fundingNeeds.map((need, index) => (
            <article key={need.title}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div><h3>{need.title}</h3><p>{need.detail}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="process-section" id="how">
        <div className="funding-section-heading">
          <span className="funding-eyebrow">How direct support works</span>
          <h2>Support an athlete, directly.</h2>
        </div>
        <div className="process-steps">
          <article><b>01</b><h3>Discover</h3><p>Explore registered athlete profiles and their goals.</p></article>
          <article><b>02</b><h3>Send support</h3><p>Use an athlete&apos;s published GCash or Maya QR in your own wallet app.</p></article>
          <article><b>03</b><h3>Report your transfer</h3><p>Tell the athlete in Startlete so they can confirm they received it.</p></article>
        </div>
        <p className="safe-note">
          Startlete does not process, hold, or independently verify transfers. Confirmations are made by the receiving athlete.
        </p>
      </section>

      <section className="breakthrough-section">
        <div className="breakthrough-copy">
          <span className="funding-eyebrow light">For athletes</span>
          <h2>Share your goals with the community.</h2>
          <p>Create an athlete account, complete your profile, and publish your payment QR codes so supporters can find you.</p>
          <div className="funding-actions">
            <Link className="button funding-primary" href="/register">Join as an athlete <Icon name="arrow" /></Link>
            <Link className="funding-secondary light" href="/discover">Explore athletes</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
