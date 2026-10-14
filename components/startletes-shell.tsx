"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/browse", label: "Browse", icon: "browse" },
  { href: "/leaderboard", label: "Ranking", icon: "ranking" },
  { href: "/profile", label: "Profile", icon: "profile" },
] as const;

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
      <path d="M12 2.5 14.9 8l6 .9-4.4 4.2 1 6-5.5-3-5.5 3 1-6L3 8.9l6-.9L12 2.5Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" />
      <path d="M16 16l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M7 10a5 5 0 1 1 10 0v3.5l1.6 2.5H5.4L7 13.5V10Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-7H9v7H5a1 1 0 0 1-1-1v-8.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrowseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" />
      <path d="M16 16l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function RankingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M7 15.5V7m5 8.5V4m5 11.5v-6" strokeLinecap="round" />
      <path d="M4 19.5h16" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 18.5c1.8-2.6 4.1-4 7-4s5.2 1.4 7 4" strokeLinecap="round" />
    </svg>
  );
}

function IconSwitch({ name }: { name: string }) {
  switch (name) {
    case "home":
      return <HomeIcon />;
    case "browse":
      return <BrowseIcon />;
    case "ranking":
      return <RankingIcon />;
    case "profile":
      return <ProfileIcon />;
    default:
      return <HomeIcon />;
  }
}

export function StartletesShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#eef1f4] px-4 py-6 md:px-10">
      <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[26px] border border-[#dfe4ea] bg-[#f5f7f9] pb-3 shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
        <header className="flex items-center justify-between border-b border-[#dfe4ea] bg-[#f5f7f9] px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-[#dfe4ea]">
              <StarIcon />
            </div>
            <div className="text-[2.05rem] font-extrabold tracking-[-0.06em] text-slate-800">Startletes</div>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe4ea] bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="Search">
              <SearchIcon />
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe4ea] bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="Notifications">
              <BellIcon />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1d2735] text-sm font-bold text-white shadow-sm">JD</div>
          </div>
        </header>

        <main className="px-7 pb-1 pt-2">{children}</main>

        <nav className="mt-8 grid grid-cols-4 border-t border-[#dfe4ea] bg-white/90">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition ${
                  isActive ? "text-[#2d9cdb]" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <IconSwitch name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
