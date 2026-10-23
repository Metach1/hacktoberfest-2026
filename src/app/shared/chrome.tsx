"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, Logo } from "@/src/app/shared/ui";
import { DonationModal } from "@/src/app/shared/donation";
import { useStarlete } from "@/src/app/store";
import { REGION_MAP } from "@/src/app/lib/region-map";
import {
  EDIT_PROFILE_HREF,
  LOGOUT_HREF,
  avatarInitials,
  isDismissKey,
  profileMenuItems,
} from "@/src/app/lib/profile-menu.mjs";

/** Relative "time ago" label for a notification's epoch-ms timestamp. */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Notifications bell + dropdown panel. The unread badge and list are scoped to
 * the current role's audience by the store. The panel dismisses on outside
 * click and Escape; opening it marks everything read.
 */
function NotificationsBell() {
  const { getNotifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useStarlete();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const items = getNotifications();

  // Clicking a notification marks it read, navigates to its tab, and closes.
  const openNotification = (n: { id: string; href?: string }) => {
    markNotificationRead(n.id);
    setOpen(false);
    if (n.href) router.push(n.href);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="notif" ref={wrapRef}>
      <button
        className="icon-only notif-bell"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" />
        {unreadCount > 0 && <span className="notif-badge" aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-head">
            <strong>Notifications</strong>
            {items.some((n) => !n.read) && (
              <button className="text-button" onClick={() => markAllNotificationsRead()}>Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="notif-empty muted-line">You&rsquo;re all caught up.</p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={n.read ? "notif-item" : "notif-item unread"}
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => openNotification(n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openNotification(n);
                    }
                  }}
                >
                  <div className="notif-item-main">
                    <strong>{n.title}</strong>
                    <small>{timeAgo(n.createdAt)}</small>
                  </div>
                  <p>{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Profile avatar button + dropdown menu (header, signed-in only). The circle
 * toggles a menu with "Edit profile" and "Log out". The menu dismisses on
 * outside click, Escape, and after an option is picked — mirroring the
 * notifications panel. Both demo roles (athlete, supporter) have an editable
 * account at /dashboard/edit, so the Edit profile option is always shown.
 */
function ProfileMenu({ onNavigate }: { onNavigate: () => void }) {
  const { role, logout, athletes } = useStarlete();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const athleteName = athletes[0]?.name;
  const initials = avatarInitials(role, athleteName);
  const label = role === "athlete" ? athleteName ?? "Your profile" : "Your account";
  const roleLabel = role === "athlete" ? "Athlete" : "Supporter";
  const items = profileMenuItems(role);
  const iconFor: Record<string, string> = { "edit-profile": "users", logout: "logout" };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isDismissKey(e.key)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Run an option: close the menu and the mobile nav, then act. "logout" ends
  // the session first so protected routes redirect afterward, then lands home.
  const runItem = (id: string, href?: string) => {
    setOpen(false);
    onNavigate();
    if (id === "logout") {
      logout();
      router.push(LOGOUT_HREF);
      return;
    }
    router.push(href ?? EDIT_PROFILE_HREF);
  };

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button
        type="button"
        className="nav-user"
        aria-label={`Account menu for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {initials}
      </button>

      {open && (
        <div className="profile-panel" role="menu" aria-label="Account menu">
          <div className="profile-panel-head">
            <strong>{label}</strong>
            <small>{roleLabel}</small>
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="profile-menu-item"
              role="menuitem"
              onClick={() => runItem(item.id, item.href)}
            >
              <Icon name={iconFor[item.id] ?? "dots"} size={18} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useStarlete();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // The Discover link is region-aware: when the user is on an athlete profile
  // that was opened from a region (/athletes/<id>?from=<regionCode>), Discover
  // returns to that region — matching the profile's "Back to athletes". In
  // every other context it resets to the plain /discover full map.
  //
  // The destination is computed FRESH at click time from the live URL
  // (window.location), not from a render-time snapshot. A render-time
  // useSearchParams value could go stale after a soft navigation and leak the
  // region context onto an unrelated page; reading at click time guarantees it
  // reflects the current page.
  const goToDiscover = () => {
    close();
    let dest = "/discover";
    const match = /^\/athletes\/[^/]+$/.test(window.location.pathname);
    if (match) {
      const from = new URLSearchParams(window.location.search).get("from");
      if (from && REGION_MAP.regions.some((r) => r.regionCode === from)) {
        dest = `/discover?region=${encodeURIComponent(from)}`;
      }
    }
    router.push(dest);
  };

  return (
    <header className="header">
      <div className="header-inner">
        <Logo />
        <nav className={open ? "nav open" : "nav"}>
          <button type="button" className={isActive("/discover") ? "nav-link active" : "nav-link"} onClick={goToDiscover}>Discover</button>
          <Link className={isActive("/feed") ? "active" : ""} href="/feed" onClick={close}>Feed</Link>
          <Link href="/#how" onClick={close}>How it works</Link>
          {role ? (
            <>
              <Link className={isActive("/dashboard") ? "active" : ""} href="/dashboard" onClick={close}>Dashboard</Link>
              <NotificationsBell />
              <ProfileMenu onNavigate={close} />
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
  // The landing page uses a deep-blue header/footer treatment; the marker class
  // lets the shared chrome restyle without duplicating header/footer markup.
  const home = pathname === "/";
  return (
    <div className={home ? "app home-app" : "app"}>
      {!authPage && <Header />}
      {children}
      {!authPage && <Footer />}
      <DonationModal />
    </div>
  );
}
