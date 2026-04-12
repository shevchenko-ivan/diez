"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChordDef = {
  strings: number[]; // 6 values [low E, A, D, G, B, high E], -1=muted, 0=open, 1+=fret number
  baseFret: number;  // first fret shown (1 = nut position)
  barre?: number;    // fret where full barre is applied
};

// ─── Chord Database ───────────────────────────────────────────────────────────

export const CHORD_DB: Record<string, ChordDef> = {
  Am:    { strings: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
  Am7:   { strings: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
  A:     { strings: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
  A7:    { strings: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
  Amaj7: { strings: [-1, 0, 2, 1, 2, 0], baseFret: 1 },
  Asus2: { strings: [-1, 0, 2, 2, 0, 0], baseFret: 1 },
  Asus4: { strings: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
  Bm:    { strings: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: 2 },
  B7:    { strings: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
  B:     { strings: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: 2 },
  C:     { strings: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
  C7:    { strings: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
  Cm:    { strings: [-1, 3, 5, 5, 4, 3], baseFret: 3, barre: 3 },
  Cmaj7: { strings: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
  D:     { strings: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
  D7:    { strings: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
  Dm:    { strings: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
  Dm7:   { strings: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
  Dsus2: { strings: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
  Dsus4: { strings: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
  E:     { strings: [0, 2, 2, 1, 0, 0], baseFret: 1 },
  E7:    { strings: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  Em:    { strings: [0, 2, 2, 0, 0, 0], baseFret: 1 },
  Em7:   { strings: [0, 2, 2, 0, 3, 0], baseFret: 1 },
  F:     { strings: [1, 1, 2, 3, 3, 1], baseFret: 1, barre: 1 },
  Fm:    { strings: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: 1 },
  Fmaj7: { strings: [-1, -1, 3, 2, 1, 0], baseFret: 1 },
  G:     { strings: [3, 2, 0, 0, 0, 3], baseFret: 1 },
  G7:    { strings: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  Gm:    { strings: [3, 5, 5, 3, 3, 3], baseFret: 3, barre: 3 },
  Gmaj7: { strings: [3, 2, 0, 0, 0, 2], baseFret: 1 },
  // German notation (H = B natural, Hm = Bm)
  H:     { strings: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: 2 },
  Hm:    { strings: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: 2 },
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
  if (CHORD_DB[result]) return result;
  // Also try flat alias
  if (SHARP_TO_FLAT[root]) {
    const flatResult = SHARP_TO_FLAT[root] + modifier;
    if (CHORD_DB[flatResult]) return flatResult;
  }
  return result;
}

// ─── SVG constants ────────────────────────────────────────────────────────────

const STRING_LEFT = 10;
const STRING_RIGHT = 60;
const FRET_TOP = 24;
const FRET_BOTTOM = 78;
const NUM_STRINGS = 6;
const NUM_FRETS = 4;
const STRING_GAP = (STRING_RIGHT - STRING_LEFT) / (NUM_STRINGS - 1); // 10
const FRET_GAP = (FRET_BOTTOM - FRET_TOP) / NUM_FRETS; // 13.5

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

export function ChordDiagram({ name, def, width = 68, height = 90 }: ChordDiagramProps) {
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
      viewBox="0 0 68 90"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Chord name */}
      <text
        x="34"
        y="12"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="currentColor"
        fontFamily="inherit"
      >
        {name}
      </text>

      {/* baseFret label if > 1 */}
      {baseFret > 1 && (
        <text
          x="6"
          y="30"
          textAnchor="middle"
          fontSize="7"
          fill="currentColor"
          opacity="0.6"
          fontFamily="inherit"
        >
          {baseFret}fr
        </text>
      )}

      {/* Nut (thick rect at top of fret area when baseFret === 1) */}
      {baseFret === 1 && (
        <rect
          x={STRING_LEFT}
          y={FRET_TOP}
          width={STRING_RIGHT - STRING_LEFT}
          height={3}
          fill="currentColor"
          rx="1"
        />
      )}

      {/* Fret lines (4 horizontal lines, below the nut) */}
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
              cy={20}
              r={4}
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
              y={21}
              textAnchor="middle"
              fontSize="9"
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
          x={stringX(barreMin) - 5}
          y={barreY - FRET_GAP / 2}
          width={stringX(barreMax) - stringX(barreMin) + 10}
          height={FRET_GAP}
          rx={5}
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
            r={5}
            fill="var(--orange)"
          />
        );
      })}
    </svg>
  );
}

// ─── ChordPanel ───────────────────────────────────────────────────────────────

interface ChordPanelProps {
  chords: string[];
  transpose: number;
  diagramWidth?: number;
  diagramHeight?: number;
}

export function ChordPanel({ chords, transpose, diagramWidth = 68, diagramHeight = 90 }: ChordPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {chords.map((chord) => {
        const transposed = transposeChord(chord, transpose);
        const lookupKey = normalizeForDB(transposed);
        const def = CHORD_DB[lookupKey] ?? CHORD_DB[transposed];

        if (!def) {
          // Placeholder for unknown chords
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

        return (
          <div key={chord} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ChordDiagram
              name={transposed}
              def={def}
              width={diagramWidth}
              height={diagramHeight}
            />
          </div>
        );
      })}
    </div>
  );
}
