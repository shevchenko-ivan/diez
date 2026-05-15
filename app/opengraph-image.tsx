import { ImageResponse } from "next/og";

// Site-wide fallback OG card — used for /, /songs, /artists, /chords, /tuner,
// /about and anywhere a more specific opengraph-image.tsx isn't co-located.
// The old static PNG here was the unmodified Next.js Starter Kit screenshot
// shipped by Vercel's template; replacing with this generator keeps the
// brand consistent everywhere.

export const runtime = "edge";
export const alt = "Diez — Акорди для гітари";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #E8DDD0, #C8B59A 60%, #8A6F4A)",
          padding: 64,
          fontFamily: "system-ui",
          color: "#1A1A1A",
        }}
      >
        <div
          style={{
            fontSize: 240,
            fontWeight: 900,
            letterSpacing: "-0.06em",
            color: "#FF8C3C",
            lineHeight: 0.85,
            // Tight letter spacing + huge "#" — the brand glyph reads as the
            // chord notation "#" (diez/sharp) and doubles as the logo.
          }}
        >
          #DIEZ
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            marginTop: 24,
            letterSpacing: "-0.02em",
            color: "#2A1F12",
          }}
        >
          Акорди для гітари
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            marginTop: 16,
            opacity: 0.7,
            letterSpacing: "-0.01em",
            color: "#2A1F12",
          }}
        >
          Тисячі пісень. Текст, акорди, тональність.
        </div>
      </div>
    ),
    size,
  );
}
