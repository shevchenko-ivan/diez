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

  const difficultyLabel =
    song.difficulty === "easy" ? "Легка" : song.difficulty === "medium" ? "Середня" : "Складна";
  // Manually truncate — Satori doesn't honor `-webkit-line-clamp` and the
  // OG canvas only has room for ~2 lines of huge text. Truncating here keeps
  // both the layout and the renderer happy.
  const titleDisplay =
    song.title.length > 40 ? song.title.slice(0, 39) + "…" : song.title;

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
        <div
          style={{
            display: "flex",
            width: 630,
            height: 630,
            background: song.coverColor ?? "#1A1A1A",
            position: "relative",
          }}
        >
          {song.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.coverImage}
              width={630}
              height={630}
              style={{ width: 630, height: 630, objectFit: "cover" }}
              alt=""
            />
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
          {/* Top row — brand + difficulty/key pill */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 32,
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
                fontSize: 18,
                fontWeight: 700,
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.1)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {`${difficultyLabel} · ${song.key}`}
            </div>
          </div>

          {/* Middle — title and artist */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                opacity: 0.6,
                letterSpacing: "-0.01em",
                marginBottom: 4,
              }}
            >
              {song.artist}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
              }}
            >
              {titleDisplay}
            </div>
          </div>

          {/* Bottom — chord pill row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {song.chords.slice(0, 6).map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 700,
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "rgba(255, 140, 60, 0.15)",
                  color: "#FF8C3C",
                  letterSpacing: "-0.01em",
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
