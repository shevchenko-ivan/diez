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

// Total reveal duration in ms — keep in sync with `.dz-cover-reveal-overlay`
// animation-duration in globals.css. 480ms sits inside the 100-500ms
// "ideal transition" range per NN/g's transition-animation research. We
// push the route ~120ms before the animation ends so the new page paints
// during the final stretch of the expand instead of after it (no flash
// of blank background).
const REVEAL_MS = 480;
const ROUTE_PUSH_LEAD_MS = 120;

/**
 * Featured "Top popular" card — square vinyl-sleeve cover. Hover scales +
 * reveals caption (desktop); touch devices show caption always.
 *
 * On click the cover lifts off the page via a portal-rendered overlay that
 * runs a single declarative CSS keyframe animation (`dz-cover-reveal` in
 * globals.css). The overlay's start rect and end scale are passed through
 * CSS custom properties, so the static @keyframes block can interpolate
 * dynamic per-card values without re-declaring keyframes per element.
 *
 * Pattern adapted from the `css-animations` skill — declarative @keyframes
 * with animation-fill-mode: both, finite iteration-count, GPU-friendly
 * transform-only motion.
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
  // Viewport snapshot taken at click time — locks the final scale so a
  // mid-animation orientation change can't desync the target.
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);
  // startTransition keeps the click responsive even if the destination's
  // data fetch lags — the reveal animation keeps running while React works
  // on the route change.
  const [, startTransition] = useTransition();

  const fallbackColor = coverColor || "#C8D5E8";
  const href = `/songs/${slug}`;

  // Reset state on unmount so a back-button re-mount doesn't carry over
  // a stale expanding state.
  useEffect(() => {
    return () => {
      setExpandRect(null);
      setViewport(null);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (expandRect) return;
    // Honour browser open-in-new-tab gestures.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    const cover = coverRef.current;
    // No image (or lite-mode skipping it) → plain navigate.
    if (!cover || !coverImage || lite) return;

    // Skip the reveal entirely for users who prefer reduced motion.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    e.preventDefault();
    const rect = cover.getBoundingClientRect();
    setExpandRect(rect);
    setViewport({ w: window.innerWidth, h: window.innerHeight });

    // Push slightly before the animation ends so the new page paints during
    // the final stretch of the reveal — feels like the page emerges from
    // behind the expanded cover rather than after it.
    window.setTimeout(() => {
      startTransition(() => router.push(href));
    }, REVEAL_MS - ROUTE_PUSH_LEAD_MS);
  };

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
            // Hide the original during the reveal so the overlay reads as the
            // same artwork being lifted off the shelf, not a duplicate.
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

      {/* Expanding overlay — portal into document.body so it escapes the
          strip's `overflow-x: auto` clipping. The CSS keyframe in
          globals.css drives the actual motion; we just declare the rect
          dimensions and the custom properties the keyframe needs.

          The overlay's transform-origin is `center`, so the end translate
          must place the cover's *centre* at the viewport's centre — not
          its top-left at (0, 0). end-x / end-y compute that offset. */}
      {expandRect && viewport && coverImage && typeof document !== "undefined" &&
        createPortal(
          <div
            aria-hidden="true"
            className="dz-cover-reveal-overlay"
            style={{
              width: `${expandRect.width}px`,
              height: `${expandRect.height}px`,
              backgroundImage: `url(${coverImage})`,
              // CSS custom properties consumed by `@keyframes dz-cover-reveal`.
              // The keyframe interpolates transform: translate(...) scale(...)
              // between the start (cover at its source rect) and end (cover
              // centred in the viewport, scaled to fill).
              ["--start-x" as string]: `${expandRect.left}px`,
              ["--start-y" as string]: `${expandRect.top}px`,
              ["--end-x" as string]: `${(viewport.w - expandRect.width) / 2}px`,
              ["--end-y" as string]: `${(viewport.h - expandRect.height) / 2}px`,
              ["--end-scale-x" as string]: `${viewport.w / expandRect.width}`,
              ["--end-scale-y" as string]: `${viewport.h / expandRect.height}`,
            }}
          />,
          document.body,
        )}
    </>
  );
}
