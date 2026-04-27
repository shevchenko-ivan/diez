"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Square } from "lucide-react";
import type { StrumPattern, Stroke, NoteLength } from "@/features/song/types";

interface Props {
  pattern: StrumPattern;
}

/**
 * Renders one strumming pattern (UG-style):
 * - Header: name + tempo (BPM)
 * - Strokes row with beat numbers underneath and triplet brackets when applicable
 * - Explicit accents drawn as ">" above the stroke (data-driven, not derived from position)
 * - Per-pattern Play button (Web Audio)
 *
 * Accents control volume only (per project memory feedback_audio_accent.md).
 */
export function PatternPlayer({ pattern }: Props) {
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { strokes, tempo, noteLength, name } = pattern;
  const layout = useMemo(() => computeBeatLayout(noteLength, strokes.length), [noteLength, strokes.length]);

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
    const intervalMs = intervalFor(noteLength, tempo);
    let i = 0;

    const tick = () => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const stroke = strokes[i];
      setActiveIndex(i);
      if (stroke && !stroke.r) playStroke(audioCtx, stroke);
      i = (i + 1) % strokes.length;
    };
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [playing, strokes, tempo, noteLength]);

  const togglePlay = () => {
    initAudio();
    setPlaying((p) => !p);
  };

  return (
    <div className="space-y-1.5">
      {/* Header — name + bpm + play */}
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? `Зупинити «${name}»` : `Програти «${name}»`}
          className="flex items-center justify-center rounded-full transition-colors flex-shrink-0"
          style={{
            width: 22,
            height: 22,
            background: playing ? "var(--orange)" : "transparent",
            color: playing ? "#FFF" : "var(--text)",
            border: playing ? "none" : "1.5px solid var(--text)",
          }}
        >
          {playing ? (
            <Square size={9} fill="currentColor" />
          ) : (
            <Play size={10} fill="currentColor" style={{ marginLeft: 1 }} />
          )}
        </button>
        <span className="font-bold tracking-tight" style={{ color: "var(--text)" }}>
          {name}
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {tempo} bpm
        </span>
      </div>

      {/* Strokes + beat numbers + triplet brackets */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div className="flex items-end gap-0.5">
            {strokes.map((s, i) => (
              <StrokeCell
                key={i}
                stroke={s}
                active={activeIndex === i}
                beatLabel={layout.beatLabels[i]}
                tripletStart={layout.tripletStarts.has(i)}
                tripletSpan={layout.tripletSpan}
                groupSize={layout.groupSize}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface BeatLayout {
  /** Beat label per stroke index (e.g. "1", "2") or "" for off-beats. */
  beatLabels: string[];
  /** Stroke indices that begin a triplet group. */
  tripletStarts: Set<number>;
  /** Number of strokes in one triplet group (always 3 for triplet note lengths). */
  tripletSpan: number;
  /** Strokes per beat (or per "group" in UG terms). */
  groupSize: number;
}

function computeBeatLayout(nl: NoteLength, total: number): BeatLayout {
  const isTriplet = nl.endsWith("t");
  const beatLabels: string[] = Array(total).fill("");
  const tripletStarts = new Set<number>();
  let groupSize = 2; // 1/8 default

  if (nl === "1/4") groupSize = 1;
  else if (nl === "1/8") groupSize = 2;
  else if (nl === "1/16") groupSize = 4;
  else if (nl === "1/4t") groupSize = 3; // 3 quarter-triplets per "group"
  else if (nl === "1/8t") groupSize = 3; // 3 eighth-triplets per beat
  else if (nl === "1/16t") groupSize = 6;

  // Beat numbering: every groupSize strokes starts a new beat.
  let beat = 1;
  for (let i = 0; i < total; i += groupSize) {
    beatLabels[i] = String(beat);
    beat += 1;
  }

  if (isTriplet) {
    // Triplet bracket spans every 3 strokes.
    const span = nl === "1/4t" ? 3 : nl === "1/8t" ? 3 : 3;
    for (let i = 0; i + span <= total; i += span) {
      tripletStarts.add(i);
    }
  }

  return {
    beatLabels,
    tripletStarts,
    tripletSpan: 3,
    groupSize,
  };
}

function intervalFor(nl: NoteLength, tempo: number): number {
  // Base seconds per quarter note.
  const quarter = 60 / tempo;
  let seconds: number;
  switch (nl) {
    case "1/4": seconds = quarter; break;
    case "1/8": seconds = quarter / 2; break;
    case "1/16": seconds = quarter / 4; break;
    // Quarter-note triplet: 3 notes in 2 beats.
    case "1/4t": seconds = (quarter * 2) / 3; break;
    // Eighth-note triplet: 3 notes per beat.
    case "1/8t": seconds = quarter / 3; break;
    // Sixteenth-note triplet: 6 notes per beat.
    case "1/16t": seconds = quarter / 6; break;
  }
  return seconds * 1000;
}

function playStroke(audioCtx: AudioContext, stroke: Stroke) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  const isDown = stroke.d === "D";
  const isMute = stroke.m === true;

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(isMute ? 800 : isDown ? 1200 : 2000, audioCtx.currentTime);
  osc.frequency.setValueAtTime(isMute ? 80 : isDown ? 110 : 165, audioCtx.currentTime);
  osc.type = "triangle";

  // Volume — accent multiplies base; timbre/frequency unchanged (per memory).
  const baseVolume = isMute ? 0.15 : isDown ? 0.4 : 0.3;
  const volume = stroke.a ? Math.min(0.9, baseVolume * 1.9) : baseVolume;
  const duration = isMute ? 0.04 : 0.12;

  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(stroke.a ? 50 : isDown ? 28 : 18);
  }
}

// ─── Stroke cell ──────────────────────────────────────────────────────────────

interface CellProps {
  stroke: Stroke;
  active: boolean;
  beatLabel: string;
  tripletStart: boolean;
  tripletSpan: number;
  groupSize: number;
}

function StrokeCell({ stroke, active, beatLabel, tripletStart, tripletSpan }: CellProps) {
  const isDown = stroke.d === "D";
  const isMute = stroke.m === true;
  const isAccent = stroke.a === true;
  const isRest = stroke.r === true;

  return (
    <div className="flex flex-col items-center" style={{ width: 22, flexShrink: 0 }}>
      {/* Accent mark above */}
      <div style={{ height: 10, lineHeight: "10px", fontSize: 11, color: "var(--text)", fontWeight: 700 }}>
        {isAccent ? ">" : ""}
      </div>

      {/* Arrow */}
      <div
        className="flex items-center justify-center rounded transition-all"
        style={{
          width: 22,
          height: 24,
          fontSize: isAccent ? 18 : 16,
          fontWeight: isAccent ? 900 : 700,
          color: active ? "var(--orange)" : isAccent ? "var(--text)" : isDown ? "var(--text)" : "var(--text-muted)",
          opacity: isRest ? 0.25 : isMute ? 0.5 : 1,
          background: active ? "rgba(255,136,0,0.18)" : "transparent",
          transform: active ? "scale(1.25)" : "scale(1)",
        }}
      >
        {isRest ? "·" : isDown ? "↓" : "↑"}
      </div>

      {/* Beat number */}
      <div
        style={{
          height: 12,
          lineHeight: "12px",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-muted)",
        }}
      >
        {beatLabel}
      </div>

      {/* Triplet bracket: [─3─] */}
      {tripletStart && (
        <div
          style={{
            position: "relative",
            width: 22 * tripletSpan + 2 * (tripletSpan - 1),
            height: 10,
            marginLeft: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: 4,
              right: 4,
              height: 4,
              borderLeft: "1px solid var(--text-muted)",
              borderRight: "1px solid var(--text-muted)",
              borderBottom: "1px solid var(--text-muted)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 1,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 9,
              fontWeight: 700,
              color: "var(--text-muted)",
              background: "var(--surface)",
              padding: "0 3px",
            }}
          >
            3
          </div>
        </div>
      )}
    </div>
  );
}
