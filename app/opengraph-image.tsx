import { ImageResponse } from "next/og";

// Site-wide share card — used for /, /songs, /artists, /chords, /tuner, /about
// and anywhere a more specific opengraph-image.tsx isn't co-located. Designed
// to read like the homepage hero: warm brand background, the #DIEZ wordmark,
// the "Грай більше, шукай менше" tagline, a chord-pill row and the URL — so a
// shared diez.net.ua link previews as a polished product card.

export const runtime = "edge";
export const alt = "Diez — українські пісні, тексти й акорди";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  const chords = ["Am", "C", "G", "Dm", "Em", "F"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #EDE8DE 0%, #E4DFD5 55%, #D9D1C3 100%)",
          fontFamily: "system-ui",
        }}
      >
        {/* Oversized faint "#" watermark — the diez/sharp glyph doubling as a
            brand motif, bled off the bottom-right corner for depth. */}
        <div
          style={{
            position: "absolute",
            right: -70,
            bottom: -180,
            fontSize: 580,
            fontWeight: 900,
            color: "#FF8C3C",
            opacity: 0.08,
            letterSpacing: "-0.06em",
            display: "flex",
          }}
        >
          #
        </div>

        {/* Content column */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: 72,
          }}
        >
          {/* Header — wordmark + URL chip */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 900, letterSpacing: "-0.04em" }}>
              <span style={{ color: "#FF8C3C" }}>#</span>
              <span style={{ color: "#2A2522" }}>DIEZ</span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 600,
                color: "#5C564E",
                padding: "12px 26px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              diez.net.ua
            </div>
          </div>

          {/* Hero — tagline + subline */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 100,
                fontWeight: 900,
                letterSpacing: "-0.045em",
                lineHeight: 1.0,
                color: "#2A2522",
              }}
            >
              <div style={{ display: "flex" }}>Грай більше,</div>
              <div style={{ display: "flex" }}>шукай менше.</div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 31,
                fontWeight: 500,
                marginTop: 26,
                color: "#5C564E",
                letterSpacing: "-0.01em",
              }}
            >
              Українські пісні, тексти й акорди — гітара, укулеле, піаніно.
            </div>
          </div>

          {/* Chord-pill row — instantly reads as "this is for guitarists". */}
          <div style={{ display: "flex", gap: 14 }}>
            {chords.map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  fontSize: 30,
                  fontWeight: 700,
                  padding: "12px 28px",
                  borderRadius: 999,
                  background: "rgba(255,140,60,0.16)",
                  color: "#C2641A",
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
