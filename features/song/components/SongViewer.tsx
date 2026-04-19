"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Music, Minus, Plus, ChevronDown, ChevronUp, AArrowDown, AArrowUp, Sparkles } from "lucide-react";
import { transposeChord, ChordPanel, ChordHover, useVoicings } from "./ChordDiagram";
import { useScrollFade, buildFadeMask } from "@/shared/hooks/useScrollFade";
import { SongPlayer } from "./SongPlayer";
import { ControlBlock } from "@/shared/components/ControlBlock";
import { useFocusMode } from "@/shared/hooks/useFocusMode";

// Heavy widgets (Web Audio, mic access) — lazy-loaded, client-only.
const RhythmPlayer = dynamic(
  () => import("./RhythmPlayer").then((m) => m.RhythmPlayer),
  { ssr: false },
);
const TunerWidget = dynamic(
  () => import("@/features/tuner/components/TunerWidget").then((m) => m.TunerWidget),
  { ssr: false },
);
import { AdjusterButton } from "@/shared/components/AdjusterButton";
import { TeButton } from "@/shared/components/TeButton";
import { ToggleKnob } from "@/shared/components/ToggleKnob";
import { InstrumentSwitch } from "./InstrumentSwitch";

// ─── Beginner-mode heuristics ────────────────────────────────────────────────
// Open/easy voicings a beginner can play without barre.
const OPEN_CHORDS = new Set([
  "C", "D", "E", "G", "A",
  "Am", "Em", "Dm",
  "D7", "E7", "A7", "G7", "C7", "B7",
  "Cmaj7", "Gmaj7", "Em7", "Am7", "Dm7",
  "Asus2", "Dsus2", "Esus4", "Asus4", "Dsus4",
]);
// Majors that have a known no-barre alternative (see NO_BARRE_ALTERNATIVES).
const EASY_WITH_ALT = new Set(["F", "F#", "Gb", "B", "Bb", "A#"]);

function chordDifficulty(chord: string): number {
  const m = chord.match(/^([A-G][#b]?)(m)?/);
  if (!m) return 2;
  const root = m[1];
  const isMinor = m[2] === "m";
  const key = isMinor ? `${root}m` : root;
  if (OPEN_CHORDS.has(key)) return 0;
  if (!isMinor && EASY_WITH_ALT.has(root)) return 1;
  return 2;
}

function bestBeginnerTranspose(chords: string[]): number {
  const order = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6];
  let best = 0;
  let bestScore = Infinity;
  for (const delta of order) {
    let score = 0;
    for (const c of chords) {
      score += chordDifficulty(transposeChord(c, delta));
    }
    if (score < bestScore) {
      bestScore = score;
      best = delta;
    }
  }
  return best;
}

// ─── SongViewer ───────────────────────────────────────────────────────────────

export function SongViewer({ song }: { song: Song }) {
  const [transpose, setTranspose] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [noBarreMode, setNoBarreMode] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [focusMode] = useFocusMode();
  const sectionsRef = useRef<HTMLDivElement>(null);

  const toggleBeginner = () => {
    trigger("light");
    if (beginnerMode) {
      setBeginnerMode(false);
      setNoBarreMode(false);
      setTranspose(0);
    } else {
      const delta = bestBeginnerTranspose(song.chords);
      setTranspose(delta);
      setNoBarreMode(true);
      setBeginnerMode(true);
    }
  };
  const { trigger } = useHaptics();
  const voicingState = useVoicings(song.slug);

  // Fire-and-forget view increment once per page load, keyed to the active variant.
  const activeVariantId = song.activeVariantId;
  useEffect(() => {
    if (!activeVariantId) return;
    fetch("/api/songs/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: activeVariantId }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVariantId]);

  // Auto-scroll loop. Stops when the bottom of the last lyrics block reaches
  // the viewport bottom — so the footer never enters the fold during auto-play.
  useEffect(() => {
    if (scrollSpeed === 0) return;
    const interval = setInterval(() => {
      const el = sectionsRef.current;
      if (el) {
        const bottom = el.getBoundingClientRect().bottom;
        const limit = window.scrollY + bottom - window.innerHeight + 20;
        if (window.scrollY >= limit) {
          setScrollSpeed(0);
          return;
        }
      }
      window.scrollBy({ top: scrollSpeed, left: 0, behavior: "auto" });
    }, 50);
    return () => clearInterval(interval);
  }, [scrollSpeed]);

  const handleScrollToggle = () => {
    trigger("light");
    setScrollSpeed((prev) => (prev === 0 ? 1 : 0));
  };

  const handleScrollSpeed = (delta: number) => {
    trigger("light");
    setScrollSpeed((prev) => {
      if (prev === 0 && delta > 0) return 1;
      return Math.max(0, Math.min(5, prev + delta));
    });
  };

  const [expandedTool, setExpandedTool] = useState<"font" | "tuner" | null>(null);
  const toggleTool = (tool: "font" | "tuner") => {
    trigger("light");
    setExpandedTool((prev) => (prev === tool ? null : tool));
  };

  // Fade mask on the chord list — recomputes when chords, voicings, or transpose change
  // (voicing switches can change row count; transpose can change chord names).
  const chordScroll = useScrollFade<HTMLDivElement>([song.chords, transpose, noBarreMode, voicingState]);

  const beginnerButton = (
    <button
      type="button"
      onClick={toggleBeginner}
      className="w-full te-surface px-3 py-2 flex items-center justify-between gap-2 transition-colors"
      style={{
        borderRadius: "1rem",
        background: beginnerMode ? "rgba(255,136,0,0.12)" : undefined,
      }}
    >
      <div className="flex items-center gap-2 text-left min-w-0">
        <Sparkles
          size={15}
          strokeWidth={2}
          style={{ color: beginnerMode ? "var(--orange)" : "var(--text-muted)", flexShrink: 0 }}
        />
        <div className="min-w-0">
          <div
            className="text-[13px] font-bold leading-tight"
            style={{ color: beginnerMode ? "var(--orange)" : "var(--text)" }}
          >
            Режим для новачка
          </div>
          <div
            className="text-[11px] leading-tight mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            Тональність і аплікатури без баре
          </div>
        </div>
      </div>
      <ToggleKnob active={beginnerMode} />
    </button>
  );

  return (
    <div className="relative">
      {/* ── 3-column grid (desktop) ───────────────────────────────────────── */}
      <div
        className={focusMode ? "lg:mx-auto lg:max-w-3xl" : "lg:grid lg:gap-5"}
        style={focusMode ? undefined : { gridTemplateColumns: "280px 1fr 260px" }}
      >
        {/* ── LEFT: Chord diagrams + Transpose/Capo (sticky) ────────────── */}
        <aside
          className={`${focusMode ? "hidden" : "hidden lg:flex"} flex-col self-start sticky top-6 gap-3 min-h-0`}
          style={{ maxHeight: "calc(100vh - 3rem)" }}
        >
          {beginnerButton}
          <div className="te-surface p-3 rounded-2xl flex flex-col min-h-0 overflow-hidden">
            <div className="flex flex-col gap-2 mb-3 flex-shrink-0">
              <p className="text-[9px] font-bold tracking-widest uppercase opacity-50">Акорди</p>
              <InstrumentSwitch />
            </div>
            <div
              ref={chordScroll.ref}
              onScroll={chordScroll.onScroll}
              className="overflow-y-auto -mx-1 px-1 -my-1 py-1 scrollbar-none"
              style={{
                WebkitMaskImage: buildFadeMask(chordScroll.fadeTop, chordScroll.fadeBottom),
                maskImage: buildFadeMask(chordScroll.fadeTop, chordScroll.fadeBottom),
                WebkitOverflowScrolling: "touch",
              }}
            >
              <ChordPanel chords={song.chords} transpose={transpose} voicingState={voicingState} noBarreMode={noBarreMode} />
            </div>
          </div>

          {/* Transpose */}
          <ControlBlock label="Транспонування">
            <div className="flex items-center justify-between">
              <AdjusterButton onClick={() => setTranspose((p) => p - 1)} aria-label="Понизити тон"><ChevronDown size={16} strokeWidth={2} /></AdjusterButton>
              <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
              <AdjusterButton onClick={() => setTranspose((p) => p + 1)} aria-label="Підвищити тон"><ChevronUp size={16} strokeWidth={2} /></AdjusterButton>
            </div>
          </ControlBlock>

        </aside>

        {/* ── CENTER: Lyrics ───────────────────────────────────────────────── */}
        <div>
          {/* Mobile: beginner toggle above chord panel */}
          <div className="lg:hidden mb-3">{beginnerButton}</div>

          {/* Mobile: collapsible chord panel */}
          <details className="lg:hidden mb-4 te-surface rounded-2xl group">
            <summary className="cursor-pointer select-none list-none px-4 py-3 flex items-center justify-between">
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "var(--text-muted)", opacity: 0.6 }}
              >
                Акорди ({song.chords.length})
              </span>
              <ChevronDown
                size={14}
                className="transition-transform group-open:rotate-180"
                style={{ color: "var(--text-muted)" }}
              />
            </summary>
            <div className="px-4 pb-4">
              <div className="mb-3"><InstrumentSwitch /></div>
              <ChordPanel
                chords={song.chords}
                transpose={transpose}
                voicingState={voicingState}
                diagramWidth={140}
                diagramHeight={175}
                noBarreMode={noBarreMode}
              />
            </div>
          </details>

          {/* Song sections */}
          <div ref={sectionsRef} className="space-y-2">
            {song.sections.map((section: SongSection, sIdx: number) => (
              <div key={sIdx} className="te-surface rounded-2xl overflow-hidden">
                {section.label && (
                  <div className="px-4 pt-3 pb-1">
                    <span
                      className="text-[9px] font-bold tracking-widest uppercase opacity-40"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {section.label}
                    </span>
                  </div>
                )}
                <div className="px-4 pb-3 pt-1 space-y-1">
                  {/* Tab block (collapsible) */}
                  {section.tab && (
                    <details className="group">
                      <summary
                        className="cursor-pointer select-none text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 py-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <span
                          className="inline-block transition-transform group-open:rotate-90"
                          style={{ fontSize: "8px" }}
                        >
                          ▶
                        </span>
                        Табулатура
                      </summary>
                      <div
                        className="mt-2 te-inset rounded-xl overflow-x-auto scrollbar-none"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        <pre
                          className="px-3 py-2.5 font-mono leading-[1.15] whitespace-pre"
                          style={{
                            fontSize: `${Math.max(11, fontSize * 0.7)}px`,
                            color: "var(--text)",
                            opacity: 0.85,
                          }}
                        >
                          {section.tab}
                        </pre>
                      </div>
                    </details>
                  )}
                  {section.lines.map((line, i) => {
                    const hasChords = line.chords.length > 0;
                    const hasLyrics = line.lyrics.length > 0;
                    return (
                      <div
                        key={i}
                        className="font-mono"
                        style={{
                          fontSize: `${fontSize}px`,
                          lineHeight: 1.4,
                          whiteSpace: "pre",
                          color: "var(--text)",
                        }}
                      >
                        {hasChords && (
                          <div style={{ position: "relative", height: `${fontSize * 1.3}px` }}>
                            {line.chords.map(({ chord, col }, j) => {
                              const tr = transposeChord(chord, transpose);
                              return (
                                <span
                                  key={j}
                                  style={{
                                    position: "absolute",
                                    left: `${col}ch`,
                                    top: 0,
                                    color: "var(--orange)",
                                    fontWeight: 700,
                                    letterSpacing: "-0.02em",
                                  }}
                                >
                                  <ChordHover chord={tr} voicingState={voicingState}>
                                    {tr}
                                  </ChordHover>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {hasLyrics && (
                          <div style={{ fontWeight: 450 }}>
                            {" ".repeat(line.lyricsCol)}
                            {line.lyrics}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Controls (sticky) ─────────────────────────────────────── */}
        <aside className={`${focusMode ? "hidden" : "hidden lg:block"} self-start sticky top-6`}>
          <div className="space-y-3">
            {/* Font size + Tuner toggle row */}
            <div className="flex gap-2">
              <TeButton
                shape="pill"
                onClick={() => setFontSize((p) => Math.max(12, p - 2))}
                aria-label="Менший текст"
                icon={AArrowDown}
                iconSize={16}
                className="py-2 font-bold"
                style={{ borderRadius: "1rem", color: "var(--text-muted)", minWidth: 44 }}
              />
              <TeButton
                shape="pill"
                onClick={() => setFontSize((p) => Math.min(28, p + 2))}
                aria-label="Більший текст"
                icon={AArrowUp}
                iconSize={16}
                className="py-2 font-bold"
                style={{ borderRadius: "1rem", color: "var(--text-muted)", minWidth: 44 }}
              />
              <TeButton
                shape="pill"
                onClick={() => toggleTool("tuner")}
                active={expandedTool === "tuner"}
                icon={Music}
                iconSize={14}
                className="flex-1 py-2 text-xs font-bold"
                style={{ borderRadius: "1rem", color: expandedTool === "tuner" ? "var(--orange)" : "var(--text-muted)" }}
              >
                Тюнер
              </TeButton>
            </div>
            {expandedTool === "tuner" && (
              <TunerWidget onClose={() => setExpandedTool(null)} />
            )}

            {/* Auto scroll */}
            <ControlBlock label="Прокрутка">
              <div className="flex items-center justify-between mb-2">
                <AdjusterButton onClick={() => handleScrollSpeed(-1)} aria-label="Повільніше"><Minus size={14} strokeWidth={2.5} /></AdjusterButton>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {scrollSpeed}
                </span>
                <AdjusterButton onClick={() => handleScrollSpeed(1)} aria-label="Швидше"><Plus size={14} strokeWidth={2.5} /></AdjusterButton>
              </div>
              <TeButton
                shape="pill"
                onClick={handleScrollToggle}
                className="w-full py-1.5 text-xs font-bold"
                style={{
                  borderRadius: "0.5rem",
                  color: scrollSpeed > 0 ? "var(--orange)" : "var(--text-muted)",
                }}
              >
                {scrollSpeed > 0 ? "■ Стоп" : "▶ Старт"}
              </TeButton>
            </ControlBlock>

            {/* Rhythm / metronome */}
            <RhythmPlayer
              strumming={song.strumming ?? ["D", "D", "U", "U", "D", "U"]}
              tempo={song.tempo ?? 90}
              timeSignature={song.timeSignature ?? "4/4"}
            />

            {/* Audio player */}
            {song.youtubeId && (
              <SongPlayer
                youtubeId={song.youtubeId}
                title={song.title}
                artist={song.artist}
              />
            )}
          </div>
        </aside>
      </div>

      {/* ── Mobile controls bar ──────────────────────────────────────────────── */}
      <div className="lg:hidden mt-6 grid grid-cols-2 gap-3">
        <ControlBlock label="Транспонування">
          <div className="flex items-center justify-between">
            <AdjusterButton onClick={() => setTranspose((p) => p - 1)} aria-label="Понизити тон"><ChevronDown size={16} strokeWidth={2} /></AdjusterButton>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <AdjusterButton onClick={() => setTranspose((p) => p + 1)} aria-label="Підвищити тон"><ChevronUp size={16} strokeWidth={2} /></AdjusterButton>
          </div>
        </ControlBlock>

        <ControlBlock label="Прокрутка">
          <div className="flex items-center justify-between mb-2">
            <AdjusterButton onClick={() => handleScrollSpeed(-1)} aria-label="Повільніше"><Minus size={14} strokeWidth={2.5} /></AdjusterButton>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {scrollSpeed}
            </span>
            <AdjusterButton onClick={() => handleScrollSpeed(1)} aria-label="Швидше"><Plus size={14} strokeWidth={2.5} /></AdjusterButton>
          </div>
          <TeButton
            shape="pill"
            onClick={handleScrollToggle}
            className="w-full py-1.5 text-xs font-bold"
            style={{
              borderRadius: "0.5rem",
              color: scrollSpeed > 0 ? "var(--orange)" : "var(--text-muted)",
            }}
          >
            {scrollSpeed > 0 ? "■ Стоп" : "▶ Старт"}
          </TeButton>
        </ControlBlock>
      </div>

      {/* Mobile font size + tuner toggle row */}
      <div className="lg:hidden mt-3 flex gap-2">
        <TeButton
          shape="pill"
          onClick={() => setFontSize((p) => Math.max(12, p - 2))}
          aria-label="Менший текст"
          icon={AArrowDown}
          iconSize={16}
          className="py-2.5 font-bold"
          style={{ borderRadius: "1rem", color: "var(--text-muted)", minWidth: 44 }}
        />
        <TeButton
          shape="pill"
          onClick={() => setFontSize((p) => Math.min(28, p + 2))}
          aria-label="Більший текст"
          icon={AArrowUp}
          iconSize={16}
          className="py-2.5 font-bold"
          style={{ borderRadius: "1rem", color: "var(--text-muted)", minWidth: 44 }}
        />
        <TeButton
          shape="pill"
          onClick={() => toggleTool("tuner")}
          active={expandedTool === "tuner"}
          icon={Music}
          iconSize={14}
          className="flex-1 py-2.5 text-xs font-bold"
          style={{ borderRadius: "1rem", color: expandedTool === "tuner" ? "var(--orange)" : "var(--text-muted)" }}
        >
          Тюнер
        </TeButton>
      </div>
      {expandedTool === "tuner" && (
        <div className="lg:hidden mt-3 max-w-sm mx-auto">
          <TunerWidget onClose={() => setExpandedTool(null)} />
        </div>
      )}

    </div>
  );
}
