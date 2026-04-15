"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Play, Square, Music } from "lucide-react";
import { transposeChord, ChordPanel, ChordDiagram, ChordHover, lookupChord, useVoicings } from "./ChordDiagram";
import { suggestCapo } from "@/features/song/data/chord-templates";
import { SongPlayer } from "./SongPlayer";
import { TunerWidget } from "@/features/tuner/components/TunerWidget";

// ─── Helper sub-components ────────────────────────────────────────────────────

function ControlBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="te-surface p-3 rounded-2xl">
      <p
        className="text-[9px] font-bold tracking-widest uppercase mb-2 opacity-50"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="te-knob w-7 h-7 flex items-center justify-center text-sm font-bold active:scale-90 transition-transform"
      style={{ borderRadius: "50%" }}
    >
      {children}
    </button>
  );
}

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
        window.AudioContext || (window as any).webkitAudioContext;
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

  // Mobile chord panel — deduplicated chords
  const mobileChordItems = song.chords.map((chord) => {
    const transposed = transposeChord(chord, transpose - capo);
    return { chord, transposed };
  });

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
          {/* Mobile: horizontal chord scroll */}
          <div className="lg:hidden mb-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-3 pb-2">
              {mobileChordItems.map(({ chord, transposed }) => {
                const defs = lookupChord(transposed);
                const def = defs?.[0];
                if (!def) {
                  return (
                    <div
                      key={chord}
                      className="flex-shrink-0 flex flex-col items-center"
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: "bold",
                          color: "var(--text)",
                        }}
                      >
                        {transposed}
                      </span>
                      <div
                        style={{
                          width: 52,
                          height: 62,
                          border: "1px dashed currentColor",
                          borderRadius: 6,
                          opacity: 0.2,
                        }}
                      />
                    </div>
                  );
                }
                return (
                  <div key={chord} className="flex-shrink-0">
                    <ChordDiagram
                      name={transposed}
                      def={def}
                      width={52}
                      height={70}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Song sections */}
          <div className="space-y-6">
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
                                    fontSize: `${fontSize * 0.75}px`,
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
                          lineHeight: hasChords ? 2.4 : 1.55,
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
                                      fontSize: `${fontSize * 0.75}px`,
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
                <SmallBtn onClick={() => setTranspose((p) => p - 1)}>−</SmallBtn>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {transpose > 0 ? `+${transpose}` : transpose}
                </span>
                <SmallBtn onClick={() => setTranspose((p) => p + 1)}>+</SmallBtn>
              </div>
            </ControlBlock>

            {/* Capo */}
            <ControlBlock label="Каподастр">
              <div className="flex items-center justify-between">
                <SmallBtn onClick={() => { trigger("light"); setCapo((p) => Math.max(0, p - 1)); }}>−</SmallBtn>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {capo > 0 ? `${capo} лад` : "—"}
                </span>
                <SmallBtn onClick={() => { trigger("light"); setCapo((p) => Math.min(11, p + 1)); }}>+</SmallBtn>
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
                <SmallBtn
                  onClick={() => setFontSize((p) => Math.max(12, p - 2))}
                >
                  −
                </SmallBtn>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {fontSize}
                </span>
                <SmallBtn
                  onClick={() => setFontSize((p) => Math.min(28, p + 2))}
                >
                  +
                </SmallBtn>
              </div>
            </ControlBlock>

            {/* Auto scroll */}
            <ControlBlock label="Прокрутка">
              <div className="flex items-center justify-between mb-2">
                <SmallBtn onClick={() => handleScrollSpeed(-1)}>−</SmallBtn>
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {scrollSpeed}
                </span>
                <SmallBtn onClick={() => handleScrollSpeed(1)}>+</SmallBtn>
              </div>
              <button
                onClick={handleScrollToggle}
                className="w-full te-key py-1.5 text-xs font-bold"
                style={{
                  borderRadius: "0.5rem",
                  color: scrollSpeed > 0 ? "var(--orange)" : "var(--text-muted)",
                }}
              >
                {scrollSpeed > 0 ? "■ Стоп" : "▶ Старт"}
              </button>
            </ControlBlock>

            {/* Strumming */}
            {song.strumming && (
              <ControlBlock label="Ритм">
                <div className="flex flex-wrap gap-1 mb-2">
                  {song.strumming.map((hit, i) => (
                    <span
                      key={i}
                      className="te-key text-xs w-6 h-6 flex items-center justify-center"
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
                <button
                  onClick={() => {
                    trigger("medium");
                    initAudio();
                    setIsPlayingStrum(!isPlayingStrum);
                  }}
                  className="w-full te-key py-1.5 text-xs font-bold"
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
                </button>
              </ControlBlock>
            )}

            {/* Tuner */}
            {showTuner ? (
              <TunerWidget onClose={() => setShowTuner(false)} />
            ) : (
              <button
                onClick={() => { trigger("light"); setShowTuner(true); }}
                className="w-full te-key py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                style={{ borderRadius: "1rem", color: "var(--text-muted)" }}
              >
                <Music size={14} />
                Тюнер
              </button>
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
            <SmallBtn onClick={() => setTranspose((p) => p - 1)}>−</SmallBtn>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <SmallBtn onClick={() => setTranspose((p) => p + 1)}>+</SmallBtn>
          </div>
        </ControlBlock>

        <ControlBlock label="Каподастр">
          <div className="flex items-center justify-between">
            <SmallBtn onClick={() => { trigger("light"); setCapo((p) => Math.max(0, p - 1)); }}>−</SmallBtn>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {capo > 0 ? capo : "—"}
            </span>
            <SmallBtn onClick={() => { trigger("light"); setCapo((p) => Math.min(11, p + 1)); }}>+</SmallBtn>
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
            <SmallBtn onClick={() => setFontSize((p) => Math.max(12, p - 2))}>−</SmallBtn>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {fontSize}
            </span>
            <SmallBtn onClick={() => setFontSize((p) => Math.min(28, p + 2))}>+</SmallBtn>
          </div>
        </ControlBlock>

        <ControlBlock label="Прокрутка">
          <div className="flex items-center justify-between mb-2">
            <SmallBtn onClick={() => handleScrollSpeed(-1)}>−</SmallBtn>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {scrollSpeed}
            </span>
            <SmallBtn onClick={() => handleScrollSpeed(1)}>+</SmallBtn>
          </div>
          <button
            onClick={handleScrollToggle}
            className="w-full te-key py-1.5 text-xs font-bold"
            style={{
              borderRadius: "0.5rem",
              color: scrollSpeed > 0 ? "var(--orange)" : "var(--text-muted)",
            }}
          >
            {scrollSpeed > 0 ? "■ Стоп" : "▶ Старт"}
          </button>
        </ControlBlock>
      </div>

      {/* Mobile tuner button */}
      {!showTuner && (
        <div className="lg:hidden mt-3">
          <button
            onClick={() => { trigger("light"); setShowTuner(true); }}
            className="w-full te-key py-2.5 text-xs font-bold flex items-center justify-center gap-2"
            style={{ borderRadius: "1rem", color: "var(--text-muted)" }}
          >
            <Music size={14} />
            Тюнер
          </button>
        </div>
      )}
    </div>
  );
}
