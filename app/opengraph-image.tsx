import { ImageResponse } from "next/og";
import { getSongsPage } from "@/features/song/services/songs";
import { getArtists } from "@/features/artist/services/artists";

// Site-wide share card — used for /, /songs, /artists, /chords, /tuner, /about
// and anywhere a more specific opengraph-image.tsx isn't co-located. Composed
// like a promo poster: tagline + #DIEZ wordmark + a cluster of real top-artist
// avatars on the left, a fan of real album covers + a chord sheet on the right.
// Pulls live data so the card refreshes itself as the catalogue grows.
//
// nodejs (not edge): we read Supabase + fetch external cover/photo images,
// which hit the same edge-runtime quirks the per-song card avoids.
export const runtime = "nodejs";
export const alt = "Diez — українські пісні, тексти й акорди";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "linear-gradient(135deg, #EDE8DE 0%, #E4DFD5 55%, #D9D1C3 100%)";
const ORANGE = "#FF8C3C";
const DARK = "#2A2522";
const MUTED = "#5C564E";

export default async function OG() {
  let covers: { img: string; color: string }[] = [];
  let avatars: string[] = [];
  try {
    const [page, artists] = await Promise.all([
      getSongsPage({ sortBy: "source_views", limit: 20 }),
      getArtists(14),
    ]);
    covers = page.songs
      .filter((s) => s.coverImage)
      .slice(0, 3)
      .map((s) => ({ img: s.coverImage as string, color: s.coverColor ?? "#1A1A1A" }));
    avatars = artists
      .filter((a) => a.photo_url)
      .slice(0, 5)
      .map((a) => a.photo_url as string);
  } catch {
    // fall through to the text-only layout below
  }

  // Fan of album covers + a peeking chord sheet (right half).
  const FAN = [
    { left: 20, top: 196, rot: -13 },
    { left: 168, top: 162, rot: -2 },
    { left: 316, top: 192, rot: 9 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: BG,
          fontFamily: "system-ui",
        }}
      >
        {/* Faint brand watermark */}
        <div
          style={{
            position: "absolute",
            right: -90,
            bottom: -200,
            fontSize: 600,
            fontWeight: 900,
            color: ORANGE,
            opacity: 0.07,
            letterSpacing: "-0.06em",
            display: "flex",
          }}
        >
          #
        </div>

        {/* LEFT — copy + wordmark + avatar cluster */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 600,
            height: "100%",
            padding: "0 0 0 70px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              color: DARK,
            }}
          >
            Твоя музика. Твої тексти.
          </div>

          <div style={{ display: "flex", marginTop: 8, fontSize: 124, fontWeight: 900, letterSpacing: "-0.05em" }}>
            <span style={{ color: ORANGE }}>#</span>
            <span style={{ color: DARK }}>DIEZ</span>
          </div>

          <div style={{ display: "flex", marginTop: 6, fontSize: 27, fontWeight: 500, color: MUTED }}>
            Тисячі українських пісень з акордами
          </div>

          {/* Artist avatar cluster */}
          {avatars.length > 0 && (
            <div style={{ display: "flex", marginTop: 34 }}>
              {avatars.map((src, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    width: 84,
                    height: 84,
                    borderRadius: 999,
                    overflow: "hidden",
                    marginLeft: i === 0 ? 0 : -18,
                    border: "4px solid #EDE8DE",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} width={84} height={84} style={{ width: 84, height: 84, objectFit: "cover" }} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — fanned album covers + a chord sheet as the front element */}
        <div style={{ position: "relative", display: "flex", width: 600, height: "100%" }}>
          {covers.map((c, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: FAN[i].left,
                top: FAN[i].top,
                width: 252,
                height: 252,
                display: "flex",
                borderRadius: 14,
                overflow: "hidden",
                background: c.color,
                transform: `rotate(${FAN[i].rot}deg)`,
                boxShadow: "0 22px 50px rgba(0,0,0,0.30)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} width={252} height={252} style={{ width: 252, height: 252, objectFit: "cover" }} alt="" />
            </div>
          ))}

          {/* Chord sheet — front-right of the fan, like the reference poster. */}
          <div
            style={{
              position: "absolute",
              left: 386,
              top: 198,
              width: 172,
              height: 236,
              display: "flex",
              flexDirection: "column",
              padding: "22px 20px",
              background: "#FBF8F2",
              borderRadius: 12,
              transform: "rotate(12deg)",
              boxShadow: "0 22px 50px rgba(0,0,0,0.28)",
              color: "#3A332B",
              fontSize: 18,
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: "flex", color: ORANGE, fontWeight: 700 }}>Dm        G</div>
            <div style={{ display: "flex" }}>Спи собі…</div>
            <div style={{ display: "flex", color: ORANGE, fontWeight: 700, marginTop: 8 }}>Am        C</div>
            <div style={{ display: "flex" }}>Тримай мене…</div>
            <div style={{ display: "flex", color: ORANGE, fontWeight: 700, marginTop: 8 }}>Em        D</div>
            <div style={{ display: "flex" }}>Вона…</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
