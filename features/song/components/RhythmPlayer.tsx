"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Minus, Plus } from "lucide-react";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { ControlBlock } from "@/shared/components/ControlBlock";
import { AdjusterButton } from "@/shared/components/AdjusterButton";
import { TeButton } from "@/shared/components/TeButton";

type Strum = "D" | "U" | "Dx" | "Ux";

interface RhythmPlayerProps {
  strumming: Strum[];
  tempo: number;
  timeSignature?: string;
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
export function RhythmPlayer({ strumming, tempo: defaultTempo, timeSignature = "4/4" }: RhythmPlayerProps) {
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

    const playTick = (hit: Strum, accent: boolean) => {
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

      const baseVolume = isMute ? 0.15 : isDown ? 0.4 : 0.3;
      const volume = accent ? Math.min(0.9, baseVolume * 1.8) : baseVolume;
      const duration = isMute ? 0.04 : 0.12;

      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(accent ? 55 : isDown ? 35 : 20);
      }
    };

    const timer = setInterval(() => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const hit = strumming[index];
      setActiveIndex(index);
      playTick(hit, index % measureLen === 0);
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

  return (
    <ControlBlock label="Метроном">
      {/* Strum row */}
      <div className="flex flex-wrap items-center justify-center gap-0.5 mb-2">
        {strumming.map((hit, i) => {
          const isDown = hit.startsWith("D");
          const isMute = hit.endsWith("x");
          const active = activeIndex === i;
          const isAccent = i % measureLen === 0;
          return (
            <span
              key={i}
              className="flex items-center justify-center rounded-md transition-all relative"
              style={{
                width: "22px",
                height: "26px",
                fontSize: isAccent ? "18px" : "16px",
                fontWeight: isAccent ? 900 : 700,
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
                  : isAccent
                  ? "rgba(255,136,0,0.06)"
                  : "transparent",
                transform: active ? (isAccent ? "scale(1.4)" : "scale(1.25)") : "scale(1)",
                textShadow: isAccent ? "0 0 2px rgba(255,136,0,0.5)" : "none",
              }}
            >
              {isDown ? "↓" : "↑"}
              {isAccent && (
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
          <div style={{ fontSize: "8px", opacity: 0.5, letterSpacing: "0.1em" }}>BPM</div>
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
    </ControlBlock>
  );
}
