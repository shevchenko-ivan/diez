"use client";

import { useState, useEffect, useRef } from "react";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Music, Minus, Plus, ChevronDown, ChevronUp, AArrowDown, AArrowUp } from "lucide-react";
import { transposeChord, ChordPanel, ChordHover, useVoicings } from "./ChordDiagram";
import { SongPlayer } from "./SongPlayer";
import { RhythmPlayer } from "./RhythmPlayer";
import { TunerWidget } from "@/features/tuner/components/TunerWidget";
import { ControlBlock } from "@/shared/components/ControlBlock";
import { AdjusterButton } from "@/shared/components/AdjusterButton";
import { TeButton } from "@/shared/components/TeButton";

// ─── SongViewer ───────────────────────────────────────────────────────────────

export function SongViewer({ song }: { song: Song }) {
  const [transpose, setTranspose] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHaptics();
  const voicingState = useVoicings(song.slug);

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
            <ChordPanel chords={song.chords} transpose={transpose} voicingState={voicingState} />
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
                transpose={transpose}
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
        <aside className="hidden lg:block self-start sticky top-6">
          <div className="space-y-3">
            {/* Font size + Tuner toggle row */}
            <div className="flex gap-2">
              <TeButton
                shape="pill"
                onClick={() => toggleTool("font")}
                active={expandedTool === "font"}
                icon={AArrowUp}
                iconSize={16}
                className="flex-1 py-2 text-xs font-bold"
                style={{ borderRadius: "1rem", color: expandedTool === "font" ? "var(--orange)" : "var(--text-muted)" }}
              >
                Розмір
              </TeButton>
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
            {expandedTool === "font" && (
              <ControlBlock label="Розмір тексту">
                <div className="flex items-center justify-between">
                  <AdjusterButton onClick={() => setFontSize((p) => Math.max(12, p - 2))} aria-label="Менший текст">
                    <AArrowDown size={16} strokeWidth={2} />
                  </AdjusterButton>
                  <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
                    {fontSize}
                  </span>
                  <AdjusterButton onClick={() => setFontSize((p) => Math.min(28, p + 2))} aria-label="Більший текст">
                    <AArrowUp size={16} strokeWidth={2} />
                  </AdjusterButton>
                </div>
              </ControlBlock>
            )}
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
          onClick={() => toggleTool("font")}
          active={expandedTool === "font"}
          icon={AArrowUp}
          iconSize={16}
          className="flex-1 py-2.5 text-xs font-bold"
          style={{ borderRadius: "1rem", color: expandedTool === "font" ? "var(--orange)" : "var(--text-muted)" }}
        >
          Розмір
        </TeButton>
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
      {expandedTool === "font" && (
        <div className="lg:hidden mt-3">
          <ControlBlock label="Розмір тексту">
            <div className="flex items-center justify-between">
              <AdjusterButton onClick={() => setFontSize((p) => Math.max(12, p - 2))} aria-label="Менший текст">
                <AArrowDown size={16} strokeWidth={2} />
              </AdjusterButton>
              <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
                {fontSize}
              </span>
              <AdjusterButton onClick={() => setFontSize((p) => Math.min(28, p + 2))} aria-label="Більший текст">
                <AArrowUp size={16} strokeWidth={2} />
              </AdjusterButton>
            </div>
          </ControlBlock>
        </div>
      )}
      {expandedTool === "tuner" && (
        <div className="lg:hidden mt-3 max-w-sm mx-auto">
          <TunerWidget onClose={() => setExpandedTool(null)} />
        </div>
      )}

    </div>
  );
}
