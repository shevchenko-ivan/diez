import { ImageResponse } from "next/og";
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

// Fixed, recognisable covers for the fan (left → front): Океан Ельзи · Модель,
// Скрябін · Танго, Бумбокс · Люди. Hardcoded so the poster always reads the
// same instead of shuffling with the live "top" ordering.
const COVERS = [
  { img: "https://cdn-images.dzcdn.net/images/cover/8e09fdfde50b010534dbf569a51ffe50/1000x1000-000000-80-0-0.jpg", color: "#173A8A" },
  { img: "https://cdn-images.dzcdn.net/images/cover/dcd8e2cf3617eddc93ca2ec2dce84b39/1000x1000-000000-80-0-0.jpg", color: "#262321" },
  { img: "https://cdn-images.dzcdn.net/images/cover/94b7247e604f80884461a79b4c36e469/1000x1000-000000-80-0-0.jpg", color: "#1A1A1A" },
];

export default async function OG() {
  const covers = COVERS;
  let avatars: string[] = [];
  try {
    const artists = await getArtists(14);
    avatars = artists
      .filter((a) => a.photo_url)
      .slice(0, 5)
      .map((a) => a.photo_url as string);
  } catch {
    // avatars are optional — the rest of the card still renders
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
          <div style={{ display: "flex", fontSize: 128, fontWeight: 900, letterSpacing: "-0.05em" }}>
            <span style={{ color: ORANGE }}>#</span>
            <span style={{ color: DARK }}>DIEZ</span>
          </div>

          <div style={{ display: "flex", marginTop: 18, maxWidth: 480, fontSize: 29, fontWeight: 600, lineHeight: 1.32, color: DARK }}>
            Українські пісні з акордами для гітари, укулеле й піаніно.
          </div>

          <div style={{ display: "flex", marginTop: 12, maxWidth: 480, fontSize: 23, fontWeight: 500, lineHeight: 1.3, color: MUTED }}>
            Тюнер, транспонування, акорди без баре, навчання.
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
                    marginLeft: i === 0 ? 0 : -16,
                    border: "4px solid #E4DFD5",
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
        </div>
      </div>
    ),
    size,
  );
}
