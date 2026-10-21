"use client";

import { useEffect, useState } from "react";
import { Icon, peso } from "@/src/app/shared/ui";
import { useStarlete, type Donation } from "@/src/app/store";
import {
  confirmedDonationsForAthlete,
  recentConfirmedDonations,
  topDonorsForAthlete,
} from "@/src/app/lib/donations.mjs";

/** A ranked donor row as returned by topDonorsForAthlete. */
interface DonorRank {
  donor: string;
  total: number;
  count: number;
  latestAt: number;
}

/** Local, stable short date for a donation's epoch-ms timestamp. */
function donationDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

/** Initials avatar for a donor display name (no remote images). */
function DonorAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return <span className="donor-initials" aria-hidden="true">{initials}</span>;
}

/**
 * A lightweight, mobile-friendly popup dismissible via close button, outside
 * click, and Escape. Mirrors the app's existing `.modal-backdrop` / `.modal`
 * pattern and the Escape handling used by the donation modal.
 */
function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal small-modal donations-popup"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <span className="eyebrow">Donations</span>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/**
 * GoFundMe-style confirmed-donations section for an athlete's public profile.
 * Shows the five latest confirmed donations inline, the confirmed-donation
 * count, and "See all" / "See top" popups. Pending and rejected donations — and
 * receipts — are never shown here. Donor identities come from the donation's
 * entered display name; see `donorKey` for the demo identity limitation.
 */
export function DonationsPanel({ athleteId }: { athleteId: number }) {
  const { getDonationsForAthlete } = useStarlete();
  const [popup, setPopup] = useState<null | "all" | "top">(null);

  // getDonationsForAthlete returns every status; the helpers below keep only
  // confirmed donations, so pending/rejected never surface here.
  const all = getDonationsForAthlete(athleteId);
  const confirmed = confirmedDonationsForAthlete(all, athleteId) as Donation[];
  const recent = recentConfirmedDonations(all, athleteId, 5) as Donation[];
  const topDonors = topDonorsForAthlete(all, athleteId) as DonorRank[];
  const count = confirmed.length;

  return (
    <div className="donations-panel">
      <div className="donations-head">
        <strong>{count} {count === 1 ? "donation" : "donations"}</strong>
        {count > 0 && (
          <div className="donations-tabs">
            <button className="text-button" onClick={() => setPopup("top")}>See top</button>
            <button className="text-button" onClick={() => setPopup("all")}>See all</button>
          </div>
        )}
      </div>

      {count === 0 ? (
        <p className="donations-empty muted-line">
          No confirmed donations yet. Be the first to support this athlete.
        </p>
      ) : (
        <ul className="donation-list">
          {recent.map((d) => (
            <li className="donation-item" key={d.id}>
              <DonorAvatar name={d.supporterName} />
              <div className="donation-item-meta">
                <strong>{d.supporterName}</strong>
                <small>{donationDate(d.createdAt)}</small>
              </div>
              <b>{peso(d.amount)}</b>
            </li>
          ))}
        </ul>
      )}

      {popup === "all" && (
        <Popup title={`All donations (${count})`} onClose={() => setPopup(null)}>
          <ul className="donation-list scroll">
            {confirmed.map((d) => (
              <li className="donation-item" key={d.id}>
                <DonorAvatar name={d.supporterName} />
                <div className="donation-item-meta">
                  <strong>{d.supporterName}</strong>
                  <small>{donationDate(d.createdAt)}</small>
                </div>
                <b>{peso(d.amount)}</b>
              </li>
            ))}
          </ul>
        </Popup>
      )}

      {popup === "top" && (
        <Popup title="Top donors" onClose={() => setPopup(null)}>
          <ul className="donation-list scroll">
            {topDonors.map((donor, i) => (
              <li className="donation-item" key={donor.donor}>
                <span className={i === 0 ? "rank first" : "rank"}>{i + 1}</span>
                <DonorAvatar name={donor.donor} />
                <div className="donation-item-meta">
                  <strong>{donor.donor}</strong>
                  <small>{donor.count} {donor.count === 1 ? "donation" : "donations"}</small>
                </div>
                <b>{peso(donor.total)}</b>
              </li>
            ))}
          </ul>
        </Popup>
      )}
    </div>
  );
}
