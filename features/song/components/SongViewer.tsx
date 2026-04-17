"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Music, Minus, Plus, ChevronDown, ChevronUp, AArrowDown, AArrowUp } from "lucide-react";
import { transposeChord, ChordPanel, ChordHover, useVoicings } from "./ChordDiagram";
import { suggestCapo } from "@/features/song/data/chord-templates";
import { SongPlayer } from "./SongPlayer";
import { RhythmPlayer } from "./RhythmPlayer";
import { TunerWidget } from "@/features/tuner/components/TunerWidget";
import { ControlBlock } from "@/shared/components/ControlBlock";
import { AdjusterButton } from "@/shared/components/AdjusterButton";
import { TeButton } from "@/shared/components/TeButton";

// ─── SongViewer ───────────────────────────────────────────────────────────────

export function SongViewer({ song }: { song: Song }) {
  const [transpose, setTranspose] = useState(0);
  const [capo, setCapo] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHaptics();
  const voicingState = useVoicings(song.slug);

  const bestCapo = useMemo(() => {
    const ranked = suggestCapo(song.chords, transpose);
    const best = ranked.find((r) => r.fret > 0);
    if (!best) return null;
    // Only recommend if it's meaningfully easier than no capo
    const noCapoScore = ranked.find((r) => r.fret === 0)?.score ?? Infinity;
    return best.score < noCapoScore - 1 ? best.fret : null;
  }, [song.chords, transpose]);

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

  const [showTuner, setShowTuner] = useState(false);

  return (
    <div className="relative">
      {/* ── 3-column grid (desktop) ───────────────────────────────────────── */}
      <div
        className="lg:grid lg:gap-5"
        style={{ gridTemplateColumns: "280px 1fr 260px" }}
      >
        {/* ── LEFT: Chord diagrams + Transpose/Capo (sticky) ────────────── */}
        <aside className="hidden lg:block self-start sticky top-6 space-y-3">
          <div className="te-surface p-3 rounded-2xl">
            <p className="text-[9px] font-bold tracking-widest uppercase mb-3 opacity-50">
              Акорди
            </p>
            <ChordPanel chords={song.chords} transpose={transpose - capo} voicingState={voicingState} />
          </div>

          {/* Transpose */}
          <ControlBlock label="Транспоз">
            <div className="flex items-center justify-between">
              <AdjusterButton onClick={() => setTranspose((p) => p - 1)} aria-label="Понизити тон"><ChevronDown size={16} strokeWidth={2} /></AdjusterButton>
              <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
              <AdjusterButton onClick={() => setTranspose((p) => p + 1)} aria-label="Підвищити тон"><ChevronUp size={16} strokeWidth={2} /></AdjusterButton>
            </div>
          </ControlBlock>

          {/* Capo */}
          <ControlBlock label="Каподастр">
            <div className="flex items-center justify-between">
              <AdjusterButton onClick={() => { trigger("light"); setCapo((p) => Math.max(0, p - 1)); }} aria-label="Менше"><Minus size={14} strokeWidth={2.5} /></AdjusterButton>
              <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
                {capo > 0 ? `${capo} лад` : "—"}
              </span>
              <AdjusterButton onClick={() => { trigger("light"); setCapo((p) => Math.min(11, p + 1)); }} aria-label="Більше"><Plus size={14} strokeWidth={2.5} /></AdjusterButton>
            </div>
            {bestCapo !== null && bestCapo !== capo && (
              <button
                onClick={() => { trigger("light"); setCapo(bestCapo); }}
                className="w-full mt-2 text-[10px] font-bold py-1 rounded-lg transition-colors"
                style={{ color: "var(--orange)", background: "rgba(255,136,0,0.08)" }}
              >
                Рекоменд.: {bestCapo} лад
              </button>
            )}
          </ControlBlock>
        </aside>

        {/* ── CENTER: Lyrics ───────────────────────────────────────────────── */}
        <div>
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
              <ChordPanel
                chords={song.chords}
                transpose={transpose - capo}
                voicingState={voicingState}
                diagramWidth={140}
                diagramHeight={175}
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
                              const tr = transposeChord(chord, transpose - capo);
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
        <aside className="hidden lg:block self-start sticky top-6">
          <div className="space-y-3">
            {/* Font size */}
            <ControlBlock label="Розмір">
              <div className="flex items-center justify-between">
                <AdjusterButton
                  onClick={() => setFontSize((p) => Math.max(12, p - 2))}
                  aria-label="Менший текст"
                >
                  <AArrowDown size={16} strokeWidth={2} />
                </AdjusterButton>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: "var(--text)" }}
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
            </ControlBlock>

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

            {/* Tuner */}
            {showTuner ? (
              <TunerWidget onClose={() => setShowTuner(false)} />
            ) : (
              <TeButton
                shape="pill"
                onClick={() => { trigger("light"); setShowTuner(true); }}
                icon={Music}
                iconSize={14}
                className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                style={{ borderRadius: "1rem", color: "var(--text-muted)" }}
              >
                Тюнер
              </TeButton>
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

      {/* ── Mobile tuner ──────────────────────────────────────────────────────── */}
      {showTuner && (
        <div className="lg:hidden mt-4 max-w-sm mx-auto">
          <TunerWidget onClose={() => setShowTuner(false)} />
        </div>
      )}

      {/* ── Mobile controls bar ──────────────────────────────────────────────── */}
      <div className="lg:hidden mt-6 grid grid-cols-2 gap-3">
        <ControlBlock label="Транспоз">
          <div className="flex items-center justify-between">
            <AdjusterButton onClick={() => setTranspose((p) => p - 1)} aria-label="Понизити тон"><ChevronDown size={16} strokeWidth={2} /></AdjusterButton>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <AdjusterButton onClick={() => setTranspose((p) => p + 1)} aria-label="Підвищити тон"><ChevronUp size={16} strokeWidth={2} /></AdjusterButton>
          </div>
        </ControlBlock>

        <ControlBlock label="Каподастр">
          <div className="flex items-center justify-between">
            <AdjusterButton onClick={() => { trigger("light"); setCapo((p) => Math.max(0, p - 1)); }} aria-label="Менше"><Minus size={14} strokeWidth={2.5} /></AdjusterButton>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {capo > 0 ? capo : "—"}
            </span>
            <AdjusterButton onClick={() => { trigger("light"); setCapo((p) => Math.min(11, p + 1)); }} aria-label="Більше"><Plus size={14} strokeWidth={2.5} /></AdjusterButton>
          </div>
          {bestCapo !== null && bestCapo !== capo && (
            <button
              onClick={() => { trigger("light"); setCapo(bestCapo); }}
              className="w-full mt-1 text-[9px] font-bold py-0.5 rounded-md"
              style={{ color: "var(--orange)", background: "rgba(255,136,0,0.08)" }}
            >
              Рек.: {bestCapo} лад
            </button>
          )}
        </ControlBlock>

        <ControlBlock label="Розмір">
          <div className="flex items-center justify-between">
            <AdjusterButton onClick={() => setFontSize((p) => Math.max(12, p - 2))} aria-label="Менший текст"><AArrowDown size={16} strokeWidth={2} /></AdjusterButton>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {fontSize}
            </span>
            <AdjusterButton onClick={() => setFontSize((p) => Math.min(28, p + 2))} aria-label="Більший текст"><AArrowUp size={16} strokeWidth={2} /></AdjusterButton>
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

      {/* Mobile tuner button */}
      {!showTuner && (
        <div className="lg:hidden mt-3">
          <TeButton
            shape="pill"
            onClick={() => { trigger("light"); setShowTuner(true); }}
            icon={Music}
            iconSize={14}
            className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
            style={{ borderRadius: "1rem", color: "var(--text-muted)" }}
          >
            Тюнер
          </TeButton>
        </div>
      )}

    </div>
  );
}
