"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Play, Square, Music, Minus, Plus, ChevronDown, ChevronUp, AArrowDown, AArrowUp } from "lucide-react";
import { transposeChord, ChordPanel, ChordHover, useVoicings } from "./ChordDiagram";
import { suggestCapo } from "@/features/song/data/chord-templates";
import { SongPlayer } from "./SongPlayer";
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

  // Auto-scroll loop
  useEffect(() => {
    if (scrollSpeed === 0) return;
    const interval = setInterval(() => {
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

  // ─── Strumming Player ────────────────────────────────────────────────────────
  const [showTuner, setShowTuner] = useState(false);
  const [activeStrumIndex, setActiveStrumIndex] = useState(-1);
  const [isPlayingStrum, setIsPlayingStrum] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    if (!isPlayingStrum || !song.strumming || !song.tempo || !audioContextRef.current) {
      setActiveStrumIndex(-1);
      return;
    }

    const audioCtx = audioContextRef.current;
    const intervalMs = (60 / song.tempo / 2) * 1000;
    let index = 0;

    const playTick = (hit: string) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      const isDown = hit.startsWith("D");
      const isMute = hit.endsWith("x");

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(
        isMute ? 800 : isDown ? 1200 : 2000,
        audioCtx.currentTime
      );

      osc.frequency.setValueAtTime(
        isMute ? 80 : isDown ? 110 : 165,
        audioCtx.currentTime
      );
      osc.type = "triangle";

      const volume = isMute ? 0.15 : isDown ? 0.4 : 0.3;
      const duration = isMute ? 0.04 : 0.12;

      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(isDown ? 35 : 20);
      } else {
        trigger(isDown ? "medium" : "light");
      }
    };

    const timer = setInterval(() => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const currentHit = song.strumming![index];
      setActiveStrumIndex(index);
      playTick(currentHit);
      index = (index + 1) % song.strumming!.length;
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlayingStrum, song.strumming, song.tempo, trigger]);

  return (
    <div className="relative">
      {/* ── 3-column grid (desktop) ───────────────────────────────────────── */}
      <div
        className="lg:grid lg:gap-5"
        style={{ gridTemplateColumns: "280px 1fr 260px" }}
      >
        {/* ── LEFT: Chord diagrams (sticky) ───────────────────────────────── */}
        <aside className="hidden lg:block self-start sticky top-6">
          <div className="te-surface p-3 rounded-2xl">
            <p className="text-[9px] font-bold tracking-widest uppercase mb-3 opacity-50">
              Акорди
            </p>
            <ChordPanel chords={song.chords} transpose={transpose - capo} voicingState={voicingState} />
          </div>
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
          <div className="space-y-2">
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
                <div className="px-4 pb-5 pt-2 space-y-4">
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
                    const words = line.lyrics ? line.lyrics.split(/\s+/) : [];
                    const hasChords = line.chords.some((c) => c);

                    // Chord-only line (no lyrics)
                    if (words.length === 0 && hasChords) {
                      return (
                        <div key={i} className="flex flex-wrap gap-3">
                          {line.chords.map((chord, j) => {
                            const tr = transposeChord(chord, transpose - capo);
                            return (
                              <ChordHover key={j} chord={tr} voicingState={voicingState}>
                                <span
                                  className="font-mono font-bold whitespace-nowrap"
                                  style={{
                                    fontSize: `${fontSize * 0.95}px`,
                                    color: "var(--orange)",
                                    letterSpacing: "-0.02em",
                                  }}
                                >
                                  {tr}
                                </span>
                              </ChordHover>
                            );
                          })}
                        </div>
                      );
                    }

                    const indent = (line as { indent?: number }).indent ?? 0;

                    return (
                      <div
                        key={i}
                        style={{
                          paddingTop: hasChords ? `${fontSize * 0.9}px` : 0,
                          paddingLeft: indent > 0 ? `${Math.min(indent, 4) * 0.6}em` : undefined,
                          lineHeight: hasChords ? 1.7 : 1.55,
                        }}
                      >
                        {Array.from({ length: Math.max(words.length, line.chords.length) }, (_, j) => {
                          const word = words[j] || "";
                          const chord = line.chords[j] || "";
                          const trChord = transposeChord(chord, transpose - capo);
                          const isSpacer = j >= words.length;
                          return (
                            <span
                              key={j}
                              style={{
                                display: "inline-block",
                                position: "relative",
                                marginRight: `${fontSize * 0.3}px`,
                                ...(isSpacer ? { minWidth: `${fontSize * 0.5}px` } : {}),
                              }}
                            >
                              {trChord && (
                                <ChordHover chord={trChord} voicingState={voicingState}>
                                  <span
                                    className="font-mono font-bold whitespace-nowrap"
                                    style={{
                                      position: "absolute",
                                      top: `-${fontSize * 0.9}px`,
                                      left: 0,
                                      fontSize: `${fontSize * 0.95}px`,
                                      color: "var(--orange)",
                                      letterSpacing: "-0.02em",
                                    }}
                                  >
                                    {trChord}
                                  </span>
                                </ChordHover>
                              )}
                              <span
                                style={{
                                  fontSize: `${fontSize}px`,
                                  lineHeight: 1.55,
                                  color: "var(--text)",
                                  fontWeight: 450,
                                }}
                              >
                                {word || "\u00A0"}
                              </span>
                            </span>
                          );
                        })}
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
            {/* Transpose */}
            <ControlBlock label="Транспоз">
              <div className="flex items-center justify-between">
                <AdjusterButton onClick={() => setTranspose((p) => p - 1)} aria-label="Понизити тон"><ChevronDown size={16} strokeWidth={2} /></AdjusterButton>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {transpose > 0 ? `+${transpose}` : transpose}
                </span>
                <AdjusterButton onClick={() => setTranspose((p) => p + 1)} aria-label="Підвищити тон"><ChevronUp size={16} strokeWidth={2} /></AdjusterButton>
              </div>
            </ControlBlock>

            {/* Capo */}
            <ControlBlock label="Каподастр">
              <div className="flex items-center justify-between">
                <AdjusterButton onClick={() => { trigger("light"); setCapo((p) => Math.max(0, p - 1)); }} aria-label="Менше"><Minus size={14} strokeWidth={2.5} /></AdjusterButton>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: "var(--text)" }}
                >
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

            {/* Strumming */}
            {song.strumming && (
              <ControlBlock label="Ритм">
                <div className="flex flex-wrap gap-1 mb-2">
                  {song.strumming.map((hit, i) => (
                    <span
                      key={i}
                      className="te-pill-btn text-xs w-6 h-6 flex items-center justify-center"
                      style={{
                        fontSize: "10px",
                        color: hit.startsWith("D")
                          ? "var(--orange)"
                          : "var(--text-muted)",
                        boxShadow:
                          activeStrumIndex === i
                            ? "var(--sh-physical-pressed)"
                            : undefined,
                      }}
                    >
                      {hit.startsWith("D") ? "↓" : "↑"}
                    </span>
                  ))}
                </div>
                <TeButton
                  shape="pill"
                  onClick={() => {
                    trigger("medium");
                    initAudio();
                    setIsPlayingStrum(!isPlayingStrum);
                  }}
                  className="w-full py-1.5 text-xs font-bold"
                  style={{
                    borderRadius: "0.5rem",
                    color: isPlayingStrum ? "var(--orange)" : "var(--text-muted)",
                  }}
                >
                  {isPlayingStrum ? (
                    <>
                      <Square size={10} className="inline mr-1" fill="currentColor" />
                      Стоп
                    </>
                  ) : (
                    <>
                      <Play size={10} className="inline mr-1" fill="currentColor" />
                      Ритм
                    </>
                  )}
                </TeButton>
              </ControlBlock>
            )}

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
