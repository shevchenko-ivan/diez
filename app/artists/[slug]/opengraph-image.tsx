import { ImageResponse } from "next/og";
import { getArtistBySlug } from "@/features/artist/services/artists";
import { getSongsByArtist } from "@/features/song/services/songs";

// Per-artist OG card — fired when /artists/<slug> is shared. Shows the artist
// name, song count, and three top-played song titles on a dark themed
// background, which previews far better than the static brand image.

// nodejs runtime — see /songs/[slug]/opengraph-image.tsx for rationale.
export const runtime = "nodejs";
export const alt = "Diez — Акорди для гітари";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Next 16 wraps `params` in a Promise here, same as generateMetadata.
export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  const name = artist?.name ?? slug;
  const songs = artist ? await getSongsByArtist(name) : [];
  // Truncate manually — Satori doesn't support `-webkit-line-clamp` or
  // text-overflow, and the canvas only fits ~2 lines.
  const nameDisplay = name.length > 28 ? name.slice(0, 27) + "…" : name;
  const topTitles = songs.slice(0, 3).map((s) => s.title);
  const titlesLine = topTitles.map((t) => `«${t}»`).join("  ·  ");
  const titlesDisplay =
    titlesLine.length > 80 ? titlesLine.slice(0, 79) + "…" : titlesLine;

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
            {songs.length > 0 && (
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 700,
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: "rgba(255, 140, 60, 0.15)",
                  color: "#FF8C3C",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {`${songs.length} пісень`}
              </div>
            )}
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

          {topTitles.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 16,
                  fontWeight: 600,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 8,
                }}
              >
                Популярні пісні
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 600,
                  opacity: 0.9,
                  letterSpacing: "-0.01em",
                }}
              >
                {titlesDisplay}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>
      </div>
    ),
    size,
  );
}
