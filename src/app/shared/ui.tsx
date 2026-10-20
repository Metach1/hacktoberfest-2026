"use client";

import { ReactNode } from "react";
import Link from "next/link";
import type { Athlete } from "@/src/app/data/athletes";

/** Format a number as Philippine pesos. */
export const peso = (value: number) => `₱${value.toLocaleString("en-PH")}`;

/** Stock demo imagery used across hero/community sections. */
export const photos = {
  hero: "https://images.unsplash.com/photo-1535725213980-3cddc939d616?auto=format&fit=crop&w=1400&q=85",
  runner: "https://images.unsplash.com/photo-1658911200109-a65fe8919a3e?auto=format&fit=crop&w=900&q=85",
  boxer: "https://images.unsplash.com/photo-1681203888755-bd61fe3558eb?auto=format&fit=crop&w=900&q=85",
  basketball: "https://images.unsplash.com/photo-1580442256395-d9c32a65fbf6?auto=format&fit=crop&w=900&q=85",
  swimmer: "https://images.unsplash.com/photo-1772203031513-4a20f7478ad9?auto=format&fit=crop&w=900&q=85",
  track: "https://images.unsplash.com/photo-1728532483490-708f6562b738?auto=format&fit=crop&w=900&q=85",
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    back: <><path d="m15 18-6-6 6-6" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    spark: <><path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z" /><path d="m5 14-.7 2.3L2 17l2.3.7L5 20l.7-2.3L8 17l-2.3-.7L5 14Z" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

/** Brand mark that links home. */
export function Logo() {
  return <Link className="logo" href="/" aria-label="Starlete home"><img className="logo-mark" src="/logo.svg" alt="" width={32} height={32} /><span>starlete</span></Link>;
}

export function Progress({ value }: { value: number }) {
  return <div className="progress"><span style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}

/** Athlete summary card that links to the athlete's profile route. */
export function AthleteCard({ athlete }: { athlete: Athlete }) {
  const percent = Math.round((athlete.raised / athlete.goal) * 100);
  return (
    <Link className="athlete-card" href={`/athletes/${athlete.id}`}>
      <div className="card-image">
        <img src={athlete.image} alt={`${athlete.name}, ${athlete.sport} athlete`} />
        <span className="sport-pill">{athlete.sport}</span>
        <button type="button" className="heart-button" aria-label={`Save ${athlete.name}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}><Icon name="heart" size={18} /></button>
      </div>
      <div className="card-content">
        <div className="name-line"><h3>{athlete.name}</h3>{athlete.verified && <span className="verified" title="Verified athlete"><Icon name="check" size={12} /></span>}</div>
        <p className="location"><Icon name="pin" size={15} />{athlete.location}</p>
        <Progress value={percent} />
        <div className="funding-line"><span><strong>{peso(athlete.raised)}</strong> raised</span><span>{percent}%</span></div>
        <span className="card-link">View story <Icon name="arrow" size={16} /></span>
      </div>
    </Link>
  );
}

/** Small reusable link styled as a button. */
export function MiniAthlete({ athlete, rank }: { athlete: Athlete; rank: number }) {
  return (
    <Link className="mini-athlete" href={`/athletes/${athlete.id}`}>
      <b>0{rank}</b>
      <img src={athlete.image} alt="" />
      <span><strong>{athlete.name}</strong><small>{athlete.sport} · {athlete.location}</small></span>
      <Icon name="arrow" />
    </Link>
  );
}

