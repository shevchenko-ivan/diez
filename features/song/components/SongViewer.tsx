"use client";

import { useState, useEffect, useRef } from "react";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Play, Square } from "lucide-react";
import { transposeChord, ChordPanel, ChordDiagram, CHORD_DB } from "./ChordDiagram";

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
  const [fontSize, setFontSize] = useState(16);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const { trigger } = useHaptics();

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
    const transposed = transposeChord(chord, transpose);
    return { chord, transposed };
  });

  return (
    <div className="relative">
      {/* ── 3-column grid (desktop) ───────────────────────────────────────── */}
      <div
        className="lg:grid lg:gap-5"
        style={{ gridTemplateColumns: "220px 1fr 200px" }}
      >
        {/* ── LEFT: Chord diagrams (sticky) ───────────────────────────────── */}
        <aside className="hidden lg:block self-start sticky top-6">
          <div className="te-surface p-3 rounded-2xl">
            <p className="text-[9px] font-bold tracking-widest uppercase mb-3 opacity-50">
              Акорди
            </p>
            <ChordPanel chords={song.chords} transpose={transpose} />
          </div>
        </aside>

        {/* ── CENTER: Lyrics ───────────────────────────────────────────────── */}
        <div>
          {/* Mobile: horizontal chord scroll */}
          <div className="lg:hidden mb-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-3 pb-2">
              {mobileChordItems.map(({ chord, transposed }) => {
                const def = CHORD_DB[transposed];
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
            {song.sections.map((section: SongSection) => (
              <div key={section.label} className="te-surface rounded-2xl overflow-hidden">
                <div className="px-4 pt-3 pb-1">
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase opacity-40"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {section.label}
                  </span>
                </div>
                <div className="px-4 pb-5 pt-2 space-y-6">
                  {section.lines.map((line, i) => {
                    const words = line.lyrics.split(" ");
                    return (
                      <div key={i}>
                        {/* Chord row */}
                        <div
                          className="flex min-h-[1.4rem] mb-0.5"
                          style={{ flexWrap: "nowrap" }}
                        >
                          {words.map((word, j) => {
                            const chord = line.chords[j] || "";
                            const trChord = transposeChord(chord, transpose);
                            return (
                              <div
                                key={j}
                                className="relative"
                                style={{ marginRight: "0.5rem" }}
                              >
                                {trChord && (
                                  <span
                                    className="font-mono absolute font-bold whitespace-nowrap"
                                    style={{
                                      top: 0,
                                      left: 0,
                                      fontSize: `${fontSize * 0.75}px`,
                                      color: "var(--orange)",
                                      letterSpacing: "-0.02em",
                                    }}
                                  >
                                    {trChord}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Lyric line */}
                        <p
                          style={{
                            fontSize: `${fontSize}px`,
                            lineHeight: 1.55,
                            color: "var(--text)",
                            fontWeight: 450,
                          }}
                        >
                          {line.lyrics}
                        </p>
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
          </div>
        </aside>
      </div>

      {/* ── Mobile controls bar ──────────────────────────────────────────────── */}
      <div className="lg:hidden mt-6 grid grid-cols-3 gap-3">
        <ControlBlock label="Транспоз">
          <div className="flex items-center justify-between">
            <SmallBtn onClick={() => setTranspose((p) => p - 1)}>−</SmallBtn>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <SmallBtn onClick={() => setTranspose((p) => p + 1)}>+</SmallBtn>
          </div>
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
    </div>
  );
}
