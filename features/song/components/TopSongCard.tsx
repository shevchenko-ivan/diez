"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HapticLink } from "@/shared/components/HapticLink";
import { useLiteMode } from "@/shared/components/LiteModeProvider";

export interface TopSongCardProps {
  slug: string;
  title: string;
  artist: string;
  coverImage?: string | null;
  coverColor?: string | null;
  index?: number;
}

// "Tap to open" reveal duration. Matches the iOS Photos zoom-in feel —
// noticeably longer than a click flash, short enough to not feel slow.
const REVEAL_MS = 520;

/**
 * Featured "Top popular" card — square vinyl-sleeve cover, no metadata
 * visible by default. Hover scales + reveals caption (desktop); touch
 * devices show caption always.
 *
 * On click the cover lifts off the page via a portal-rendered overlay
 * that translates + scales from its starting rect to the full viewport,
 * then navigation lands on /songs/[slug]. Using a portal means the
 * overlay isn't clipped by the strip's overflow-x:auto container — it
 * lives directly on document.body for the duration of the reveal.
 *
 * See `.top-song-card*` styles in globals.css.
 */
export function TopSongCard({
  slug,
  title,
  artist,
  coverImage,
  coverColor,
  index,
}: TopSongCardProps) {
  const lite = useLiteMode();
  const router = useRouter();
  const coverRef = useRef<HTMLDivElement>(null);
  // expandRect captures the cover's viewport position at the moment of
  // click. While non-null we render the portal overlay; null = idle.
  const [expandRect, setExpandRect] = useState<DOMRect | null>(null);
  // viewport snapshot — used to scale the overlay to fullscreen. Captured
  // at click time so a mid-animation orientation change can't desync the
  // final transform target.
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);
  // Two-phase state: first render places the overlay at rest at the cover's
  // rect; on the next frame we flip `animated` to trigger the CSS transition.
  // Browsers only animate between *committed* style states, hence the RAF.
  const [animated, setAnimated] = useState(false);
  // startTransition keeps the click responsive even if the destination's
  // data fetch lags — the reveal animation keeps running on the current
  // frame while React works on the route change in the background.
  const [, startTransition] = useTransition();

  const fallbackColor = coverColor || "#C8D5E8";
  const href = `/songs/${slug}`;

  // If the user navigates back (popstate) we'd otherwise leave the cover
  // still flagged as expanding when re-mounted. Clean up on unmount.
  useEffect(() => {
    return () => {
      setExpandRect(null);
      setAnimated(false);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (expandRect) return;
    // Honour browser open-in-new-tab gestures.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    const cover = coverRef.current;
    // No image (or lite-mode skipping it) → no overlay to morph, plain navigate.
    if (!cover || !coverImage || lite) return;

    e.preventDefault();
    const rect = cover.getBoundingClientRect();
    setExpandRect(rect);
    setViewport({ w: window.innerWidth, h: window.innerHeight });

    // Double-rAF so the overlay commits its rest state (rect position)
    // before transition-ing to the scaled-up state. A single rAF would
    // sometimes coalesce both states and skip the animation.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimated(true));
    });

    // Push slightly before the animation ends so the new page paints
    // during the final stretch of the reveal — feels like the page
    // emerges from behind the expanded cover rather than after it.
    window.setTimeout(() => {
      startTransition(() => router.push(href));
    }, REVEAL_MS - 140);
  };

  // Compute the final scale factors. Take the max so the overlay covers
  // the entire viewport even on aspect-ratio mismatches; the slight
  // overshoot crops gracefully via object-fit on the underlying image.
  let scaleX = 1;
  let scaleY = 1;
  if (expandRect && viewport) {
    scaleX = viewport.w / expandRect.width;
    scaleY = viewport.h / expandRect.height;
  }

  return (
    <>
      <HapticLink
        href={href}
        hapticType="strum"
        onClick={handleClick}
        className="top-song-card group block focus-visible:outline-none"
      >
        <div
          ref={coverRef}
          className="top-song-card-cover relative aspect-square overflow-hidden"
          style={{
            // Sharp square edges — vinyl-sleeve aesthetic.
            borderRadius: 0,
            background: `linear-gradient(145deg, ${fallbackColor}CC, ${fallbackColor}66)`,
            boxShadow:
              "0 6px 16px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
            // Hide the original during the reveal so the overlay reads as
            // the same artwork being lifted off the shelf, not a duplicate.
            opacity: expandRect ? 0 : 1,
            transition: expandRect ? "opacity 80ms ease-out" : undefined,
          }}
        >
          {coverImage && !lite && (
            <Image
              src={coverImage}
              alt={`Обкладинка пісні «${title}» — ${artist}`}
              title={`${title} — ${artist}`}
              fill
              sizes="(max-width: 768px) 45vw, 17vw"
              priority={typeof index === "number" && index < 6}
              className="object-cover"
            />
          )}
        </div>
        <div className="top-song-card-caption text-center mt-2 px-1">
          <p
            className="font-bold text-sm truncate"
            style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
          >
            {title}
          </p>
          <p
            className="text-xs truncate"
            style={{ color: "var(--text-muted)" }}
          >
            {artist}
          </p>
        </div>
      </HapticLink>

      {/* Expanding overlay — rendered into document.body via a portal so it
          escapes the strip's `overflow-x: auto` clipping. Stays mounted for
          the duration of the reveal; once the new page renders and the home
          page unmounts, the overlay disappears with it. */}
      {expandRect && viewport && coverImage && typeof document !== "undefined" &&
        createPortal(
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: `${expandRect.width}px`,
              height: `${expandRect.height}px`,
              backgroundImage: `url(${coverImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              zIndex: 9999,
              transformOrigin: "top left",
              transform: animated
                ? `translate(0px, 0px) scale(${scaleX}, ${scaleY})`
                : `translate(${expandRect.left}px, ${expandRect.top}px)`,
              transition: animated
                ? `transform ${REVEAL_MS}ms cubic-bezier(0.32, 0.72, 0.4, 1)`
                : "none",
              pointerEvents: "none",
              willChange: "transform",
              // Preserve the same vinyl drop-shadow look while the cover
              // lifts off — disappears against the viewport edges as it
              // fills the screen.
              boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
            }}
          />,
          document.body,
        )}
    </>
  );
}
