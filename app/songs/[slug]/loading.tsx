// Instant skeleton for the song route. Next streams this the moment a song
// link is clicked, so navigation feels immediate even on a slow connection —
// the layout (header + chord panel + lyric column) appears at once, then the
// real page renders over it with the dz-page-open animation. Pure markup,
// no client JS. Mirrors the SongViewer grid (280px · 1fr · 260px on lg+).

// Varied widths so the lyric placeholder reads like real verses, not bars.
const LYRIC_LINES = [
  { chord: "18%", text: "82%" },
  { chord: "32%", text: "64%" },
  { chord: "22%", text: "90%" },
  { chord: "44%", text: "71%" },
  { chord: "15%", text: "58%" },
  { chord: "38%", text: "86%" },
  { chord: "26%", text: "68%" },
  { chord: "50%", text: "78%" },
  { chord: "20%", text: "54%" },
  { chord: "34%", text: "88%" },
];

export default function Loading() {
  return (
    <main
      className="dz-page-open flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-8 pt-4 pb-20"
      aria-busy="true"
    >
      <span className="sr-only" role="status">Завантаження пісні…</span>

      {/* Header row — back · title · actions (mirrors the real header grid). */}
      <div
        className="mb-4 grid items-center"
        style={{ padding: "0.4rem 0", gridTemplateColumns: "1fr auto 1fr" }}
        aria-hidden="true"
      >
        <div className="justify-self-start w-9 h-9 rounded-full te-inset animate-pulse" />
        <div className="flex flex-col items-center gap-1.5 px-2">
          <div className="h-3.5 w-24 rounded te-inset animate-pulse" />
          <div className="h-4 w-40 rounded te-inset animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <div className="w-9 h-9 rounded-full te-inset animate-pulse" />
          <div className="w-9 h-9 rounded-full te-inset animate-pulse" />
        </div>
      </div>

      {/* 3-column grid — left/right asides only on lg+, like SongViewer. */}
      <div
        className="lg:grid lg:gap-5"
        style={{ gridTemplateColumns: "280px 1fr 260px" }}
        aria-hidden="true"
      >
        {/* Left: transpose + chord diagram grid */}
        <aside className="hidden lg:flex flex-col gap-4">
          <div className="h-11 rounded-2xl te-inset animate-pulse" />
          <div className="h-14 rounded-2xl te-inset animate-pulse" />
          <div className="te-surface rounded-2xl p-3 grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-xl te-inset animate-pulse" />
            ))}
          </div>
        </aside>

        {/* Middle: lyric lines (chord row above each text line) */}
        <div className="flex flex-col gap-4 mt-1 lg:mt-0">
          {LYRIC_LINES.map((line, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-3 rounded te-inset animate-pulse" style={{ width: line.chord }} />
              <div className="h-4 rounded te-inset animate-pulse" style={{ width: line.text }} />
            </div>
          ))}
        </div>

        {/* Right: player + strumming */}
        <aside className="hidden lg:flex flex-col gap-4">
          <div className="h-40 rounded-2xl te-inset animate-pulse" />
          <div className="h-24 rounded-2xl te-inset animate-pulse" />
        </aside>
      </div>
    </main>
  );
}
