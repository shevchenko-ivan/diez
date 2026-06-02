"use client";

import { HapticLink } from "@/shared/components/HapticLink";
import { SongCover } from "@/shared/components/SongCover";
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
  const fallbackColor = coverColor || "#C8D5E8";

  return (
    <HapticLink
      href={`/songs/${slug}`}
      hapticType="strum"
      className="top-song-card group block focus-visible:outline-none"
    >
      <div
        className="top-song-card-cover relative aspect-square overflow-hidden"
        style={{
          // Sharp square edges — vinyl-sleeve aesthetic. The drop shadow gives
          // lift; the theme-aware 1px ring (var(--border)) keeps the edges
          // visible even when the cover falls back to a panel that matches the
          // page background (dark theme), so cards never bleed into the page.
          borderRadius: 0,
          background: `linear-gradient(145deg, ${fallbackColor}CC, ${fallbackColor}66)`,
          boxShadow:
            "0 6px 16px rgba(0,0,0,0.35), inset 0 0 0 1px var(--border)",
        }}
      >
        {/* SongCover handles the broken/missing-image fallback (icon + panel),
            matching the catalog/search list. The wrapper's coverColor gradient
            stays as the per-song tint shown while the image loads. */}
        <SongCover
          src={lite ? null : coverImage}
          alt={`Обкладинка пісні «${title}» — ${artist}`}
          title={`${title} — ${artist}`}
          fill
          sizes="(max-width: 768px) 45vw, 17vw"
          // First 6 cards span the row on desktop and are above the fold.
          // The hero subhead is the actual LCP element on /, but eager
          // loading here avoids re-shuffling priorities once the hero paints.
          priority={typeof index === "number" && index < 6}
          iconSize={40}
        />
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
