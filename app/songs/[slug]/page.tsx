import { notFound } from "next/navigation";
import Link from "next/link";
import { getSongBySlug, MOCK_SONGS } from "@/features/song/services/songs";
import { Song, SongSection } from "@/features/song/types";
import { Navbar } from "@/shared/components/Navbar";
import { SongActions } from "@/features/song/components/SongActions";
import { ChevronLeft, Eye, Music } from "lucide-react";

// ─── generateStaticParams ─────────────────────────────────────────────────────

export function generateStaticParams() {
  return MOCK_SONGS.map((s) => ({ slug: s.slug }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = getSongBySlug(slug);
  if (!song) return notFound();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pb-20">

        {/* ── Back ─────────────────────────────────────────────────────── */}
        <div className="pt-2 pb-6">
          <Link
            href="/"
            className="te-key inline-flex items-center gap-1.5 px-3 py-2 text-xs"
            style={{ color: "var(--text-mid)", fontWeight: 400 }}
          >
            <ChevronLeft size={13} strokeWidth={2.5} />
            Назад
          </Link>
        </div>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="te-surface mb-4" style={{ borderRadius: "1.5rem", padding: "1.5rem" }}>
          <div className="flex items-start justify-between gap-4">

            {/* Title block */}
            <div>
              <p
                className="uppercase mb-1"
                style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 400 }}
              >
                {song.genre} · {song.artist}
              </p>
              <h1
                style={{
                  fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
                  letterSpacing: "-0.03em",
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.1,
                  marginBottom: "1rem",
                }}
              >
                {song.title}
              </h1>

              {/* Info chips row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Key */}
                <div
                  className="te-lcd font-mono-te px-3 py-1 flex items-center gap-1.5"
                  style={{ fontSize: "0.72rem" }}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: "0.58rem" }}>KEY</span>
                  <span>{song.key}</span>
                </div>

                {/* Capo */}
                {song.capo !== undefined && song.capo > 0 && (
                  <div
                    className="te-lcd font-mono-te px-3 py-1 flex items-center gap-1.5"
                    style={{ fontSize: "0.72rem" }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "0.58rem" }}>CAPO</span>
                    <span>{song.capo}</span>
                  </div>
                )}

                {/* Tempo */}
                {song.tempo && (
                  <div
                    className="te-lcd font-mono-te px-3 py-1 flex items-center gap-1.5"
                    style={{ fontSize: "0.72rem" }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "0.58rem" }}>BPM</span>
                    <span>{song.tempo}</span>
                  </div>
                )}

                {/* Difficulty dot */}
                <DifficultyBadge difficulty={song.difficulty} />

                {/* Views */}
                <div
                  className="flex items-center gap-1"
                  style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
                >
                  <Eye size={11} />
                  <span className="font-mono-te">{song.views.toLocaleString("uk")}</span>
                </div>
              </div>
            </div>

            <SongActions />
          </div>
        </div>

        {/* ── Chord palette ─────────────────────────────────────────────── */}
        <div className="te-surface mb-4" style={{ borderRadius: "1.25rem", padding: "1rem 1.25rem" }}>
          <p
            className="uppercase mb-3"
            style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 400 }}
          >
            Акорди
          </p>
          <div className="flex flex-wrap gap-2">
            {song.chords.map((chord: string) => (
              <ChordBadge key={chord} chord={chord} />
            ))}
          </div>
        </div>

        {/* ── Lyrics + chords ───────────────────────────────────────────── */}
        <div className="space-y-3">
          {song.sections.map((section: any) => (
            <SongSectionBlock key={section.label} section={section} />
          ))}
        </div>

        {/* ── Album / author meta ───────────────────────────────────────── */}
        <div
          className="te-inset mt-6 flex items-center gap-3"
          style={{ borderRadius: "1rem", padding: "0.875rem 1.125rem" }}
        >
          <div
            className="te-knob flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36 }}
          >
            <Music size={14} style={{ color: "var(--text-mid)" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text)" }}>
              {song.artist}{song.album ? ` — ${song.album}` : ""}
            </p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 350 }}>
              Акорди підібрані спільнотою · Складність:{" "}
              <span style={{ color: "var(--text-mid)" }}>
                {song.difficulty === "easy" ? "легка" : song.difficulty === "medium" ? "середня" : "складна"}
              </span>
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SongSectionBlock({ section }: { section: SongSection }) {
  return (
    <div className="te-surface" style={{ borderRadius: "1.25rem", overflow: "hidden" }}>
      {/* Section label */}
      <div
        className="te-inset px-4 py-2 flex items-center gap-2"
        style={{ borderRadius: 0 }}
      >
        <span
          className="uppercase font-mono-te"
          style={{ fontSize: "0.6rem", letterSpacing: "0.12em", color: "var(--text-muted)" }}
        >
          {section.label}
        </span>
      </div>

      {/* Chord + lyric lines */}
      <div className="px-5 py-4 space-y-4">
        {section.lines.map((line, i) => (
          <ChordLyricLine key={i} chords={line.chords} lyrics={line.lyrics} />
        ))}
      </div>
    </div>
  );
}

function ChordLyricLine({ chords, lyrics }: { chords: string[]; lyrics: string }) {
  // Build inline chord+lyric display
  // Split lyrics by spaces and pair with chords array
  const words = lyrics.split(" ");

  return (
    <div>
      {/* Chord row */}
      <div className="flex gap-0 mb-0.5 min-h-[1.25rem]" style={{ flexWrap: "nowrap" }}>
        {words.map((word, i) => {
          const chord = chords[i] || "";
          return (
            <div key={i} className="relative" style={{ marginRight: "0.5rem" }}>
              {chord && (
                <span
                  className="font-mono-te absolute"
                  style={{
                    top: "-1.1rem",
                    left: 0,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--orange)",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.01em",
                  }}
                >
                  {chord}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Lyric row */}
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.6,
          color: "var(--text)",
          fontWeight: 350,
          letterSpacing: "0.005em",
        }}
      >
        {lyrics}
      </p>
    </div>
  );
}

function ChordBadge({ chord }: { chord: string }) {
  return (
    <div
      className="te-key te-pressable font-mono-te flex items-center justify-center"
      style={{
        minWidth: 44,
        height: 36,
        padding: "0 0.75rem",
        fontSize: "0.82rem",
        fontWeight: 600,
        color: "var(--text)",
        letterSpacing: "0.02em",
      }}
    >
      {chord}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Song["difficulty"] }) {
  const map = {
    easy:   { label: "Easy",   color: "#10b981" },
    medium: { label: "Medium", color: "#f59e0b" },
    hard:   { label: "Hard",   color: "#ef4444" },
  };
  const { label, color } = map[difficulty];

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 te-inset"
      style={{ borderRadius: "999px" }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span
        className="font-mono-te uppercase"
        style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--text-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}
