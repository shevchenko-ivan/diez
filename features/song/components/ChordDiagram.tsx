"use client";

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import {
  type ChordDef,
  CHORD_DB,
  NOTES,
  FLAT_TO_SHARP,
  SHARP_TO_FLAT,
  transposeChord,
  lookupChord,
  lookupNoBarreVoicing,
} from "../data/chord-templates";
import { lookupChordUke, UKE_OPEN_FREQS } from "../data/chord-templates-ukulele";
import { lookupChordPiano } from "../data/chord-templates-piano";
import { PianoDiagram } from "./PianoDiagram";
import { useInstrument, type Instrument } from "@/shared/hooks/useInstrument";

// Re-export for consumers (SongViewer.tsx imports from here)
export { transposeChord, lookupChord };
export type { ChordDef };

function lookupChordForInstrument(chord: string, instrument: Instrument): ChordDef[] | null | undefined {
  return instrument === "ukulele" ? lookupChordUke(chord) : lookupChord(chord);
}

// ─── SVG constants ────────────────────────────────────────────────────────────

const VB_W = 80;
const VB_H = 100;
const STRING_LEFT = 15;
const STRING_RIGHT = 65;
const FRET_TOP = 26;
const FRET_BOTTOM = 90;
const NUM_FRETS = 4;
const FRET_GAP = (FRET_BOTTOM - FRET_TOP) / NUM_FRETS; // 16

function stringGapFor(numStrings: number) {
  return (STRING_RIGHT - STRING_LEFT) / (numStrings - 1);
}

function stringXFor(i: number, numStrings: number) {
  return STRING_LEFT + i * stringGapFor(numStrings);
}

function fretY(rowIndex: number) {
  return FRET_TOP + (rowIndex + 0.5) * FRET_GAP;
}

// ─── Audio: play a chord strum ────────────────────────────────────────────────
// Standard tuning frequencies for open strings (E2, A2, D3, G3, B3, E4 in Hz).
const GUITAR_OPEN_FREQS = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  return sharedAudioCtx;
}

// Karplus–Strong plucked-string synthesis. Starts with a short noise burst,
// runs it through a delay line with a one-pole low-pass in the feedback —
// simulating the decay and harmonic behaviour of a real plucked string.
// Buffers are cached per frequency (rounded) to avoid re-synthesis.
const bufferCache = new Map<string, AudioBuffer>();

function buildPluckBuffer(ctx: AudioContext, freq: number, seconds = 2.2): AudioBuffer {
  const sr = ctx.sampleRate;
  const key = `${sr}:${Math.round(freq * 100)}`;
  const cached = bufferCache.get(key);
  if (cached) return cached;

  const N = Math.max(2, Math.floor(sr / freq)); // delay length in samples
  const total = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);

  // Initial noise burst (one period of white noise, slightly low-passed).
  const delay = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const n = Math.random() * 2 - 1;
    prev = prev * 0.5 + n * 0.5; // soften the attack a touch
    delay[i] = prev;
  }

  // Damping: closer to 0.5 = brighter/longer; 0.495–0.499 sounds natural for guitar.
  const damp = 0.498;
  let idx = 0;
  for (let i = 0; i < total; i++) {
    const cur = delay[idx];
    const next = delay[(idx + 1) % N];
    const avg = (cur + next) * damp; // low-pass average → harmonic decay
    out[i] = cur;
    delay[idx] = avg;
    idx = (idx + 1) % N;
  }

  // Normalise and apply gentle amplitude envelope (attack click softened,
  // long natural release).
  let peak = 0;
  for (let i = 0; i < total; i++) if (Math.abs(out[i]) > peak) peak = Math.abs(out[i]);
  const norm = peak > 0 ? 0.85 / peak : 1;
  const attackSamples = Math.min(total, Math.floor(sr * 0.004));
  for (let i = 0; i < total; i++) {
    let env = 1;
    if (i < attackSamples) env = i / attackSamples;
    out[i] *= norm * env;
  }

  bufferCache.set(key, buf);
  return buf;
}

function playChordStrum(strings: number[], openFreqs: number[]) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const strumGap = 0.03; // seconds between successive strings

  let voice = 0;
  strings.forEach((fret, i) => {
    if (fret < 0) return; // muted
    const freq = openFreqs[i] * Math.pow(2, fret / 12);
    const start = now + voice * strumGap;
    voice++;

    const src = ctx.createBufferSource();
    src.buffer = buildPluckBuffer(ctx, freq);

    // Slight low-pass softens harshness; stronger cutoff on bass strings
    // because they excite more upper partials when modelled.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = Math.max(2500, Math.min(6500, freq * 10));
    lp.Q.value = 0.4;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.42, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 2.1);

    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(start);
    src.stop(start + 2.2);
  });
}

// ─── ChordDiagram ─────────────────────────────────────────────────────────────

interface ChordDiagramProps {
  name: string;
  def: ChordDef;
  width?: number;
  height?: number;
  openFreqs?: number[];
}

// Compute finger assignments (1=index, 2=middle, 3=ring, 4=pinky).
// Barre notes all get finger 1; remaining fretted notes are sorted by
// (fret asc, string index asc) and assigned 2→3→4 in order.
function computeFingers(strings: number[], barre?: number): (number | null)[] {
  const fingers: (number | null)[] = strings.map((f) => (f > 0 ? 0 : null));
  let next = 1;

  // Explicit barre from the chord template → finger 1 for the whole span.
  let barreFret: number | undefined = barre;

  // Auto-detect: if no barre but lowest fret has ≥2 strings and nothing open
  // sits below it, treat that row as a natural barre played with finger 1.
  if (barreFret === undefined) {
    const fretted = strings.filter((f) => f > 0);
    const minFret = fretted.length > 0 ? Math.min(...fretted) : 0;
    const sameCount = fretted.filter((f) => f === minFret).length;
    const firstFrettedIdx = strings.findIndex((f) => f > 0);
    const noOpenBelow = strings.slice(0, firstFrettedIdx).every((f) => f === -1);
    if (sameCount >= 2 && noOpenBelow && fretted.length >= 5) {
      barreFret = minFret;
    }
  }

  if (barreFret !== undefined) {
    const positions = strings
      .map((f, i) => (f === barreFret ? i : -1))
      .filter((i) => i >= 0);
    if (positions.length >= 2) {
      for (const i of positions) fingers[i] = 1;
      next = 2;
    }
  }

  // Remaining strings get individual finger numbers, sorted by fret asc
  // then by string index. Each string gets its own finger (up to 4).
  const remaining = strings
    .map((fret, idx) => ({ idx, fret }))
    .filter(({ idx, fret }) => fret > 0 && fingers[idx] === 0)
    .sort((a, b) => a.fret - b.fret || a.idx - b.idx);

  for (const { idx } of remaining) {
    fingers[idx] = Math.min(next++, 4);
  }

  return fingers;
}

export function ChordDiagram({ name, def, width = 100, height = 125, openFreqs = GUITAR_OPEN_FREQS }: ChordDiagramProps) {
  const { strings, baseFret, barre } = def;
  const numStrings = strings.length;
  const stringX = (i: number) => stringXFor(i, numStrings);

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
      className="chord-diagram-svg"
      style={{ display: "block", overflow: "visible", cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        playChordStrum(strings, openFreqs);
      }}
    >
      <title>{`Програти ${name}`}</title>
      {/* Chord name (stays centered) */}
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
      {/* Play icon — revealed on hover, doesn't shift the name */}
      <text
        className="chord-diagram-play"
        x={(STRING_LEFT + STRING_RIGHT) / 2 + name.length * 3.2 + 2}
        y="10"
        textAnchor="start"
        fontSize="7"
        fontWeight="normal"
        fontFamily="inherit"
        style={{
          fill: "var(--orange)",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 120ms ease",
        }}
      >
        ▶
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

      {/* String lines (vertical, one per string) */}
      {Array.from({ length: numStrings }).map((_, i) => (
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
            <circle cx={cx} cy={cy} r={4.5} style={{ fill: "var(--orange)" }} />
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
  noBarreMode?: boolean;
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
  // Always start empty to match SSR output; hydrate from localStorage after mount.
  const [voicingIdx, setVoicingIdxRaw] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!songSlug) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(songSlug)) || "{}");
      if (saved && typeof saved === "object") setVoicingIdxRaw(saved);
    } catch {}
  }, [songSlug]);

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: -4, width: "100%" }}>
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
  const [instrument] = useInstrument();
  const openFreqs = instrument === "ukulele" ? UKE_OPEN_FREQS : GUITAR_OPEN_FREQS;

  const pianoDefs = instrument === "piano" ? lookupChordPiano(chord) : null;
  const defs = instrument === "piano" ? null : lookupChordForInstrument(chord, instrument);
  if (!defs && !pianoDefs) return <>{children}</>;

  const total = (pianoDefs ?? defs)!.length;
  const idx = (voicingState.voicingIdx[chord] ?? 0) % total;
  const def = defs ? defs[idx] : null;
  const pianoDef = pianoDefs ? pianoDefs[idx] : null;

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

  // Clamp popup horizontally into the viewport after it renders.
  useLayoutEffect(() => {
    if (!open || !pos || !popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const half = rect.width / 2;
    let next = pos.left;
    if (next - half < margin) next = half + margin;
    if (next + half > vw - margin) next = vw - margin - half;
    if (Math.abs(next - pos.left) > 0.5) setPos((p) => (p ? { ...p, left: next } : p));
  }, [open, pos]);

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
            color: "var(--text)",
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
          {pianoDef ? (
            <PianoDiagram name={chord} def={pianoDef} width={140} height={70} />
          ) : (
            <ChordDiagram name={chord} def={def!} width={90} height={112} openFreqs={openFreqs} />
          )}
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

export function ChordPanel({ chords, transpose, songSlug, voicingState, diagramWidth = 100, diagramHeight = 125, noBarreMode = false }: ChordPanelProps) {
  // Use external state if provided, otherwise create local
  const localState = useVoicings(songSlug);
  const { voicingIdx, setVoicingIdx } = voicingState || localState;
  const [instrument] = useInstrument();
  const openFreqs = instrument === "ukulele" ? UKE_OPEN_FREQS : GUITAR_OPEN_FREQS;

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-6 ${instrument === "piano" ? "justify-center" : ""}`}>
      {chords.map((chord) => {
        const transposed = transposeChord(chord, transpose);

        // Piano uses its own lookup/diagram path — no voicings, no barre.
        if (instrument === "piano") {
          const pianoDefs = lookupChordPiano(transposed);
          if (!pianoDefs) {
            return (
              <div
                key={chord}
                style={{ width: diagramWidth, height: diagramHeight, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}
              >
                <span style={{ fontSize: 10, fontWeight: "bold", color: "var(--text)", marginBottom: 4 }}>{transposed}</span>
                <div style={{ width: diagramWidth - 8, height: (diagramHeight - 20) * 0.55, border: "1px dashed currentColor", borderRadius: 6, opacity: 0.2 }} />
              </div>
            );
          }
          const pw = Math.max(diagramWidth, 130);
          const ph = Math.round(pw * (82 / 140));
          return (
            <div key={chord} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <PianoDiagram name={transposed} def={pianoDefs[0]} width={pw} height={ph} />
            </div>
          );
        }

        // In no-barre mode prefer the dedicated alternative voicing if available (guitar only).
        const noBarreAlt = noBarreMode && instrument === "guitar" ? lookupNoBarreVoicing(transposed) : null;
        const base = lookupChordForInstrument(transposed, instrument);
        const defs = noBarreAlt ? [noBarreAlt, ...(base ?? [])] : base;

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
              openFreqs={openFreqs}
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
