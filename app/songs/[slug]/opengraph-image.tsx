import { ImageResponse } from "next/og";
import { getSongBySlug } from "@/features/song/services/songs";

// Dynamic OG card per song. When someone shares /songs/<slug> on Telegram,
// Viber, Facebook, etc., the platform fetches this URL for a preview image
// and we get a branded card with the title, artist and chord list — far more
// click-worthy than the generic /opengraph-image.png fallback.

// nodejs runtime, not edge — getSongBySlug pulls Supabase + parses lyrics
// JSON, and we hit edge-runtime compatibility quirks (silent 0-byte
// responses) often enough that the few-hundred-ms cold-start trade isn't
// worth it for a route that crawlers hit, not end users.
export const runtime = "nodejs";
export const alt = "Diez — Акорди для гітари";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

  const chords = song.chords.slice(0, 8).join("  ·  ");
  const difficultyLabel =
    song.difficulty === "easy" ? "Легка" : song.difficulty === "medium" ? "Середня" : "Складна";
  // Manually truncate — Satori doesn't honor `-webkit-line-clamp` and the
  // OG canvas only has room for ~2 lines of huge text. Truncating here keeps
  // both the layout and the renderer happy.
  const titleDisplay =
    song.title.length > 40 ? song.title.slice(0, 39) + "…" : song.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: song.coverColor
            ? `linear-gradient(135deg, ${song.coverColor}DD, #1A1A1A 80%)`
            : "linear-gradient(135deg, #E8DDD0, #C8B59A 80%)",
          padding: 64,
          color: "#FFFFFF",
          fontFamily: "system-ui",
        }}
      >
        {/* Header — brand + difficulty pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#FF8C3C",
            }}
          >
            # DIEZ
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.15)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {/* Single concatenated string — JSX template literals with
                interpolation create separate text nodes, and Satori counts
                them as multiple children which would require display:flex. */}
            {`${difficultyLabel} · ${song.key}`}
          </div>
        </div>

        {/* Title + artist — the visual centerpiece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            marginTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              opacity: 0.85,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            {song.artist}
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: "#FFFFFF",
              display: "flex",
            }}
          >
            {titleDisplay}
          </div>
        </div>

        {/* Footer — chord names. The whole point: a guitarist scrolling the
            chat preview sees the chord set without clicking. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 36,
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.9)",
            letterSpacing: "0.02em",
          }}
        >
          {chords}
        </div>
      </div>
    ),
    size,
  );
}
