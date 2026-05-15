import { ImageResponse } from "next/og";
import { getSongBySlug } from "@/features/song/services/songs";

// Dynamic OG card per song. When someone shares /songs/<slug> on Telegram,
// Viber, Facebook, etc., the platform fetches this URL for a preview image
// and we get a branded card with the title, artist and chord list — far more
// click-worthy than the generic /opengraph-image.png fallback.

export const runtime = "edge";
export const alt = "Diez — Акорди для гітари";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { slug: string } }) {
  const song = await getSongBySlug(params.slug);
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
              fontSize: 22,
              fontWeight: 700,
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(4px)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {difficultyLabel} · {song.key}
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
              // Manual truncation — Satori (next/og's renderer) doesn't honor
              // CSS text-overflow, so very long titles would otherwise wrap
              // into the chord row.
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {song.title}
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
