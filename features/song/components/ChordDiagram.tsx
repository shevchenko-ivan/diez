"use client";

import { useState, useCallback, useRef } from "react";
import {
  type ChordDef,
  CHORD_DB,
  NOTES,
  FLAT_TO_SHARP,
  SHARP_TO_FLAT,
  transposeChord,
  lookupChord,
} from "../data/chord-templates";

// Re-export for consumers (SongViewer.tsx imports from here)
export { transposeChord, lookupChord };
export type { ChordDef };

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

// Compute finger assignments (1=index, 2=middle, 3=ring, 4=pinky).
// Barre notes all get finger 1; remaining fretted notes are sorted by
// (fret asc, string index asc) and assigned 2→3→4 in order.
function computeFingers(strings: number[], barre?: number): (number | null)[] {
  const fingers: (number | null)[] = strings.map((f) => (f > 0 ? 0 : null));
  let next = 1;

  if (barre !== undefined) {
    const positions = strings.map((f, i) => (f === barre ? i : -1)).filter((i) => i >= 0);
    if (positions.length >= 2) {
      const [min, max] = [positions[0], positions[positions.length - 1]];
      for (let i = min; i <= max; i++) {
        if (strings[i] === barre) fingers[i] = 1;
      }
      next = 2;
    }
  }

  const remaining: { idx: number; fret: number }[] = [];
  strings.forEach((f, i) => {
    if (fingers[i] === 0) remaining.push({ idx: i, fret: f });
  });
  remaining.sort((a, b) => a.fret - b.fret || a.idx - b.idx);
  for (const { idx } of remaining) fingers[idx] = Math.min(next++, 4);

  return fingers;
}

export function ChordDiagram({ name, def, width = 100, height = 125 }: ChordDiagramProps) {
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

  const fingers = computeFingers(strings, barre);

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
        y="10"
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
              cy={17}
              r={3}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.7"
            />
          );
        }
        if (fret === -1) {
          return (
            <text
              key={`mute-${i}`}
              x={cx}
              y={20}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="currentColor"
              opacity="0.7"
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
        <>
          <rect
            x={stringX(barreMin) - 4}
            y={barreY - FRET_GAP * 0.25}
            width={stringX(barreMax) - stringX(barreMin) + 8}
            height={FRET_GAP * 0.5}
            rx={FRET_GAP * 0.25}
            fill="currentColor"
            opacity="0.85"
          />
          <text
            x={(stringX(barreMin) + stringX(barreMax)) / 2}
            y={barreY + 2}
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="bold"
            fill="white"
            fontFamily="inherit"
          >
            1
          </text>
        </>
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
          <g key={`dot-${i}`}>
            <circle cx={cx} cy={cy} r={4.5} fill="var(--orange)" />
            {fingers[i] !== null && (
              <text
                x={cx}
                y={cy + 2}
                textAnchor="middle"
                fontSize="5.5"
                fontWeight="bold"
                fill="white"
                fontFamily="inherit"
              >
                {fingers[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Lookup helper ────────────────────────────────────────────────────────────

// ─── ChordPanel ───────────────────────────────────────────────────────────────

interface ChordPanelProps {
  chords: string[];
  transpose: number;
  songSlug?: string;
  voicingState?: VoicingState;
  diagramWidth?: number;
  diagramHeight?: number;
}

// ─── Shared voicing state hook ───────────────────────────────────────────────

function storageKey(slug: string) {
  return `diez:voicings:${slug}`;
}

export type VoicingState = {
  voicingIdx: Record<string, number>;
  setVoicingIdx: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
};

export function useVoicings(songSlug?: string): VoicingState {
  const [voicingIdx, setVoicingIdxRaw] = useState<Record<string, number>>(() => {
    if (!songSlug || typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(storageKey(songSlug)) || "{}");
    } catch {
      return {};
    }
  });

  const setVoicingIdx = useCallback((updater: (prev: Record<string, number>) => Record<string, number>) => {
    setVoicingIdxRaw((prev) => {
      const next = updater(prev);
      if (songSlug) {
        try { localStorage.setItem(storageKey(songSlug), JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [songSlug]);

  return { voicingIdx, setVoicingIdx };
}

// ─── VoicingSwitcher (shared prev/next + counter) ────────────────────────────

function VoicingSwitcher({
  chordName,
  total,
  idx,
  setVoicingIdx,
  fontSize = 14,
}: {
  chordName: string;
  total: number;
  idx: number;
  setVoicingIdx: VoicingState["setVoicingIdx"];
  fontSize?: number;
}) {
  if (total <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: -4, width: "100%", paddingLeft: 12 }}>
      <button
        onClick={() =>
          setVoicingIdx((prev) => ({
            ...prev,
            [chordName]: ((prev[chordName] ?? 0) - 1 + total) % total,
          }))
        }
        style={{
          background: "none",
          border: "none",
          color: "var(--text)",
          cursor: "pointer",
          fontSize,
          padding: "0 2px",
          opacity: 0.5,
          lineHeight: 1,
        }}
      >
        ‹
      </button>
      <span
        style={{
          fontSize: fontSize * 0.8,
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
            [chordName]: ((prev[chordName] ?? 0) + 1) % total,
          }))
        }
        style={{
          background: "none",
          border: "none",
          color: "var(--text)",
          cursor: "pointer",
          fontSize,
          padding: "0 2px",
          opacity: 0.5,
          lineHeight: 1,
        }}
      >
        ›
      </button>
    </div>
  );
}

// ─── ChordHover (tooltip on chord text in lyrics) ───────────────────────────

interface ChordHoverProps {
  chord: string;
  voicingState: VoicingState;
  children: React.ReactNode;
}

export function ChordHover({ chord, voicingState, children }: ChordHoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const defs = lookupChord(chord);
  if (!defs) return <>{children}</>;

  const total = defs.length;
  const idx = (voicingState.voicingIdx[chord] ?? 0) % total;
  const def = defs[idx];

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setOpen(true);
  };
  const hide = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ cursor: "pointer" }}
    >
      {children}
      {open && pos && (
        <div
          ref={popupRef}
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{
            position: "fixed",
            top: pos.top - 8,
            left: pos.left,
            transform: "translate(-50%, -100%)",
            zIndex: 50,
            background: "var(--surface)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "8px 10px 6px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            pointerEvents: "auto",
          }}
        >
          <ChordDiagram name={chord} def={def} width={90} height={112} />
          <VoicingSwitcher
            chordName={chord}
            total={total}
            idx={idx}
            setVoicingIdx={voicingState.setVoicingIdx}
          />
        </div>
      )}
    </span>
  );
}

export function ChordPanel({ chords, transpose, songSlug, voicingState, diagramWidth = 100, diagramHeight = 125 }: ChordPanelProps) {
  // Use external state if provided, otherwise create local
  const localState = useVoicings(songSlug);
  const { voicingIdx, setVoicingIdx } = voicingState || localState;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-6">
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
            <VoicingSwitcher
              chordName={transposed}
              total={total}
              idx={idx}
              setVoicingIdx={setVoicingIdx}
            />
          </div>
        );
      })}
    </div>
  );
}
