"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Square } from "lucide-react";
import type { StrumPattern, Stroke, NoteLength } from "@/features/song/types";

interface Props {
  pattern: StrumPattern;
}

/**
 * Renders one strumming pattern (UG-style):
 * - Header: name + tempo (BPM) + per-pattern Play
 * - Strokes grouped by beat with the beat number under each group and a
 *   triplet bracket "└─3─┘" beneath triplet groups.
 * - Explicit accents drawn as ">" above the stroke (data-driven, not derived
 *   from position).
 *
 * Accents only adjust volume — timbre/frequency unchanged (per project memory
 * feedback_audio_accent.md).
 */
export function PatternPlayer({ pattern }: Props) {
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { strokes, tempo, noteLength, name } = pattern;
  const beats = useMemo(() => groupByBeat(strokes, noteLength), [strokes, noteLength]);
  const isTriplet = noteLength.endsWith("t");

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
    <div className="space-y-2">
      {/* Header — play + name + bpm */}
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
        <span className="font-bold tracking-tight truncate" style={{ color: "var(--text)" }}>
          {name}
        </span>
        <span className="text-xs font-mono ml-auto flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          {tempo} bpm
        </span>
      </div>

      {/* Beat groups */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {beats.map((b) => (
          <BeatGroup
            key={b.startIndex}
            strokes={b.strokes}
            startIndex={b.startIndex}
            beatNumber={b.beatNumber}
            isTriplet={isTriplet}
            activeIndex={activeIndex}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Beat grouping ────────────────────────────────────────────────────────────

interface BeatRecord {
  strokes: Stroke[];
  startIndex: number;
  beatNumber: number;
}

function groupByBeat(strokes: Stroke[], nl: NoteLength): BeatRecord[] {
  const groupSize = strokesPerBeat(nl);
  const beats: BeatRecord[] = [];
  for (let i = 0, beat = 1; i < strokes.length; i += groupSize, beat += 1) {
    beats.push({
      strokes: strokes.slice(i, i + groupSize),
      startIndex: i,
      beatNumber: beat,
    });
  }
  return beats;
}

function strokesPerBeat(nl: NoteLength): number {
  switch (nl) {
    case "1/4": return 1;
    case "1/8": return 2;
    case "1/16": return 4;
    case "1/4t": return 3;
    case "1/8t": return 3;
    case "1/16t": return 6;
  }
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

// ─── Beat group renderer ─────────────────────────────────────────────────────

interface BeatGroupProps {
  strokes: Stroke[];
  startIndex: number;
  beatNumber: number;
  isTriplet: boolean;
  activeIndex: number;
}

function BeatGroup({ strokes, startIndex, beatNumber, isTriplet, activeIndex }: BeatGroupProps) {
  return (
    <div className="flex flex-col items-stretch" style={{ minWidth: 22 * strokes.length }}>
      {/* Strokes row */}
      <div className="flex items-end gap-0.5">
        {strokes.map((s, i) => (
          <StrokeCell key={i} stroke={s} active={activeIndex === startIndex + i} />
        ))}
      </div>

      {/* Beat number — under the first stroke of the group */}
      <div className="flex">
        <div
          style={{
            width: 22,
            textAlign: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            lineHeight: "14px",
          }}
        >
          {beatNumber}
        </div>
      </div>

      {/* Triplet bracket — spans the whole group when triplet */}
      {isTriplet && strokes.length === 3 && (
        <div style={{ position: "relative", height: 12, marginTop: 1 }}>
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 3,
              right: 3,
              height: 4,
              borderLeft: "1.5px solid var(--text-muted)",
              borderRight: "1.5px solid var(--text-muted)",
              borderTop: "1.5px solid var(--text-muted)",
              opacity: 0.55,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 9,
              fontWeight: 700,
              color: "var(--text-muted)",
              background: "var(--surface, #FFF)",
              padding: "0 3px",
              lineHeight: "12px",
            }}
          >
            3
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stroke cell ──────────────────────────────────────────────────────────────

function StrokeCell({ stroke, active }: { stroke: Stroke; active: boolean }) {
  const isDown = stroke.d === "D";
  const isMute = stroke.m === true;
  const isAccent = stroke.a === true;
  const isRest = stroke.r === true;

  return (
    <div className="flex flex-col items-center" style={{ width: 22, flexShrink: 0 }}>
      {/* Accent mark above */}
      <div style={{ height: 11, lineHeight: "11px", fontSize: 12, color: "var(--text)", fontWeight: 700 }}>
        {isAccent ? ">" : ""}
      </div>

      {/* Arrow */}
      <div
        className="flex items-center justify-center rounded transition-all"
        style={{
          width: 22,
          height: 24,
          fontSize: isAccent ? 19 : 16,
          fontWeight: isAccent ? 900 : 700,
          color: active ? "var(--orange)" : isAccent ? "var(--text)" : isDown ? "var(--text)" : "var(--text-muted)",
          opacity: isRest ? 0.25 : isMute ? 0.5 : 1,
          background: active ? "rgba(255,136,0,0.18)" : "transparent",
          transform: active ? "scale(1.25)" : "scale(1)",
        }}
      >
        {isRest ? "·" : isDown ? "↓" : "↑"}
      </div>
    </div>
  );
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
