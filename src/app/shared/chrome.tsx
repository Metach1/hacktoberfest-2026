"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, Logo } from "@/src/app/shared/ui";
import { DonationModal } from "@/src/app/shared/donation";
import { useSession } from "@/src/app/shared/session-provider";

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, displayName, signOut: endSession } = useSession();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const initials = (displayName ?? "")
    .split(" ")
    .map(p => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ME";

  const signOut = async () => {
    await endSession();
    close();
    router.push("/");
  };

  return (
    <header className="header">
      <div className="header-inner">
        <Logo />
        <nav className={open ? "nav open" : "nav"}>
          <Link className={isActive("/discover") ? "active" : ""} href="/discover" onClick={close}>Discover</Link>
          <Link className={isActive("/feed") ? "active" : ""} href="/feed" onClick={close}>Feed</Link>
          <Link href="/#how" onClick={close}>How it works</Link>
          {role ? (
            <>
              <Link className={isActive("/dashboard") ? "active" : ""} href="/dashboard" onClick={close}>Dashboard</Link>
              <Link className="nav-user" href="/dashboard/edit" onClick={close}>{initials}</Link>
              <button className="icon-only" onClick={signOut} aria-label="Log out"><Icon name="logout" /></button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={close}>Log in</Link>
              <Link className="button small" href="/register" onClick={close}>Join Startlete</Link>
            </>
          )}
        </nav>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name={open ? "close" : "menu"} /></button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <Logo />
      <p>Backing Filipino athletes, one story at a time.</p>
      <span>© 2025 Startlete. Demo experience only.</span>
    </footer>
  );
}

/**
 * Shared app chrome rendered once in the root layout. Header and footer are
 * hidden on the standalone auth routes. The donation modal lives here so it can
 * be opened from any route and survives client-side navigation.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const authPage = pathname === "/login" || pathname === "/register";
  return (
    <div className="app">
      {!authPage && <Header />}
      {children}
      {!authPage && <Footer />}
      <DonationModal />
    </div>
  );
}
