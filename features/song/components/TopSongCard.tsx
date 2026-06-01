"use client";

import { useState, useTransition } from "react";
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

/**
 * Featured "Top popular" card — square vinyl-sleeve cover, no metadata
 * visible by default. On hover (desktop) the cover scales up and a
 * title/artist caption fades in below. On touch devices (no hover) the
 * caption is always visible.
 *
 * On click the cover scales up massively and fades, then navigation
 * lands on /songs/[slug]. Reads as a "tap to open" reveal — like iOS
 * Photos opening a thumbnail into the full viewer. The transition runs
 * 280ms; we delay the route push by the same so the visual completes
 * before the new page paints over it.
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
  const [expanding, setExpanding] = useState(false);
  // React's startTransition keeps the click responsive even if the new
  // route's data fetch lags — the animation runs on the current frame
  // without contention.
  const [, startTransition] = useTransition();
  const fallbackColor = coverColor || "#C8D5E8";
  const href = `/songs/${slug}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (expanding) return;
    // Honour browser open-in-new-tab gestures — Cmd/Ctrl/Shift click and
    // middle/right mouse buttons get the default behaviour.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    e.preventDefault();
    setExpanding(true);

    // Match the CSS transition duration (320ms transform). Push slightly
    // before the end so the new page paints during the final opacity
    // crossfade rather than after — feels seamless.
    window.setTimeout(() => {
      startTransition(() => router.push(href));
    }, 260);
  };

  return (
    <HapticLink
      href={href}
      hapticType="strum"
      onClick={handleClick}
      className="top-song-card group block focus-visible:outline-none"
    >
      <div
        className="top-song-card-cover relative aspect-square overflow-hidden"
        style={{
          // Sharp square edges — vinyl-sleeve aesthetic. The subtle drop
          // shadow + 1px highlight ring give the cover lift from the dark
          // background, so the row reads as a shelf of records instead of
          // floating tiles.
          borderRadius: 0,
          background: `linear-gradient(145deg, ${fallbackColor}CC, ${fallbackColor}66)`,
          boxShadow:
            "0 6px 16px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
          // "Tap to open" reveal — cover blows up from its grid spot and
          // fades while the route changes underneath. scale(20) ensures the
          // cover covers any phone or tablet viewport from its centre
          // point, regardless of starting size. Acceleration easing
          // (slow start / fast end) reads as decisive "going into" the
          // page rather than a passive bounce.
          ...(expanding && {
            transform: "scale(20)",
            opacity: 0,
            zIndex: 50,
            transition:
              "transform 320ms cubic-bezier(0.32, 0, 0.67, 0), opacity 200ms 140ms ease-out",
            willChange: "transform, opacity",
            pointerEvents: "none",
          }),
        }}
      >
        {coverImage && !lite && (
          <Image
            src={coverImage}
            alt={`Обкладинка пісні «${title}» — ${artist}`}
            title={`${title} — ${artist}`}
            fill
            sizes="(max-width: 768px) 45vw, 17vw"
            // First 6 cards span the row on desktop and are above the fold.
            // The hero subhead is the actual LCP element on /, but eager
            // loading here avoids re-shuffling priorities once the hero paints.
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
  );
}
