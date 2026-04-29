"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Square } from "lucide-react";
import type { StrumPattern, Stroke, NoteLength } from "@/features/song/types";
import { playStroke, playMetronomeClick, strokesPerBeat as strokesPerBeatFn, intervalFor } from "@/features/song/lib/strumming-audio";

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
  // Quiet metronome click on every beat — toggleable so the user can A/B
  // whether the click helps them feel the pulse against the strum pattern.
  const [metronome, setMetronome] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { strokes, tempo, noteLength, name } = pattern;
  const beats = useMemo(() => groupByBeat(strokes, noteLength), [strokes, noteLength]);
  const isTriplet = noteLength.endsWith("t");
  const beatSize = strokesPerBeatFn(noteLength);

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
      // Click on every beat boundary. Downbeat (beat 1 of the bar = every 4
      // beats in 4/4) gets a brighter click so the listener can re-orient.
      if (metronome && i % beatSize === 0) {
        const beatNumber = Math.floor(i / beatSize); // 0-based beat index
        playMetronomeClick(audioCtx, beatNumber % 4 === 0);
      }
      i = (i + 1) % strokes.length;
    };
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [playing, strokes, tempo, noteLength, metronome, beatSize]);

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
        <button
          type="button"
          onClick={() => setMetronome((m) => !m)}
          aria-pressed={metronome}
          title={metronome ? "Вимкнути метроном" : "Увімкнути метроном (клік на 1, 2, 3, 4)"}
          className="ml-auto flex-shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-1 transition-colors"
          style={{
            borderRadius: "0.5rem",
            border: "1px solid",
            borderColor: metronome ? "rgba(255,140,60,0.45)" : "var(--border, rgba(0,0,0,0.1))",
            background: metronome ? "rgba(255,140,60,0.12)" : "transparent",
            color: metronome ? "var(--orange)" : "var(--text-muted)",
          }}
        >
          Метроном
        </button>
        <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>
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

