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
          // This strip starts ~390px down, so on a 412x823 phone the first
          // three cards are ON the first screen — an earlier note here
          // assumed it sat below the fold and left them all lazy. A 150x150
          // cover (22500px²) outranks the hero h1 (15540px²), so the LCP
          // element on mobile is a card in this strip: it was queueing behind
          // ~20 lazy images and landing at 4.2s despite weighing 8 KB.
          //
          // Only the first card gets `priority`. Six preloads once competed
          // with the font preloads and pushed the lab LCP to ~8s, so the rest
          // get eager + high fetch priority instead: out of the lazy queue,
          // nothing added to <head>.
          priority={index === 0}
          loading={index !== undefined && index < 3 ? "eager" : undefined}
          fetchPriority={index !== undefined && index < 3 ? "high" : undefined}
          iconSize={40}
        />
      </div>
      <div className="top-song-card-caption text-center mt-2 px-1">
        <p
          className="font-medium text-sm truncate"
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
