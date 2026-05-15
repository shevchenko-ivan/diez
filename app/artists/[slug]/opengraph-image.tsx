import { ImageResponse } from "next/og";
import { getArtistBySlug } from "@/features/artist/services/artists";
import { getSongsByArtist } from "@/features/song/services/songs";

// Per-artist OG card — fired when /artists/<slug> is shared. Shows the artist
// name, song count, and three top-played song titles on a dark themed
// background, which previews far better than the static brand image.

export const runtime = "edge";
export const alt = "Diez — Акорди для гітари";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { slug: string } }) {
  const artist = await getArtistBySlug(params.slug);
  const name = artist?.name ?? params.slug;
  const songs = artist ? await getSongsByArtist(name) : [];
  const topTitles = songs.slice(0, 3).map((s) => s.title);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1A1A1A, #2A2418 75%)",
          padding: 64,
          color: "#FFFFFF",
          fontFamily: "system-ui",
        }}
      >
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
          {songs.length > 0 && (
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(255, 140, 60, 0.18)",
                color: "#FF8C3C",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {songs.length}{" "}пісень
            </div>
          )}
        </div>

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
              fontSize: 28,
              fontWeight: 600,
              opacity: 0.65,
              marginBottom: 8,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Виконавець
          </div>
          <div
            style={{
              fontSize: 110,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {name}
          </div>
        </div>

        {topTitles.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                opacity: 0.5,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Популярні пісні
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                opacity: 0.9,
                letterSpacing: "-0.01em",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {topTitles.map((t) => `«${t}»`).join("  ·  ")}
            </div>
          </div>
        )}
      </div>
    ),
    size,
  );
}
