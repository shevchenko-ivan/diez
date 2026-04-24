"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Music, Gauge, Minus, Plus, ChevronDown, ChevronUp, AArrowDown, AArrowUp, Sparkles, Play, Pause, Pencil, X } from "lucide-react";
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

// ─── Line wrapping ──────────────────────────────────────────────────────────
// Split a chord+lyric line into segments that fit within `charsPerRow` columns.
// Each segment keeps its own lyric substring + chord list re-anchored to segment
// start, so the renderer can draw them as independent mono rows without losing
// chord-over-character alignment.
type LineSegment = {
  lyrics: string;
  lyricsCol: number;
  chords: { chord: string; col: number }[];
  inlineChords?: boolean;
  marker?: string;
};

function wrapLine(
  line: { lyrics: string; lyricsCol: number; chords: { chord: string; col: number }[]; inlineChords?: boolean; marker?: string },
  chords: { chord: string; col: number; len: number }[],
  charsPerRow: number,
): LineSegment[] {
  // Marker chips are tiny and never wrap — emit as a single segment.
  if (line.marker) {
    return [{ lyrics: "", lyricsCol: 0, chords: [], marker: line.marker }];
  }
  const lyricsEnd = line.lyricsCol + line.lyrics.length;
  const chordsEnd = chords.reduce((m, c) => Math.max(m, c.col + c.len), 0);
  const total = Math.max(lyricsEnd, chordsEnd);
  if (total <= charsPerRow || charsPerRow === Infinity) {
    return [{ lyrics: line.lyrics, lyricsCol: line.lyricsCol, chords: line.chords, inlineChords: line.inlineChords }];
  }

  const segments: LineSegment[] = [];
  let absStart = 0;
  while (absStart < total) {
    let absEnd = Math.min(absStart + charsPerRow, total);
    // Prefer breaking at a space inside the lyric window, never mid-chord.
    if (absEnd < total) {
      // Don't cut a chord in half.
      const chordStraddle = chords.find((c) => c.col < absEnd && c.col + c.len > absEnd);
      if (chordStraddle) absEnd = chordStraddle.col;

      // Try to back-off to a space within the lyric range.
      const lyricAbsStart = line.lyricsCol;
      const scanFrom = Math.min(absEnd, lyricsEnd);
      const minBreak = absStart + Math.max(8, Math.floor(charsPerRow / 3));
      for (let p = scanFrom; p > minBreak; p--) {
        const i = p - lyricAbsStart;
        if (i > 0 && i < line.lyrics.length && line.lyrics[i] === " ") {
          absEnd = p;
          break;
        }
      }
    }

    const lStart = Math.max(0, absStart - line.lyricsCol);
    const lEnd = Math.max(0, absEnd - line.lyricsCol);
    let segLyrics = line.lyrics.slice(lStart, lEnd);
    let segLyricsCol = absStart === 0 ? line.lyricsCol : Math.max(0, line.lyricsCol - absStart);

    // On wrapped continuations drop a leading space to avoid phantom indent.
    if (absStart > 0 && segLyrics.startsWith(" ")) {
      const trimmed = segLyrics.replace(/^ +/, "");
      segLyricsCol += segLyrics.length - trimmed.length;
      segLyrics = trimmed;
      // Space absorbed into padding — keep segLyricsCol small to still anchor chords.
      if (segLyricsCol > 0) segLyricsCol = 0;
    }

    const segChords = line.chords
      .filter((c) => c.col >= absStart && c.col < absEnd)
      .map((c) => ({ chord: c.chord, col: c.col - absStart }));

    segments.push({ lyrics: segLyrics, lyricsCol: segLyricsCol, chords: segChords, inlineChords: line.inlineChords });
    absStart = absEnd;
  }
  return segments;
}

// ─── SongViewer ───────────────────────────────────────────────────────────────

export function SongViewer({ song, editHref }: { song: Song; editHref?: string }) {
  const [transpose, setTranspose] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [noBarreMode, setNoBarreMode] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [focusMode, , toggleFocusMode] = useFocusMode();
  const sectionsRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [chWidth, setChWidth] = useState(0);

  // Track container width so we can word-wrap lines that don't fit.
  useEffect(() => {
    const el = sectionsRef.current;
    if (!el) return;
    const update = () => {
      const cs = getComputedStyle(el);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      setContainerWidth(Math.max(0, el.clientWidth - padL - padR));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure real monospace char width from a 10-char probe at the active font
  // size. More reliable than an em multiplier — handles Cyrillic widths and the
  // specific mono stack we're rendering with.
  useLayoutEffect(() => {
    const el = probeRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width / 10;
    if (w > 0) setChWidth(w);
  }, [fontSize, containerWidth]);

  // Available columns per row. Fall back to a conservative em estimate until
  // the probe measurement lands, so wrap starts working on the first paint
  // rather than deferring to post-mount measurement.
  const effChWidth = chWidth || fontSize * 0.62;
  const charsPerRow = containerWidth
    ? Math.max(12, Math.floor(containerWidth / effChWidth) - 1)
    : Infinity;

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

  // Fire-and-forget view increment — once per variant per browser session.
  const activeVariantId = song.activeVariantId;
  useEffect(() => {
    if (!activeVariantId) return;
    const key = `diez:viewed:${activeVariantId}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch {}
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
    // Sub-pixel accumulator: allows speed < 1 px/tick for smooth slow scroll.
    // Base: scrollSpeed=1 → ~10 px/sec (1 px per 100ms tick).
    let acc = 0;
    const pxPerTick = scrollSpeed * 0.5;
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
      acc += pxPerTick;
      if (acc >= 1) {
        const px = Math.floor(acc);
        acc -= px;
        window.scrollBy({ top: px, left: 0, behavior: "auto" });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [scrollSpeed]);

  const handleScrollToggle = () => {
    trigger("light");
    setScrollSpeed((prev) => (prev === 0 ? 1 : 0));
  };

  // Global shortcuts: Space → toggle auto-scroll; F → toggle focus mode.
  // Layout-independent (uses e.code). Ignored in input/textarea/select/contenteditable.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const isSpace = e.code === "Space" || e.key === " ";
      const isF = e.code === "KeyF";
      const isT = e.code === "KeyT";
      if (!isSpace && !isF && !isT) return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      }
      e.preventDefault();
      if (isSpace) handleScrollToggle();
      else if (isF) toggleFocusMode();
      else if (isT) toggleTool("tuner");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Mobile bottom sheet — houses beginner toggle, transpose, font size, tuner,
  // chord diagrams, and (for admins) edit. Closes on backdrop tap or Escape.
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    if (!sheetOpen) {
      // Auto-collapse tools (e.g. tuner) when the sheet is closed — otherwise
      // the mic stays live in the background.
      setExpandedTool(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

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
          className={`${focusMode ? "hidden" : "hidden lg:flex"} flex-col self-start sticky top-6 gap-4 min-h-0`}
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
          {/* Mobile: trigger button opens bottom sheet with all controls */}
          <button
            type="button"
            onClick={() => { trigger("light"); setSheetOpen(true); }}
            className="lg:hidden mb-4 w-full te-surface rounded-2xl px-4 py-3 flex items-center justify-between"
          >
            <span
              className="text-[10px] font-bold tracking-widest uppercase"
              style={{ color: "var(--text-muted)", opacity: 0.6 }}
            >
              Інструменти
            </span>
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </button>

          {/* Bottom sheet */}
          {sheetOpen && (
            <div
              className="lg:hidden fixed inset-0 z-50"
              role="dialog"
              aria-modal="true"
              aria-label="Інструменти"
            >
              {/* Backdrop */}
              <div
                onClick={() => setSheetOpen(false)}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(2px)",
                }}
              />
              {/* Sheet panel */}
              <div
                className="absolute left-0 right-0 bottom-0 te-surface flex flex-col"
                style={{
                  borderTopLeftRadius: "1.25rem",
                  borderTopRightRadius: "1.25rem",
                  maxHeight: "85vh",
                  paddingBottom: "env(safe-area-inset-bottom, 0px)",
                  animation: "dz-sheet-up 200ms ease",
                }}
              >
                {/* Drag handle + header */}
                <div className="flex flex-col items-center pt-2 pb-1 flex-shrink-0">
                  <span
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      background: "var(--text-muted)",
                      opacity: 0.3,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: "var(--text-muted)", opacity: 0.6 }}
                  >
                    Інструменти
                  </span>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    aria-label="Закрити"
                    className="te-icon-btn te-icon-btn-sm"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
                <div className="overflow-y-auto px-4 pb-5 pt-1 flex flex-col gap-5" style={{ WebkitOverflowScrolling: "touch" }}>
                <style jsx>{`
                  @keyframes dz-sheet-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                  }
                `}</style>
              {/* Audio player (compact) — at top */}
              {song.youtubeId && (
                <div className="pb-3" style={{ borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))" }}>
                  <SongPlayer
                    youtubeId={song.youtubeId}
                    title={song.title}
                    artist={song.artist}
                    compact
                  />
                </div>
              )}
              {/* Font size */}
              <div
                className="flex items-center justify-between gap-3 px-3 py-2"
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border, rgba(0,0,0,0.06))",
                }}
              >
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                  Розмір тексту
                </span>
                <div className="flex items-center gap-2">
                  <AdjusterButton
                    onClick={() => setFontSize((p) => Math.max(12, p - 2))}
                    aria-label="Менший текст"
                  >
                    <AArrowDown size={16} strokeWidth={2} />
                  </AdjusterButton>
                  <span
                    className="font-mono font-bold text-sm"
                    style={{ color: "var(--text)", minWidth: 24, textAlign: "center" }}
                  >
                    {fontSize}
                  </span>
                  <AdjusterButton
                    onClick={() => setFontSize((p) => Math.min(28, p + 2))}
                    aria-label="Більший текст"
                  >
                    <AArrowUp size={16} strokeWidth={2} />
                  </AdjusterButton>
                </div>
              </div>

              {/* Tuner */}
              <TeButton
                shape="pill"
                onClick={() => toggleTool("tuner")}
                active={expandedTool === "tuner"}
                icon={Gauge}
                iconSize={14}
                className="w-full py-2 text-xs font-bold justify-center"
                style={{
                  borderRadius: "1rem",
                  color: expandedTool === "tuner" ? "var(--orange)" : "var(--text-muted)",
                }}
              >
                Тюнер
              </TeButton>
              {expandedTool === "tuner" && (
                <div className="max-w-sm mx-auto w-full">
                  <TunerWidget onClose={() => setExpandedTool(null)} />
                </div>
              )}

              {/* Chords */}
              <div className="mt-2 pt-3" style={{ borderTop: "1px solid var(--border, rgba(0,0,0,0.08))" }}>
                {/* Beginner mode */}
                <button
                  type="button"
                  onClick={toggleBeginner}
                  className="mb-3 w-full flex items-center gap-2 px-3 py-2 transition-colors"
                  style={{
                    borderRadius: "0.75rem",
                    background: beginnerMode ? "rgba(255,136,0,0.10)" : "transparent",
                    border: "1px solid var(--border, rgba(0,0,0,0.06))",
                  }}
                >
                  <Sparkles
                    size={14}
                    strokeWidth={2}
                    style={{ color: beginnerMode ? "var(--orange)" : "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    className="text-[12px] font-bold flex-1 text-left"
                    style={{ color: beginnerMode ? "var(--orange)" : "var(--text)" }}
                  >
                    Без баре
                  </span>
                  <ToggleKnob active={beginnerMode} />
                </button>
                {/* Transpose */}
                <div
                  className="mb-3 flex items-center justify-between gap-3 px-3 py-2"
                  style={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border, rgba(0,0,0,0.06))",
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                    Транспонування
                  </span>
                  <div className="flex items-center gap-2">
                    <AdjusterButton onClick={() => setTranspose((p) => p - 1)} aria-label="Понизити тон">
                      <ChevronDown size={16} strokeWidth={2} />
                    </AdjusterButton>
                    <span
                      className="font-mono font-bold text-sm"
                      style={{ color: "var(--text)", minWidth: 24, textAlign: "center" }}
                    >
                      {transpose > 0 ? `+${transpose}` : transpose}
                    </span>
                    <AdjusterButton onClick={() => setTranspose((p) => p + 1)} aria-label="Підвищити тон">
                      <ChevronUp size={16} strokeWidth={2} />
                    </AdjusterButton>
                  </div>
                </div>
                <div className="mb-3"><InstrumentSwitch /></div>
                <ChordPanel
                  chords={song.chords}
                  transpose={transpose}
                  voicingState={voicingState}
                  diagramWidth={92}
                  diagramHeight={115}
                  noBarreMode={noBarreMode}
                />
              </div>

              {/* Rhythm / metronome */}
              {song.tempo && song.strumming && song.strumming.length > 0 && (
                <div className="mt-2 pt-3" style={{ borderTop: "1px solid var(--border, rgba(0,0,0,0.08))" }}>
                  <RhythmPlayer
                    strumming={song.strumming}
                    tempo={song.tempo}
                    timeSignature={song.timeSignature ?? "4/4"}
                  />
                </div>
              )}

              {/* Edit (admin only) */}
              {editHref && (
                <TeButton
                  shape="pill"
                  href={editHref}
                  icon={Pencil}
                  iconSize={14}
                  className="w-full py-2 text-xs font-bold justify-center"
                  style={{ borderRadius: "1rem", color: "var(--orange)" }}
                >
                  Редагувати
                </TeButton>
              )}
                </div>
              </div>
            </div>
          )}

          {/* Song sections — single unified block */}
          <div
            ref={sectionsRef}
            className="-mx-4 pl-4 pr-5 overflow-x-hidden md:mx-0 md:px-4 md:py-3 md:rounded-2xl md:te-surface"
          >
            {/* Hidden probe — measures actual monospace char width at current font size */}
            <span
              ref={probeRef}
              aria-hidden
              className="font-mono"
              style={{
                position: "absolute",
                visibility: "hidden",
                whiteSpace: "pre",
                fontSize: `${fontSize}px`,
                pointerEvents: "none",
              }}
            >
              абвгдеєжзи
            </span>
            {song.sections.map((section: SongSection, sIdx: number) => (
              <div key={sIdx} className={sIdx > 0 ? "mt-8" : ""}>
                {section.label && (
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase whitespace-nowrap"
                      style={{ color: "var(--text-muted)", opacity: 0.75 }}
                    >
                      {section.label}
                    </span>
                    <span
                      className="flex-1 h-px"
                      style={{ background: "var(--border, rgba(0,0,0,0.08))" }}
                    />
                  </div>
                )}
                <div className="space-y-1">
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
                  {(() => {
                    // Pre-compute all segments so each line knows if the previous
                    // one wrapped — wrapped lines get a bigger top margin below
                    // to visually separate the next chord/lyric pair from the
                    // trailing continuation row.
                    const perLine = section.lines.map((line) => {
                      const chordsMeta = line.chords.map((c) => ({
                        chord: c.chord,
                        col: c.col,
                        len: transposeChord(c.chord, transpose).length,
                      }));
                      return wrapLine(line, chordsMeta, charsPerRow);
                    });
                    return section.lines.map((_, i) => {
                      const segments = perLine[i];
                      const prevWrapped = i > 0 && perLine[i - 1].length > 1;
                      return (
                      <div
                        key={i}
                        className="font-mono"
                        style={{
                          fontSize: `${fontSize}px`,
                          color: "var(--text)",
                          marginTop: prevWrapped ? 14 : 0,
                        }}
                      >
                        {segments.map((seg, sIdx) => {
                          if (seg.marker) {
                            return (
                              <div key={sIdx} className="flex items-center gap-3 my-2">
                                <span
                                  className="text-[10px] font-bold tracking-widest uppercase whitespace-nowrap"
                                  style={{ color: "var(--text-muted)", opacity: 0.75 }}
                                >
                                  {seg.marker}
                                </span>
                                <span
                                  className="flex-1 h-px"
                                  style={{ background: "var(--border, rgba(0,0,0,0.08))" }}
                                />
                              </div>
                            );
                          }
                          const inlineMode = !!seg.inlineChords;
                          const hasChords = !inlineMode && seg.chords.length > 0;
                          const hasLyrics = seg.lyrics.length > 0;
                          const isWrap = sIdx > 0;
                          return (
                            <div
                              key={sIdx}
                              style={{
                                position: "relative",
                                lineHeight: 1.4,
                                whiteSpace: "pre",
                                marginTop: isWrap ? 2 : 0,
                              }}
                            >
                              {isWrap && (
                                <span
                                  aria-hidden
                                  style={{
                                    position: "absolute",
                                    left: "-1.1ch",
                                    top: hasChords ? `${fontSize * 1.3}px` : 0,
                                    color: "var(--text-muted)",
                                    opacity: 0.4,
                                    fontWeight: 400,
                                  }}
                                >
                                  ↳
                                </span>
                              )}
                              {hasChords && (
                                <div style={{ position: "relative", height: `${fontSize * 1.3}px`, whiteSpace: "pre" }}>
                                  {seg.chords.map(({ chord, col }, j) => {
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
                              {hasLyrics && !inlineMode && (
                                <div style={{ fontWeight: 450, whiteSpace: "pre" }}>
                                  {" ".repeat(seg.lyricsCol)}
                                  {seg.lyrics}
                                  {/* Wrap continuation: if a chord sits past the
                                      lyric end (over empty space), run a faint
                                      baseline dotted line to the end of the row
                                      so the chord visually belongs to THIS row,
                                      not the next one. */}
                                  {isWrap && (() => {
                                    const lyricsEnd = seg.lyricsCol + seg.lyrics.length;
                                    const chordsMaxCol = seg.chords.reduce((m, c) => {
                                      const len = transposeChord(c.chord, transpose).length;
                                      return Math.max(m, c.col + len);
                                    }, 0);
                                    if (chordsMaxCol <= lyricsEnd + 1) return null;
                                    const rowEnd = Number.isFinite(charsPerRow) ? charsPerRow : chordsMaxCol;
                                    const gap = Math.max(0, rowEnd - lyricsEnd);
                                    if (gap < 2) return null;
                                    // Spaced-dot pattern ". . . ." — sits on
                                    // baseline, exactly 2ch per pair, so it
                                    // never overflows charsPerRow (avoids the
                                    // scrollbar-ResizeObserver feedback loop).
                                    const pairs = Math.floor(gap / 2);
                                    return (
                                      <span
                                        aria-hidden
                                        style={{ color: "var(--text-muted)", opacity: 0.6 }}
                                      >
                                        {". ".repeat(pairs)}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                              {hasLyrics && inlineMode && (
                                <div style={{ fontWeight: 450, whiteSpace: "pre" }}>
                                  {" ".repeat(seg.lyricsCol)}
                                  {(() => {
                                    // Walk the lyric string, wrapping chord-token
                                    // substrings (at their `col` positions) in an
                                    // orange span. Offsets are relative to
                                    // segment start (lyrics without leading pad).
                                    const parts: React.ReactNode[] = [];
                                    const sorted = [...seg.chords].sort((a, b) => a.col - b.col);
                                    let cursor = 0;
                                    sorted.forEach(({ chord, col }, j) => {
                                      const localStart = col - seg.lyricsCol;
                                      const tr = transposeChord(chord, transpose);
                                      // chord substring length in source may
                                      // differ from transposed name — use the
                                      // original un-transposed source length.
                                      const srcLen = seg.lyrics.slice(localStart).match(/^\S+/)?.[0].length ?? tr.length;
                                      if (localStart > cursor) {
                                        parts.push(seg.lyrics.slice(cursor, localStart));
                                      }
                                      parts.push(
                                        <span
                                          key={j}
                                          style={{
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
                                      cursor = localStart + srcLen;
                                    });
                                    if (cursor < seg.lyrics.length) {
                                      parts.push(seg.lyrics.slice(cursor));
                                    }
                                    return parts;
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                    });
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Controls (sticky) ─────────────────────────────────────── */}
        <aside className={`${focusMode ? "hidden" : "hidden lg:block"} self-start sticky top-6`}>
          <div className="space-y-4">
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
                icon={Gauge}
                iconSize={14}
                title="Тюнер — клавіша T"
                className="flex-1 py-2 text-xs font-bold"
                style={{ borderRadius: "1rem", color: expandedTool === "tuner" ? "var(--orange)" : "var(--text-muted)" }}
              >
                Тюнер (T)
              </TeButton>
            </div>
            {expandedTool === "tuner" && (
              <TunerWidget onClose={() => setExpandedTool(null)} />
            )}

            {/* Auto scroll */}
            <ControlBlock label="Прокрутка">
              <div className="flex items-center justify-between mb-3">
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
                title={scrollSpeed > 0 ? "Зупинити прокрутку — клавіша Пробіл" : "Почати прокрутку — клавіша Пробіл"}
                className="w-full py-1.5 text-xs font-bold"
                style={{
                  borderRadius: "0.5rem",
                  color: scrollSpeed > 0 ? "var(--orange)" : "var(--text-muted)",
                }}
              >
                {scrollSpeed > 0 ? "■ Стоп (Пробіл)" : "▶ Старт (Пробіл)"}
              </TeButton>
            </ControlBlock>

            {/* Rhythm / metronome — показуємо тільки якщо темп і патерн вказані вручну */}
            {song.tempo && song.strumming && song.strumming.length > 0 && (
              <RhythmPlayer
                strumming={song.strumming}
                tempo={song.tempo}
                timeSignature={song.timeSignature ?? "4/4"}
              />
            )}

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

      {/* Mobile scroll FAB — fades to transparent while auto-scrolling idle */}
      <ScrollFab
        scrollSpeed={scrollSpeed}
        onToggle={handleScrollToggle}
        onSpeedChange={handleScrollSpeed}
      />

    </div>
  );
}

// ─── Mobile auto-scroll FAB ───────────────────────────────────────────────────
// Single floating button, mobile-only. Idle: visible. Auto-scroll active: fades
// to transparent after 2.5s of no user interaction. Any touch/wheel wakes it
// back up so the user can reach stop/speed controls without hunting.
function ScrollFab({
  scrollSpeed,
  onToggle,
  onSpeedChange,
}: {
  scrollSpeed: number;
  onToggle: () => void;
  onSpeedChange: (delta: number) => void;
}) {
  const [dimmed, setDimmed] = useState(false);
  const { trigger } = useHaptics();

  useEffect(() => {
    if (scrollSpeed === 0) {
      setDimmed(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const wake = () => {
      setDimmed(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setDimmed(true), 2500);
    };
    wake();
    const onTouch = () => wake();
    const onWheel = () => wake();
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("wheel", onWheel);
    };
  }, [scrollSpeed]);

  const active = scrollSpeed > 0;

  return (
    <div
      className="lg:hidden fixed z-40 flex flex-col"
      style={{
        right: 0,
        bottom: 0,
        padding: "8px 8px 6px 8px",
        rowGap: 12,
        paddingRight: "calc(env(safe-area-inset-right, 0px) + 8px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)",
        opacity: dimmed ? 0 : 1,
        transform: dimmed ? "translate(40px, 40px)" : "translate(0, 0)",
        pointerEvents: dimmed ? "none" : "auto",
        transition: "opacity 900ms ease, transform 900ms ease",
        isolation: "isolate",
      }}
    >
      {/*
        L-shaped dock background — pure CSS. Two rounded rectangles (right
        column + bottom row) provide the outer convex 20px corners; a small
        radial-gradient square fills the inner angle with a 20px concave arc.
        Parent wrapper has `filter: drop-shadow` so the outer shadow follows
        the full L silhouette. See `.scrollfab-bg` in globals.css.
      */}
      {/*
        Asymmetric L silhouette — neck (plus column) is 20px narrower
        than play and foot (minus row) is 20px shorter than play. Play's
        top-left gets a 20px border-radius so the concave arc lands
        tangent to neck's left edge and foot's top edge — one smooth
        curve through the whole bend, no step/shelf artifacts.
      */}
      <span className="scrollfab-bg" aria-hidden>
        <span className="scrollfab-bg-neck" aria-hidden />
        <span className="scrollfab-bg-play" aria-hidden />
        <span className="scrollfab-bg-foot" aria-hidden />
      </span>
      {/* TEMP: force-expanded for screenshot — restore `{active && ...}` guards
          around +/- rows to re-hide them when scrollSpeed === 0. */}
      <div className="flex justify-end">
        <AdjusterButton
          onClick={() => { trigger("light"); onSpeedChange(1); }}
          aria-label="Швидше"
        >
          <Plus size={12} strokeWidth={2.5} />
        </AdjusterButton>
      </div>
      <div className="flex items-end" style={{ columnGap: 12 }}>
      <AdjusterButton
        onClick={() => { trigger("light"); onSpeedChange(-1); }}
        aria-label="Повільніше"
      >
        <Minus size={12} strokeWidth={2.5} />
      </AdjusterButton>
      <button
        type="button"
        onClick={() => { trigger("medium"); onToggle(); }}
        aria-label={active ? "Зупинити прокрутку" : "Почати прокрутку"}
        className="te-pill-btn flex flex-col items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          color: active ? "var(--orange)" : "var(--text)",
          gap: 1,
        }}
      >
        {active ? (
          <>
            <Pause size={14} strokeWidth={2.2} fill="currentColor" />
            <span
              className="font-mono font-bold"
              style={{ fontSize: 9, lineHeight: 1, color: "var(--text)" }}
            >
              {scrollSpeed}
            </span>
          </>
        ) : (
          <Play size={16} strokeWidth={2.2} fill="currentColor" style={{ marginLeft: 1 }} />
        )}
      </button>
      </div>
    </div>
  );
}
