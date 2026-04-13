"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChordDef = {
  strings: number[]; // 6 values [low E, A, D, G, B, high E], -1=muted, 0=open, 1+=fret number
  baseFret: number;  // first fret shown (1 = nut position)
  barre?: number;    // fret where full barre is applied
};

// ─── Chord Database ───────────────────────────────────────────────────────────

export const CHORD_DB: Record<string, ChordDef[]> = {
  Am: [
    { strings: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
    { strings: [5, 7, 7, 5, 5, 5], baseFret: 5, barre: 5 },
  ],
  Am7: [
    { strings: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 2, 1, 3], baseFret: 1 },
  ],
  A: [
    { strings: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
    { strings: [5, 7, 7, 6, 5, 5], baseFret: 5, barre: 5 },
  ],
  A7: [
    { strings: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
  ],
  Amaj7: [
    { strings: [-1, 0, 2, 1, 2, 0], baseFret: 1 },
  ],
  Asus2: [
    { strings: [-1, 0, 2, 2, 0, 0], baseFret: 1 },
  ],
  Asus4: [
    { strings: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
  ],
  "A#": [
    { strings: [1, 3, 3, 2, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 1, 3, 3, 3, 1], baseFret: 1, barre: 1 },
    { strings: [6, 8, 8, 7, 6, 6], baseFret: 6, barre: 6 },
  ],
  "A#m": [
    { strings: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: 1 },
    { strings: [6, 8, 8, 6, 6, 6], baseFret: 6, barre: 6 },
  ],
  Bb: [
    { strings: [1, 3, 3, 2, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 1, 3, 3, 3, 1], baseFret: 1, barre: 1 },
    { strings: [6, 8, 8, 7, 6, 6], baseFret: 6, barre: 6 },
  ],
  Bbm: [
    { strings: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: 1 },
    { strings: [6, 8, 8, 6, 6, 6], baseFret: 6, barre: 6 },
  ],
  Bm: [
    { strings: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: 2 },
    { strings: [7, 9, 9, 7, 7, 7], baseFret: 7, barre: 7 },
  ],
  B7: [
    { strings: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
    { strings: [7, 9, 7, 8, 7, 7], baseFret: 7, barre: 7 },
  ],
  B: [
    { strings: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: 2 },
    { strings: [7, 9, 9, 8, 7, 7], baseFret: 7, barre: 7 },
  ],
  C: [
    { strings: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
    { strings: [8, 10, 10, 9, 8, 8], baseFret: 8, barre: 8 },
  ],
  C7: [
    { strings: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
  ],
  Cm: [
    { strings: [-1, 3, 5, 5, 4, 3], baseFret: 3, barre: 3 },
    { strings: [8, 10, 10, 8, 8, 8], baseFret: 8, barre: 8 },
  ],
  Cmaj7: [
    { strings: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
  ],
  "C#": [
    { strings: [-1, 4, 6, 6, 6, 4], baseFret: 4, barre: 4 },
    { strings: [9, 11, 11, 10, 9, 9], baseFret: 9, barre: 9 },
  ],
  "C#m": [
    { strings: [-1, 4, 6, 6, 5, 4], baseFret: 4, barre: 4 },
    { strings: [9, 11, 11, 9, 9, 9], baseFret: 9, barre: 9 },
  ],
  Db: [
    { strings: [-1, 4, 6, 6, 6, 4], baseFret: 4, barre: 4 },
  ],
  Dbm: [
    { strings: [-1, 4, 6, 6, 5, 4], baseFret: 4, barre: 4 },
  ],
  D: [
    { strings: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
    { strings: [-1, 5, 7, 7, 7, 5], baseFret: 5, barre: 5 },
  ],
  D7: [
    { strings: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
  ],
  Dm: [
    { strings: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
    { strings: [-1, 5, 7, 7, 6, 5], baseFret: 5, barre: 5 },
    { strings: [10, 12, 12, 10, 10, 10], baseFret: 10, barre: 10 },
  ],
  Dm7: [
    { strings: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
  ],
  Dsus2: [
    { strings: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
  ],
  Dsus4: [
    { strings: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
  ],
  "D#": [
    { strings: [-1, 6, 8, 8, 8, 6], baseFret: 6, barre: 6 },
  ],
  "D#m": [
    { strings: [-1, 6, 8, 8, 7, 6], baseFret: 6, barre: 6 },
  ],
  Eb: [
    { strings: [-1, 6, 8, 8, 8, 6], baseFret: 6, barre: 6 },
  ],
  Ebm: [
    { strings: [-1, 6, 8, 8, 7, 6], baseFret: 6, barre: 6 },
  ],
  E: [
    { strings: [0, 2, 2, 1, 0, 0], baseFret: 1 },
    { strings: [-1, 7, 9, 9, 9, 7], baseFret: 7, barre: 7 },
  ],
  E7: [
    { strings: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  ],
  Em: [
    { strings: [0, 2, 2, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 7, 9, 9, 8, 7], baseFret: 7, barre: 7 },
  ],
  Em7: [
    { strings: [0, 2, 2, 0, 3, 0], baseFret: 1 },
  ],
  F: [
    { strings: [1, 3, 3, 2, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 2, 1, 1], baseFret: 1 },
    { strings: [-1, 8, 10, 10, 10, 8], baseFret: 8, barre: 8 },
  ],
  Fm: [
    { strings: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 8, 10, 10, 9, 8], baseFret: 8, barre: 8 },
  ],
  Fmaj7: [
    { strings: [-1, -1, 3, 2, 1, 0], baseFret: 1 },
  ],
  "F#": [
    { strings: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 9, 11, 11, 11, 9], baseFret: 9, barre: 9 },
  ],
  "F#m": [
    { strings: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 9, 11, 11, 10, 9], baseFret: 9, barre: 9 },
  ],
  Gb: [
    { strings: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: 2 },
  ],
  Gbm: [
    { strings: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: 2 },
  ],
  G: [
    { strings: [3, 2, 0, 0, 0, 3], baseFret: 1 },
    { strings: [3, 5, 5, 4, 3, 3], baseFret: 3, barre: 3 },
  ],
  G7: [
    { strings: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  ],
  Gm: [
    { strings: [3, 5, 5, 3, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 3, 3, 3], baseFret: 3, barre: 3 },
  ],
  Gmaj7: [
    { strings: [3, 2, 0, 0, 0, 2], baseFret: 1 },
  ],
  "G#": [
    { strings: [4, 6, 6, 5, 4, 4], baseFret: 4, barre: 4 },
  ],
  "G#m": [
    { strings: [4, 6, 6, 4, 4, 4], baseFret: 4, barre: 4 },
  ],
  Ab: [
    { strings: [4, 6, 6, 5, 4, 4], baseFret: 4, barre: 4 },
  ],
  Abm: [
    { strings: [4, 6, 6, 4, 4, 4], baseFret: 4, barre: 4 },
  ],
  // German notation (H = B natural, Hm = Bm)
  H: [
    { strings: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: 2 },
  ],
  Hm: [
    { strings: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: 2 },
  ],
};

// ─── Transpose helpers ────────────────────────────────────────────────────────

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
};
const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb",
};

export function transposeChord(chord: string, semitones: number): string {
  if (!chord) return chord;
  const match = chord.match(/^([A-GH][#b]?)(.*)$/);
  if (!match) return chord;

  let root = match[1];
  const modifier = match[2];

  // Normalize H/Hm (German notation) for transposition
  if (root === "H") root = "B";

  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];

  const index = NOTES.indexOf(root);
  if (index === -1) return chord;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  return NOTES[newIndex] + modifier;
}

// Normalize a chord name to look up in CHORD_DB
// e.g. "Bb" -> "A#", "Db" -> "C#"
function normalizeForDB(chord: string): string {
  const match = chord.match(/^([A-GH][#b]?)(.*)$/);
  if (!match) return chord;
  let root = match[1];
  const modifier = match[2];
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];
  const result = root + modifier;
  if (CHORD_DB[result]?.length) return result;
  // Also try flat alias
  if (SHARP_TO_FLAT[root]) {
    const flatResult = SHARP_TO_FLAT[root] + modifier;
    if (CHORD_DB[flatResult]?.length) return flatResult;
  }
  return result;
}

// ─── SVG constants ────────────────────────────────────────────────────────────

const VB_W = 80;
const VB_H = 100;
const STRING_LEFT = 20;
const STRING_RIGHT = 70;
const FRET_TOP = 26;
const FRET_BOTTOM = 90;
const NUM_STRINGS = 6;
const NUM_FRETS = 4;
const STRING_GAP = (STRING_RIGHT - STRING_LEFT) / (NUM_STRINGS - 1); // 10
const FRET_GAP = (FRET_BOTTOM - FRET_TOP) / NUM_FRETS; // 16

function stringX(i: number) {
  return STRING_LEFT + i * STRING_GAP;
}

function fretY(rowIndex: number) {
  return FRET_TOP + (rowIndex + 0.5) * FRET_GAP;
}

// ─── ChordDiagram ─────────────────────────────────────────────────────────────

interface ChordDiagramProps {
  name: string;
  def: ChordDef;
  width?: number;
  height?: number;
}

export function ChordDiagram({ name, def, width = 80, height = 100 }: ChordDiagramProps) {
  const { strings, baseFret, barre } = def;

  // Compute barre span: indices where fret value === barre (non-muted, >= barre)
  const barreIndices =
    barre !== undefined
      ? strings
          .map((f, i) => ({ f, i }))
          .filter(({ f }) => f !== -1 && f >= barre)
          .map(({ i }) => i)
      : [];
  const barreMin = barreIndices.length > 0 ? Math.min(...barreIndices) : -1;
  const barreMax = barreIndices.length > 0 ? Math.max(...barreIndices) : -1;
  const barreRowIndex = barre !== undefined ? barre - baseFret : -1;
  const barreY = barre !== undefined ? fretY(barreRowIndex) : 0;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Chord name */}
      <text
        x={(STRING_LEFT + STRING_RIGHT) / 2}
        y="12"
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fill="currentColor"
        fontFamily="inherit"
      >
        {name}
      </text>

      {/* Nut (thick rect at top when baseFret === 1) */}
      {baseFret === 1 && (
        <rect
          x={STRING_LEFT - 1}
          y={FRET_TOP - 3}
          width={STRING_RIGHT - STRING_LEFT + 2}
          height={4}
          fill="currentColor"
          rx="1"
        />
      )}

      {/* Fret lines */}
      {Array.from({ length: NUM_FRETS }).map((_, i) => (
        <line
          key={`fret-${i}`}
          x1={STRING_LEFT}
          y1={FRET_TOP + (i + 1) * FRET_GAP}
          x2={STRING_RIGHT}
          y2={FRET_TOP + (i + 1) * FRET_GAP}
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.3"
        />
      ))}

      {/* Fret numbers on the left (only when baseFret > 1) */}
      {baseFret > 1 &&
        Array.from({ length: NUM_FRETS }).map((_, i) => (
          <text
            key={`fretnum-${i}`}
            x={STRING_LEFT - 5}
            y={fretY(i) + 1}
            textAnchor="end"
            fontSize="7"
            fill="currentColor"
            opacity="0.4"
            fontFamily="inherit"
          >
            {baseFret + i}
          </text>
        ))}

      {/* String lines (6 vertical) */}
      {Array.from({ length: NUM_STRINGS }).map((_, i) => (
        <line
          key={`string-${i}`}
          x1={stringX(i)}
          y1={FRET_TOP}
          x2={stringX(i)}
          y2={FRET_BOTTOM}
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.35"
        />
      ))}

      {/* Open / muted markers above diagram */}
      {strings.map((fret, i) => {
        const cx = stringX(i);
        if (fret === 0) {
          return (
            <circle
              key={`open-${i}`}
              cx={cx}
              cy={21}
              r={3.5}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          );
        }
        if (fret === -1) {
          return (
            <text
              key={`mute-${i}`}
              x={cx}
              y={23}
              textAnchor="middle"
              fontSize="8"
              fill="currentColor"
              opacity="0.5"
              fontFamily="inherit"
            >
              ×
            </text>
          );
        }
        return null;
      })}

      {/* Barre rectangle */}
      {barre !== undefined && barreMin !== -1 && (
        <rect
          x={stringX(barreMin) - 4}
          y={barreY - FRET_GAP * 0.25}
          width={stringX(barreMax) - stringX(barreMin) + 8}
          height={FRET_GAP * 0.5}
          rx={FRET_GAP * 0.25}
          fill="currentColor"
          opacity="0.85"
        />
      )}

      {/* Individual dots for fretted notes */}
      {strings.map((fret, i) => {
        if (fret <= 0) return null; // muted or open
        // Skip if this string is part of the barre at the barre fret
        if (
          barre !== undefined &&
          fret === barre &&
          i >= barreMin &&
          i <= barreMax
        ) {
          return null;
        }
        const rowIndex = fret - baseFret;
        const cy = fretY(rowIndex);
        const cx = stringX(i);
        return (
          <circle
            key={`dot-${i}`}
            cx={cx}
            cy={cy}
            r={4.5}
            fill="var(--orange)"
          />
        );
      })}
    </svg>
  );
}

// ─── Lookup helper ────────────────────────────────────────────────────────────

export function lookupChord(chord: string): ChordDef[] | undefined {
  const lookupKey = normalizeForDB(chord);
  const defs = CHORD_DB[lookupKey] ?? CHORD_DB[chord];
  return defs?.length ? defs : undefined;
}

// ─── ChordPanel ───────────────────────────────────────────────────────────────

interface ChordPanelProps {
  chords: string[];
  transpose: number;
  diagramWidth?: number;
  diagramHeight?: number;
}

export function ChordPanel({ chords, transpose, diagramWidth = 80, diagramHeight = 100 }: ChordPanelProps) {
  const [voicingIdx, setVoicingIdx] = useState<Record<string, number>>({});

  return (
    <div className="flex flex-wrap gap-3">
      {chords.map((chord) => {
        const transposed = transposeChord(chord, transpose);
        const defs = lookupChord(transposed);

        if (!defs) {
          return (
            <div
              key={chord}
              style={{
                width: diagramWidth,
                height: diagramHeight,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: "bold",
                  color: "var(--text)",
                  marginBottom: 4,
                }}
              >
                {transposed}
              </span>
              <div
                style={{
                  width: diagramWidth - 8,
                  height: diagramHeight - 20,
                  border: "1px dashed currentColor",
                  borderRadius: 6,
                  opacity: 0.2,
                }}
              />
            </div>
          );
        }

        const total = defs.length;
        const idx = (voicingIdx[transposed] ?? 0) % total;
        const def = defs[idx];

        return (
          <div key={chord} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ChordDiagram
              name={transposed}
              def={def}
              width={diagramWidth}
              height={diagramHeight}
            />
            {total > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <button
                  onClick={() =>
                    setVoicingIdx((prev) => ({
                      ...prev,
                      [transposed]: ((prev[transposed] ?? 0) - 1 + total) % total,
                    }))
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: 10,
                    padding: "0 2px",
                    opacity: 0.5,
                    lineHeight: 1,
                  }}
                >
                  ‹
                </button>
                <span
                  style={{
                    fontSize: 8,
                    opacity: 0.4,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {idx + 1}/{total}
                </span>
                <button
                  onClick={() =>
                    setVoicingIdx((prev) => ({
                      ...prev,
                      [transposed]: ((prev[transposed] ?? 0) + 1) % total,
                    }))
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: 10,
                    padding: "0 2px",
                    opacity: 0.5,
                    lineHeight: 1,
                  }}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
