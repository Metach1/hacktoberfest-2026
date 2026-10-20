"use client";

import Link from "next/link";
import { AthleteCard, Icon, photos } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";

export function LandingScreen() {
  const { athletes } = useStarlete();
  const featured = athletes.find(a => a.featured) ?? athletes[0];
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow light">Built for Filipino dreamers</span>
          <h1>Every Champion<br />Has a Story.<br /><em>Help Them Go Further.</em></h1>
          <p>Back the next generation of Filipino athletes. Your support powers training, travel, gear, and dreams that go beyond the finish line.</p>
          <div className="hero-actions"><Link className="button gold" href="/discover">Discover athletes <Icon name="arrow" size={18} /></Link><Link className="text-button light" href="/register">Start your journey</Link></div>
          <div className="community-row"><div className="avatars"><img src={photos.boxer} alt="" /><img src={photos.runner} alt="" /><img src={photos.basketball} alt="" /></div><span><strong>4,200+</strong> supporters already cheering</span></div>
        </div>
        <div className="hero-visual">
          <img src={photos.hero} alt="Female track athlete ready to compete" />
          <div className="floating-card"><span className="pulse-dot" /><div><strong>Dreams in motion</strong><small>₱2.8M raised this year</small></div></div>
          <div className="hero-label"><span>Featured story</span><strong>{featured?.name}</strong><small>{featured?.sport} · {featured?.location}</small></div>
        </div>
      </section>

      <section className="trust-strip"><p>Funding real journeys across the Philippines</p><div><span>₱12.4M <small>total raised</small></span><span>860+ <small>athletes supported</small></span><span>32 <small>sports represented</small></span><span>78 <small>provinces reached</small></span></div></section>

      <section className="section">
        <div className="section-head"><div><span className="eyebrow">Meet the dreamers</span><h2>Stories worth cheering for</h2></div><Link className="text-button" href="/discover">Explore all athletes <Icon name="arrow" size={18} /></Link></div>
        <div className="card-grid">{athletes.filter(a => a.featured).map(a => <AthleteCard key={a.id} athlete={a} />)}</div>
      </section>

      <section className="how-section" id="how">
        <div className="how-intro"><span className="eyebrow light">Simple. Transparent. Powerful.</span><h2>Your support changes the game.</h2><p>From finding an athlete whose story moves you to celebrating their next milestone—it only takes a few minutes.</p></div>
        <div className="steps">
          <div className="step"><b>01</b><span className="step-icon"><Icon name="search" /></span><h3>Find your athlete</h3><p>Explore stories by sport, location, or goals that inspire you.</p></div>
          <div className="step"><b>02</b><span className="step-icon"><Icon name="heart" /></span><h3>Choose your support</h3><p>Give any amount through a simulated, transparent checkout.</p></div>
          <div className="step"><b>03</b><span className="step-icon"><Icon name="spark" /></span><h3>Follow the journey</h3><p>Get updates and celebrate every breakthrough together.</p></div>
        </div>
      </section>
      <section className="cta"><div><span className="eyebrow light">Every peso moves a dream forward</span><h2>The next Filipino champion is already training.</h2></div><Link className="button gold" href="/discover">Find an athlete <Icon name="arrow" /></Link></section>
    </main>
  );
}
