"use client";

import type { PianoChordDef } from "../data/chord-templates-piano";

// ─── Audio (reused-singleton AudioContext) ───────────────────────────────────

let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  return sharedAudioCtx;
}

// Additive triangle-ish tone with a sharp attack and exponential decay.
// Cheap and clean — sounds close enough to a piano note for diagram previews.
function playPianoChord(notes: number[]) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const arpeggioGap = 0.015;
  notes.forEach((semi, i) => {
    const freq = 261.626 * Math.pow(2, semi / 12); // C4 = 0
    const start = now + i * arpeggioGap;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 1.9);
  });
}

// ─── Keyboard geometry ───────────────────────────────────────────────────────

const VB_W = 140;
const VB_H = 82;
const NUM_OCTAVES = 2;
const NUM_WHITES = 7 * NUM_OCTAVES; // 14
const WHITE_W = VB_W / NUM_WHITES;
const TOP = 20; // room for the chord name
const WHITE_H = VB_H - TOP;
const BLACK_W = WHITE_W * 0.6;
const BLACK_H = WHITE_H * 0.6;

const WHITE_SEMIS = [0, 2, 4, 5, 7, 9, 11] as const;
const BLACK_SEMIS_WITH_PREV_WHITE = [
  { semi: 1, prevWhite: 0 },   // C#
  { semi: 3, prevWhite: 1 },   // D#
  { semi: 6, prevWhite: 3 },   // F#
  { semi: 8, prevWhite: 4 },   // G#
  { semi: 10, prevWhite: 5 },  // A#
];

// Map a semitone (0..23) to its white-key index (or -1 if it's black).
function whiteIndexFor(semi: number): number {
  const octave = Math.floor(semi / 12);
  const inOct = semi % 12;
  const i = WHITE_SEMIS.indexOf(inOct as typeof WHITE_SEMIS[number]);
  if (i < 0) return -1;
  return octave * 7 + i;
}

// For a black semitone, find the white-key index immediately to its left.
function blackPrevWhiteIndex(semi: number): number {
  const octave = Math.floor(semi / 12);
  const inOct = semi % 12;
  const e = BLACK_SEMIS_WITH_PREV_WHITE.find((b) => b.semi === inOct);
  if (!e) return -1;
  return octave * 7 + e.prevWhite;
}

// ─── Diagram ─────────────────────────────────────────────────────────────────

interface PianoDiagramProps {
  name: string;
  def: PianoChordDef;
  width?: number;
  height?: number;
}

export function PianoDiagram({ name, def, width = 140, height = 70 }: PianoDiagramProps) {
  const noteSet = new Set(def.notes);

  // Highlight only semitones in visible range 0..23.
  const whiteKeys = Array.from({ length: NUM_WHITES }).map((_, wi) => {
    const octave = Math.floor(wi / 7);
    const inOct = wi % 7;
    const semi = octave * 12 + WHITE_SEMIS[inOct];
    return { wi, semi, on: noteSet.has(semi) };
  });

  const blackKeys: { semi: number; cx: number; on: boolean }[] = [];
  for (let semi = 0; semi < NUM_OCTAVES * 12; semi++) {
    const prev = blackPrevWhiteIndex(semi);
    if (prev < 0) continue;
    const cx = (prev + 1) * WHITE_W;
    blackKeys.push({ semi, cx, on: noteSet.has(semi) });
  }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className="chord-diagram-svg"
      style={{ display: "block", overflow: "visible", cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        playPianoChord(def.notes);
      }}
    >
      <title>{`Програти ${name}`}</title>
      <text
        x={VB_W / 2}
        y={TOP - 6}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill="currentColor"
        fontFamily="inherit"
      >
        {name}
      </text>

      {/* White keys */}
      {whiteKeys.map(({ wi, on }) => (
        <rect
          key={`w-${wi}`}
          x={wi * WHITE_W}
          y={TOP}
          width={WHITE_W - 0.3}
          height={WHITE_H}
          rx="1"
          fill={on ? "var(--orange)" : "var(--surface, #ffffff)"}
          stroke="currentColor"
          strokeWidth="0.4"
          opacity={on ? 0.95 : 0.9}
        />
      ))}

      {/* Black keys on top */}
      {blackKeys.map(({ semi, cx, on }) => (
        <rect
          key={`b-${semi}`}
          x={cx - BLACK_W / 2}
          y={TOP}
          width={BLACK_W}
          height={BLACK_H}
          rx="0.6"
          fill={on ? "var(--orange)" : "currentColor"}
          opacity={on ? 0.95 : 0.85}
        />
      ))}
    </svg>
  );
}
