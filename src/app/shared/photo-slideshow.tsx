"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/src/app/shared/ui";
import type { AthletePhoto } from "@/src/app/data/athletes";
import { PHOTO_PLACEHOLDER, photoAlt } from "@/src/app/lib/athlete-photos.mjs";

/** How long each photo stays before auto-advancing (ms). */
const AUTOPLAY_INTERVAL = 4000;

/**
 * Accessible photo carousel for an athlete profile.
 *  - 0 photos  -> a clean placeholder, no controls.
 *  - 1 photo   -> the single photo (click to enlarge), no slideshow controls.
 *  - 2+ photos -> auto-plays with a fade transition, looping back to the first
 *    after the last, plus prev/next buttons, thumbnail dots, swipe, and arrow
 *    keys for manual control. The first slide is the profile picture.
 *
 * Clicking any photo opens a full-screen lightbox for closer viewing, which
 * keeps prev/next navigation and closes on the X, backdrop click, or Escape.
 *
 * Auto-play pauses on hover/focus and whenever the lightbox is open. It is
 * disabled entirely under prefers-reduced-motion.
 *
 * Accessibility: the viewport is a labelled carousel group; the live slide is
 * announced via aria-live; controls/dots are labelled; images have alt text.
 */
export function PhotoSlideshow({ photos, athleteName }: { photos: AthletePhoto[]; athleteName: string }) {
  const list = Array.isArray(photos) ? photos : [];
  const total = list.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Clamp at render time so removing photos while viewing can never point past
  // the end — no effect/setState needed (avoids a cascading render).
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;

  const go = useCallback(
    (next: number) => setIndex((cur) => {
      const base = total > 0 ? Math.min(cur, total - 1) : 0;
      const target = typeof next === "number" ? next : base;
      return total > 0 ? ((target % total) + total) % total : 0;
    }),
    [total],
  );
  const prev = useCallback(() => setIndex((c) => (total ? ((c - 1) % total + total) % total : 0)), [total]);
  const nextSlide = useCallback(() => setIndex((c) => (total ? (c + 1) % total : 0)), [total]);

  const openLightbox = () => setLightbox(true);
  const closeLightbox = useCallback(() => setLightbox(false), []);

  // Auto-advance on an interval. Paused on hover/focus, while the lightbox is
  // open, when there is only one photo, or under reduced-motion preference.
  useEffect(() => {
    if (total < 2 || paused || lightbox) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => nextSlide(), AUTOPLAY_INTERVAL);
    return () => window.clearInterval(timer);
  }, [total, paused, lightbox, nextSlide, safeIndex]);

  // Lightbox keyboard controls: Escape closes, arrows navigate.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") nextSlide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox, prev, nextSlide]);

  // No photos: clean placeholder, no controls.
  if (total === 0) {
    return (
      <div className="profile-photo">
        <img src={PHOTO_PLACEHOLDER} alt={`No photo available for ${athleteName}`} />
        <span>No photos yet</span>
      </div>
    );
  }

  const active = list[safeIndex];
  const activeSrc = active.src || PHOTO_PLACEHOLDER;
  const activeAlt = active.alt || photoAlt(athleteName, safeIndex, total);

  // Single photo: show it plainly (still clickable to enlarge), no controls.
  if (total === 1) {
    return (
      <>
        <div className="profile-photo">
          <button type="button" className="photo-zoom-btn" onClick={openLightbox} aria-label={`Enlarge photo of ${athleteName}`}>
            {/* key forces a fresh fade-in when the source changes */}
            <img key={activeSrc} className="slide-img" src={activeSrc} alt={activeAlt} />
          </button>
          <span>Photo from athlete profile</span>
        </div>
        {lightbox && (
          <Lightbox
            src={activeSrc}
            alt={activeAlt}
            label={`Photo 1 of 1 of ${athleteName}`}
            total={1}
            onClose={closeLightbox}
          />
        )}
      </>
    );
  }

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

  return (
    <>
      <div
        className="profile-photo slideshow"
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos of ${athleteName}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <button type="button" className="photo-zoom-btn" onClick={openLightbox} aria-label={`Enlarge photo ${safeIndex + 1} of ${total}`}>
          {/* key on the src re-triggers the fade-in animation each slide. */}
          <img
            key={activeSrc}
            className="slide-img"
            src={activeSrc}
            alt={activeAlt}
          />
        </button>

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

      {lightbox && (
        <Lightbox
          src={activeSrc}
          alt={activeAlt}
          label={`Photo ${safeIndex + 1} of ${total} of ${athleteName}`}
          total={total}
          onClose={closeLightbox}
          onPrev={prev}
          onNext={nextSlide}
        />
      )}
    </>
  );
}

/**
 * Full-screen enlarged view. Closes on the X button, a click on the dark
 * backdrop, or Escape (handled by the parent). When there is more than one
 * photo it exposes prev/next so viewers can browse while enlarged.
 */
function Lightbox({
  src,
  alt,
  label,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  src: string;
  alt: string;
  label: string;
  total: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="photo-lightbox-backdrop" onClick={onClose}>
      <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close enlarged photo"><Icon name="close" /></button>
        {total > 1 && onPrev && (
          <button type="button" className="slide-nav prev" aria-label="Previous photo" onClick={onPrev}><Icon name="back" /></button>
        )}
        <img key={src} className="slide-img" src={src} alt={alt} />
        {total > 1 && onNext && (
          <button type="button" className="slide-nav next" aria-label="Next photo" onClick={onNext}><Icon name="arrow" /></button>
        )}
      </div>
    </div>
  );
}
