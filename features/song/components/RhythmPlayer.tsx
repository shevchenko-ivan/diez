"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Minus, Plus } from "lucide-react";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { ControlBlock } from "@/shared/components/ControlBlock";
import { AdjusterButton } from "@/shared/components/AdjusterButton";
import { TeButton } from "@/shared/components/TeButton";

type Strum = "D" | "U" | "Dx" | "Ux";
type AccentLevel = "primary" | "secondary" | "none";

interface RhythmPlayerProps {
  strumming: Strum[];
  tempo: number;
  timeSignature?: string;
  /** When true, skip the te-surface ControlBlock wrapper (for nested contexts). */
  bare?: boolean;
}

// Slots per measure = numerator × 2 (since each beat = 2 slots: down + up).
// e.g. 4/4 → 8 slots/measure, 3/4 → 6 slots/measure, 6/8 → 12 slots/measure.
function slotsPerMeasure(ts: string): number {
  const num = parseInt(ts.split("/")[0], 10);
  return Number.isFinite(num) && num > 0 ? num * 2 : 8;
}

// Sidebar metronome + strumming visualizer. Plays the pattern at the chosen
// BPM and highlights the active stroke so the user can feel the beat while
// practising along with the song.
export function RhythmPlayer({ strumming, tempo: defaultTempo, timeSignature = "4/4", bare = false }: RhythmPlayerProps) {
  const measureLen = slotsPerMeasure(timeSignature);
  const { trigger } = useHaptics();
  const [playing, setPlaying] = useState(false);
  const [tempo, setTempo] = useState(defaultTempo);
  const [activeIndex, setActiveIndex] = useState(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  };

  useEffect(() => {
    if (!playing || !audioCtxRef.current) {
      setActiveIndex(-1);
      return;
    }
    const audioCtx = audioCtxRef.current;
    const intervalMs = (60 / tempo / 2) * 1000;
    let index = 0;

    const playTick = (hit: Strum, accent: AccentLevel) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      const isDown = hit.startsWith("D");
      const isMute = hit.endsWith("x");

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(isMute ? 800 : isDown ? 1200 : 2000, audioCtx.currentTime);
      osc.frequency.setValueAtTime(isMute ? 80 : isDown ? 110 : 165, audioCtx.currentTime);
      osc.type = "triangle";

      // Per project memory: accents only change volume — never timbre/frequency.
      // Three-tier groove: primary (beat 1), secondary (other downbeats),
      // none (off-beats / "і"). This is what makes a "вісімка" feel like
      // a rhythmic pattern instead of 8 evenly-played hits.
      const baseVolume = isMute ? 0.15 : isDown ? 0.4 : 0.3;
      const accentMultiplier = accent === "primary" ? 1.9 : accent === "secondary" ? 1.35 : 1;
      const volume = Math.min(0.9, baseVolume * accentMultiplier);
      const duration = isMute ? 0.04 : 0.12;

      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        const ms = accent === "primary" ? 55 : accent === "secondary" ? 35 : isDown ? 22 : 14;
        navigator.vibrate(ms);
      }
    };

    const accentFor = (i: number): AccentLevel => {
      if (i % measureLen === 0) return "primary";
      // Even slots in 4/4 (2,4,6) = downbeats 2/3/4; odd slots = off-beats "і".
      if (i % 2 === 0) return "secondary";
      return "none";
    };

    const timer = setInterval(() => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const hit = strumming[index];
      setActiveIndex(index);
      playTick(hit, accentFor(index));
      index = (index + 1) % strumming.length;
    }, intervalMs);

    return () => clearInterval(timer);
  }, [playing, tempo, strumming, measureLen]);

  const togglePlay = () => {
    trigger("medium");
    initAudio();
    setPlaying((p) => !p);
  };

  // Global shortcut: M → toggle metronome. Layout-independent via e.code.
  // Ignored in inputs/textareas so typing isn't hijacked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code !== "KeyM") return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      }
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adjustTempo = (delta: number) => {
    trigger("light");
    setTempo((t) => Math.max(40, Math.min(240, t + delta)));
  };

  const body = (
    <>
      {/* Strum row */}
      <div className="flex flex-wrap items-center justify-center gap-0.5 mb-2">
        {strumming.map((hit, i) => {
          const isDown = hit.startsWith("D");
          const isMute = hit.endsWith("x");
          const active = activeIndex === i;
          const isPrimary = i % measureLen === 0;
          const isSecondary = !isPrimary && i % 2 === 0;
          const isAccent = isPrimary || isSecondary;
          return (
            <span
              key={i}
              className="flex items-center justify-center rounded-md transition-all relative"
              style={{
                width: "22px",
                height: "26px",
                fontSize: isPrimary ? "18px" : isSecondary ? "17px" : "16px",
                fontWeight: isPrimary ? 900 : isSecondary ? 800 : 700,
                color: active
                  ? "var(--orange)"
                  : isAccent
                  ? "var(--text)"
                  : isDown
                  ? "var(--text)"
                  : "var(--text-muted)",
                opacity: isMute ? 0.5 : 1,
                background: active
                  ? "rgba(255,136,0,0.18)"
                  : isPrimary
                  ? "rgba(255,136,0,0.08)"
                  : isSecondary
                  ? "rgba(255,136,0,0.03)"
                  : "transparent",
                transform: active ? (isPrimary ? "scale(1.4)" : isSecondary ? "scale(1.3)" : "scale(1.25)") : "scale(1)",
                textShadow: isPrimary ? "0 0 2px rgba(255,136,0,0.5)" : "none",
              }}
            >
              {isDown ? "↓" : "↑"}
              {isPrimary && (
                <span
                  style={{
                    position: "absolute",
                    top: "-3px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "var(--orange)",
                  }}
                />
              )}
              {isSecondary && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "3px",
                    height: "3px",
                    borderRadius: "50%",
                    background: "var(--text-muted)",
                    opacity: 0.6,
                  }}
                />
              )}
            </span>
          );
        })}
      </div>

      {/* BPM */}
      <div className="flex items-center justify-between mb-3">
        <AdjusterButton onClick={() => adjustTempo(-5)} aria-label="Повільніше">
          <Minus size={14} strokeWidth={2.5} />
        </AdjusterButton>
        <div className="font-mono font-bold text-center leading-tight" style={{ color: "var(--text)" }}>
          <div className="text-sm">{tempo}</div>
          <div style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>BPM</div>
        </div>
        <AdjusterButton onClick={() => adjustTempo(5)} aria-label="Швидше">
          <Plus size={14} strokeWidth={2.5} />
        </AdjusterButton>
      </div>

      {/* Play / Stop */}
      <TeButton
        shape="pill"
        onClick={togglePlay}
        title={playing ? "Зупинити метроном — клавіша M" : "Запустити метроном — клавіша M"}
        className="w-full py-1.5 text-xs font-bold"
        style={{
          borderRadius: "0.5rem",
          color: playing ? "var(--orange)" : "var(--text-muted)",
        }}
      >
        {playing ? (
          <>
            <Square size={10} className="inline mr-1" fill="currentColor" />
            Стоп (M)
          </>
        ) : (
          <>
            <Play size={10} className="inline mr-1" fill="currentColor" />
            Грати (M)
          </>
        )}
      </TeButton>
    </>
  );

  if (bare) {
    const strumRow = (
      <div className="flex items-center justify-center gap-0.5">
        {strumming.map((hit, i) => {
          const isDown = hit.startsWith("D");
          const isMute = hit.endsWith("x");
          const active = activeIndex === i;
          const isPrimary = i % measureLen === 0;
          const isSecondary = !isPrimary && i % 2 === 0;
          const isAccent = isPrimary || isSecondary;
          return (
            <span
              key={i}
              className="flex items-center justify-center rounded-md transition-all relative"
              style={{
                width: 18,
                height: 20,
                fontSize: isPrimary ? 15 : isSecondary ? 14 : 13,
                fontWeight: isPrimary ? 900 : isSecondary ? 800 : 700,
                color: active ? "var(--orange)" : isAccent || isDown ? "var(--text)" : "var(--text-muted)",
                opacity: isMute ? 0.5 : 1,
                background: active ? "rgba(255,136,0,0.18)" : isPrimary ? "rgba(255,136,0,0.08)" : isSecondary ? "rgba(255,136,0,0.03)" : "transparent",
                transform: active ? (isPrimary ? "scale(1.3)" : isSecondary ? "scale(1.25)" : "scale(1.2)") : "scale(1)",
              }}
            >
              {isDown ? "↓" : "↑"}
              {isPrimary && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "var(--orange)",
                  }}
                />
              )}
            </span>
          );
        })}
      </div>
    );

    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold shrink-0" style={{ color: "var(--text)" }}>Метроном</span>
        <div className="flex items-center gap-1 shrink-0">
          <AdjusterButton onClick={() => adjustTempo(-5)} aria-label="Повільніше">
            <Minus size={12} strokeWidth={2.5} />
          </AdjusterButton>
          <div className="font-mono font-bold text-xs tabular-nums" style={{ color: "var(--text)", minWidth: 24, textAlign: "center" }}>
            {tempo}
          </div>
          <AdjusterButton onClick={() => adjustTempo(5)} aria-label="Швидше">
            <Plus size={12} strokeWidth={2.5} />
          </AdjusterButton>
        </div>
        <div className="flex-1 min-w-0">{strumRow}</div>
        <TeButton
          shape="pill"
          onClick={togglePlay}
          title={playing ? "Зупинити метроном — клавіша M" : "Запустити метроном — клавіша M"}
          className="shrink-0 px-3 py-1.5 text-xs font-bold"
          style={{ borderRadius: "0.5rem", color: playing ? "var(--orange)" : "var(--text-muted)" }}
        >
          {playing ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
        </TeButton>
      </div>
    );
  }
  return <ControlBlock label="Метроном">{body}</ControlBlock>;
}
