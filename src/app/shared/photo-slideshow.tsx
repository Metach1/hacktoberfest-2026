"use client";

import { useRef, useState } from "react";
import { Icon } from "@/src/app/shared/ui";
import type { AthletePhoto } from "@/src/app/data/athletes";
import { PHOTO_PLACEHOLDER, photoAlt } from "@/src/app/lib/athlete-photos.mjs";

/**
 * Accessible photo carousel for an athlete profile. Behavior per the brief:
 *  - 0 photos  -> a clean placeholder, no controls.
 *  - 1 photo   -> the single photo, no controls (no slideshow).
 *  - 2+ photos -> prev/next buttons, thumbnail dots, swipe, and arrow keys.
 * No auto-play. The first slide is the profile picture (photos[0]).
 *
 * Accessibility: the viewport is a labelled group; the live slide is announced
 * via aria-live; controls and dots are labelled; every image has alt text.
 */
export function PhotoSlideshow({ photos, athleteName }: { photos: AthletePhoto[]; athleteName: string }) {
  const list = Array.isArray(photos) ? photos : [];
  const total = list.length;
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Clamp at render time so removing photos while viewing can never point past
  // the end — no effect/setState needed (avoids a cascading render).
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;

  // No photos: clean placeholder, no controls.
  if (total === 0) {
    return (
      <div className="profile-photo">
        <img src={PHOTO_PLACEHOLDER} alt={`No photo available for ${athleteName}`} />
        <span>No photos yet</span>
      </div>
    );
  }

  // Single photo: show it plainly, no slideshow controls.
  if (total === 1) {
    return (
      <div className="profile-photo">
        <img src={list[0].src || PHOTO_PLACEHOLDER} alt={list[0].alt || photoAlt(athleteName)} />
        <span>Photo from athlete profile</span>
      </div>
    );
  }

  const go = (next: number) => setIndex(((next % total) + total) % total);
  const prev = () => go(safeIndex - 1);
  const nextSlide = () => go(safeIndex + 1);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); nextSlide(); }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? nextSlide : prev)();
    touchStartX.current = null;
  };

  const active = list[safeIndex];

  return (
    <div
      className="profile-photo slideshow"
      role="group"
      aria-roledescription="carousel"
      aria-label={`Photos of ${athleteName}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={active.src || PHOTO_PLACEHOLDER}
        alt={active.alt || photoAlt(athleteName, safeIndex, total)}
      />
      {/* Announced to screen readers when the slide changes. */}
      <span className="sr-only" aria-live="polite">{`Slide ${safeIndex + 1} of ${total}`}</span>

      <button type="button" className="slide-nav prev" aria-label="Previous photo" onClick={prev}>
        <Icon name="back" />
      </button>
      <button type="button" className="slide-nav next" aria-label="Next photo" onClick={nextSlide}>
        <Icon name="arrow" />
      </button>

      <div className="slide-dots" role="tablist" aria-label="Choose photo">
        {list.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={i === safeIndex}
            aria-label={`Show photo ${i + 1} of ${total}`}
            className={i === safeIndex ? "slide-dot active" : "slide-dot"}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}
