import { ImageResponse } from "next/og";
import { DiezLogo } from "@/shared/components/DiezLogo";
import { getSongBySlug } from "@/features/song/services/songs";
import { coverThumb } from "@/lib/utils";

// Dynamic OG card per song. When someone shares /songs/<slug> on Telegram,
// Viber, Facebook, etc., the platform fetches this URL for a preview image
// and we get a branded card with the cover, title and artist — far more
// click-worthy than the generic /opengraph-image.png fallback.

// nodejs runtime, not edge — getSongBySlug pulls Supabase + parses lyrics
// JSON, and we hit edge-runtime compatibility quirks (silent 0-byte
// responses) often enough that the few-hundred-ms cold-start trade isn't
// worth it for a route that crawlers hit, not end users.
export const runtime = "nodejs";
export const alt = "Diez — Акорди для гітари";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cache the rendered card like the song page itself (30-day ISR). Without
// this the route ran on every request with `max-age=0`: each crawler or
// messenger hit re-rendered a 350–600 KB PNG, which was ~40% of the
// project's Fast Origin Transfer (Vercel Usage, 11.2026). As with the page,
// a dynamic segment needs generateStaticParams for `revalidate` to apply.
export const revalidate = 2592000;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

// Next answers metadata image routes with `max-age=0, must-revalidate`,
// which leaves the CDN free to refetch every time. s-maxage pins the card in
// Vercel's edge cache (browsers still get max-age=0).
const CDN_CACHE = "public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400";

// Next 16 passes `params` as a Promise in opengraph-image.tsx, mirroring
// generateMetadata. Awaiting it (not `params.slug` directly) is what kept
// the dynamic card from rendering — every shared link fell through to the
// site-wide fallback because `undefined` slug yielded no song.
export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  // Fall back to the static OG if the song was deleted between sitemap
  // generation and a crawler hit — Next will use app/opengraph-image.png.
  if (!song) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#E8DDD0",
            fontSize: 96,
            fontWeight: 900,
            color: "#1A1A1A",
            letterSpacing: "-0.04em",
          }}
        >
          # Diez
        </div>
      ),
      size,
    );
  }

  // Manually truncate — Satori doesn't honor `-webkit-line-clamp` and the
  // OG canvas only has room for ~2 lines of huge text. Truncating here keeps
  // both the layout and the renderer happy.
  // Without a cover the text column takes the whole card instead of sitting
  // next to an empty square.
  const hasCover = Boolean(song.coverImage);
  const maxTitle = hasCover ? 40 : 70;
  const titleDisplay =
    song.title.length > maxTitle ? song.title.slice(0, maxTitle - 1) + "…" : song.title;
  // The column is ~460 px wide next to a cover, ~1090 px without: short
  // titles get the big size, longer ones step down so they still fit.
  const sizeByLength = hasCover
    ? titleDisplay.length <= 12 ? 104 : titleDisplay.length <= 24 ? 84 : 68
    : titleDisplay.length <= 30 ? 104 : 84;
  // Satori never breaks inside a word, so the longest word must fit the
  // column on its own («Подоляночка», «ЗАКОРДОНОМ» ran off the card).
  // Average glyph width ≈ 0.6 em for lowercase, ≈ 0.72 em for capitals.
  const columnWidth = hasCover ? 458 : 1056;
  const longestWordWidth = Math.max(
    ...titleDisplay.split(/\s+/).map((w) =>
      [...w].reduce((sum, ch) => sum + (ch !== ch.toLowerCase() ? 0.72 : 0.6), 0),
    ),
  );
  const titleSize = Math.min(sizeByLength, Math.floor(columnWidth / longestWordWidth));

  // Split layout: left half is the real album cover (the thing guitarists
  // recognise instantly), right half is the metadata column on a dark panel.
  // Mirrors the in-app SongCard composition.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0F0F0F",
          fontFamily: "system-ui",
          color: "#FFFFFF",
        }}
      >
        {/* Left — album cover. 630×630 square so it fills the card height
            edge to edge. Satori's <img> fetches the URL at render time. */}
        {song.coverImage && (
          <div style={{ display: "flex", width: 630, height: 630 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              // Downscaled: a full-size Wikimedia original (10 MB) made Satori
              // fail and the route answer 500 (Search Console, 24.10.2026).
              src={coverThumb(song.coverImage, 630) ?? song.coverImage}
              width={630}
              height={630}
              style={{ width: 630, height: 630, objectFit: "cover" }}
              alt=""
            />
          </div>
        )}

        {/* Right — metadata column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: hasCover ? "48px 56px" : "48px 72px",
            justifyContent: "space-between",
          }}
        >
          {/* Top — brand */}
          <div style={{ display: "flex" }}>
            <DiezLogo height={44} textColor="#FFFFFF" />
          </div>

          {/* Middle — title and artist */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 38,
                fontWeight: 600,
                opacity: 0.6,
                letterSpacing: "-0.01em",
                marginBottom: 8,
              }}
            >
              {song.artist}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: titleSize,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
              }}
            >
              {titleDisplay}
            </div>
          </div>

          {/* Bottom spacer keeps the title block vertically centred. */}
          <div style={{ display: "flex", height: 44 }} />
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": CDN_CACHE } },
  );
}
