import { ImageResponse } from "next/og";
import { DiezLogo } from "@/shared/components/DiezLogo";
import { getArtistBySlug } from "@/features/artist/services/artists";

// Per-artist OG card — fired when /artists/<slug> is shared. Shows the
// artist photo and name on a dark themed background, which previews far
// better than the static brand image.

// nodejs runtime — see /songs/[slug]/opengraph-image.tsx for rationale.
export const runtime = "nodejs";
export const alt = "Diez — Акорди для гітари";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cache the rendered card like the artist page itself (30-day ISR). Without
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

// Next 16 wraps `params` in a Promise here, same as generateMetadata.
export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  const name = artist?.name ?? slug;
  // Truncate manually — Satori doesn't support `-webkit-line-clamp` or
  // text-overflow, and the canvas only fits ~2 lines.
  const nameDisplay = name.length > 28 ? name.slice(0, 27) + "…" : name;

  // Split layout mirrors the song card. Left = artist photo (circular crop
  // via overflow:hidden on a square is the most Satori-friendly approach),
  // right = metadata column on dark panel.
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
        {/* Left — artist photo if available, otherwise an initial-circle
            placeholder. Same 630×630 square that /songs uses. */}
        <div
          style={{
            display: "flex",
            width: 630,
            height: 630,
            background: "#1A1A1A",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {artist?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.photo_url}
              width={630}
              height={630}
              style={{ width: 630, height: 630, objectFit: "cover" }}
              alt=""
            />
          ) : (
            <div
              style={{
                display: "flex",
                fontSize: 280,
                fontWeight: 900,
                color: "#FF8C3C",
                opacity: 0.4,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Right — metadata column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "48px 56px",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <DiezLogo height={44} textColor="#FFFFFF" />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                opacity: 0.5,
                marginBottom: 8,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Виконавець
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
              }}
            >
              {nameDisplay}
            </div>
          </div>

          {/* Bottom spacer keeps the name vertically centred. */}
          <div style={{ display: "flex" }} />
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": CDN_CACHE } },
  );
}
