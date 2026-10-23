"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon, peso } from "@/src/app/shared/ui";
import {
  figmaAthletes,
  athleteRegions,
  teamTrainingPhoto,
} from "@/src/app/screens/landing-figma-athletes";

/**
 * The practical costs athletes raise toward, shown in the deep-blue
 * "Small Contributions. Real Opportunities." section.
 */
const fundingNeeds = [
  { title: "Training and coaching", detail: "Time with coaches and access to consistent, focused preparation." },
  { title: "Sports equipment", detail: "The gear and uniforms required to train safely and compete well." },
  { title: "Competition registration", detail: "Entry costs for the events that give athletes a chance to progress." },
  { title: "Travel and accommodation", detail: "The practical cost of reaching competitions beyond their hometown." },
  { title: "Nutrition and recovery", detail: "Support for the routines that help athletes stay ready and resilient." },
];

/** Island-group labels for the three regional spotlight cards. */
const islandGroups = ["Luzon", "Visayas", "Mindanao"];

export function LandingScreen() {
  // Reveal sections as they scroll into view, matching the Figma design. The
  // observer is cleaned up on unmount; reduced-motion users get content shown
  // immediately via the CSS fallback.
  useEffect(() => {
    const elements = document.querySelectorAll(".funding-page .reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  // Spotlight: the first three Figma mock athletes (Mikaela, Paolo, Enzo).
  const spotlight = figmaAthletes.slice(0, 3);
  // Regional: Paolo (Luzon), Mikaela (Visayas), Althea (Mindanao), matching the
  // original Figma arrangement.
  const regional = [figmaAthletes[1], figmaAthletes[0], figmaAthletes[3]].filter(
    (athlete): athlete is (typeof figmaAthletes)[number] => Boolean(athlete),
  );

  return (
    <main className="funding-page">
      {/* The outline + stars map is a continuous backdrop behind the hero,
          spotlight, and needs sections. */}
      <div className="map-story">
        <img className="continuous-philippines-map" src="/philippines-outline.svg" alt="" aria-hidden="true" />
        <img className="continuous-philippines-stars" src="/philippines-stars.svg" alt="" aria-hidden="true" />

        <section className="funding-hero">
          <div className="funding-hero-copy">
            <span className="funding-eyebrow">Fund Filipino potential</span>
            <h1>Every Dream Deserves a Chance to Compete.</h1>
            <p>
              Across the Philippines, talented athletes are working toward something
              bigger. Your support can help provide the training, equipment, and
              opportunities they need to move forward.
            </p>
            <div className="funding-actions">
              <Link className="button funding-primary" href="/discover">
                Find an athlete to support <Icon name="arrow" />
              </Link>
              <Link className="funding-secondary" href="/register?role=athlete">I&apos;m an athlete</Link>
            </div>
            <div className="funding-promise">
              <span />
              <p><strong>Back their journey.</strong> Be part of their breakthrough.</p>
            </div>
          </div>
          <div className="funding-hero-map">
            <div className="funding-image-caption">
              <span>Philippine athletes</span>
              <strong>Built by discipline. Moved by opportunity.</strong>
            </div>
          </div>
        </section>

        <section className="spotlight-section reveal">
          <div className="funding-heading-row">
            <div>
              <span className="funding-eyebrow">Athlete spotlight</span>
              <h2>Meet the Athletes You&apos;re Moving Forward.</h2>
            </div>
            <Link className="funding-link" href="/discover">Discover all athletes <Icon name="arrow" /></Link>
          </div>
          <div className="spotlight-layout">
            {spotlight.map((athlete, index) => {
              const percent = Math.round((athlete.raised / athlete.goal) * 100);
              return (
                <article className={`spotlight-athlete spotlight-${index + 1}`} key={athlete.id}>
                  <div className="spotlight-photo">
                    <img
                      src={athlete.image}
                      alt={`${athlete.name}, ${athlete.sport}`}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                    <span>{athleteRegions[athlete.location] || athlete.region || athlete.location}</span>
                  </div>
                  <div className="spotlight-details">
                    <div className="spotlight-title">
                      <div><small>{athlete.sport}</small><h3>{athlete.name}</h3></div>
                      {athlete.verified && <span className="profile-status"><Icon name="check" size={13} /> Verified profile</span>}
                    </div>
                    <p>{athlete.bio}</p>
                    <div className="spotlight-achievement"><span>Current milestone</span><strong>{athlete.achievement}</strong></div>
                    <div className="progress"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                    <div className="spotlight-funding"><span><strong>{peso(athlete.raised)}</strong> raised</span><span>{peso(athlete.goal)} goal</span></div>
                    <Link className="funding-link" href="/discover">View story <Icon name="arrow" size={16} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
          {!spotlight.length && <p className="empty">Athlete stories are being prepared.</p>}
        </section>

        <section className="needs-section reveal" id="about">
          <div className="needs-intro">
            <span className="funding-eyebrow light">What support can make possible</span>
            <h2>Small Contributions. Real Opportunities.</h2>
            <p>Athletes share goals shaped by the practical costs of training and competing. Support can help move those goals closer without promising a particular result.</p>
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
      </div>

      <section className="process-section reveal" id="how">
        <div className="funding-section-heading">
          <span className="funding-eyebrow">How Starlete works</span>
          <h2>A straightforward way to stand behind an athlete.</h2>
        </div>
        <div className="process-steps">
          <article><b>01</b><h3>Discover</h3><p>Explore athletes, sports, locations, and the personal stories behind their goals.</p></article>
          <article><b>02</b><h3>Give</h3><p>Choose an athlete and contribute through Starlete&apos;s simulated funding experience.</p></article>
          <article><b>03</b><h3>Follow their journey</h3><p>Return for updates and achievements when athletes share what comes next.</p></article>
        </div>
      </section>

      <section className="regional-section reveal">
        <div className="regional-heading">
          <span className="funding-eyebrow">Across the archipelago</span>
          <h2>Talent Lives in Every Corner of the Philippines.</h2>
          <p>Discover athletes through the communities, cities, and regions that shaped their ambitions.</p>
        </div>
        <div className="regional-stories">
          {regional.map((athlete, index) => (
            <article key={athlete.id}>
              <Link href="/discover" aria-label={`View ${athlete.name}'s story`}>
                <img src={athlete.image} alt="" loading="lazy" />
              </Link>
              <span>{islandGroups[index]}</span>
              <h3>{athlete.name}</h3>
              <p>{athlete.sport} · {athlete.location}</p>
            </article>
          ))}
        </div>
        <Link className="funding-link regional-link" href="/discover">Explore athletes by location <Icon name="arrow" /></Link>
      </section>

      <section className="trust-section reveal">
        <div className="trust-copy">
          <span className="funding-eyebrow">Clear by design</span>
          <h2>Support With Confidence.</h2>
          <p>Trust begins with being direct about what this experience does—and what it does not do.</p>
        </div>
        <div className="trust-points">
          <article><Icon name="shield" /><div><h3>Profile clarity</h3><p>Athlete pages show their current profile status, story, funding goal, and demo progress.</p></div></article>
          <article><Icon name="heart" /><div><h3>Simulated payments</h3><p>No real transaction is processed and no actual money is transferred in this demo.</p></div></article>
          <article><Icon name="users" /><div><h3>Honest participation</h3><p>Supporters can explore the complete flow without entering real payment details.</p></div></article>
        </div>
      </section>

      <section className="breakthrough-section reveal">
        <div className="breakthrough-image">
          <img src={teamTrainingPhoto} alt="Athletes playing basketball together on an outdoor court" loading="lazy" />
        </div>
        <div className="breakthrough-copy">
          <span className="funding-eyebrow light">A milestone within reach</span>
          <h2>Be Part of Someone&apos;s Breakthrough.</h2>
          <p>Discover their potential. Support their journey. Help Filipino athletes reach their next milestone.</p>
          <div className="funding-actions">
            <Link className="button funding-primary" href="/discover">Support an athlete <Icon name="arrow" /></Link>
            <Link className="funding-secondary light" href="/register?role=athlete">Join as an athlete</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
