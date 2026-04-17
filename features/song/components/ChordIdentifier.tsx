"use client";

import { useState, useCallback } from "react";
import {
  identifyChord,
  noteAt,
  noteName,
  type ChordMatch,
} from "../data/chord-templates";
import { ChordDiagram, lookupChord } from "./ChordDiagram";
import { TeButton } from "@/shared/components/TeButton";

// ─── Constants ───────────────────────────────────────────────────────────────

const STRING_LABELS = ["E", "A", "D", "G", "B", "E"];
const NUM_FRETS_VISIBLE = 15;

// SVG layout
const PAD_LEFT = 44;    // space for string labels
const PAD_RIGHT = 12;
const PAD_TOP = 36;      // space for mute/open toggles
const PAD_BOTTOM = 28;   // space for fret numbers
const CELL_W = 40;
const CELL_H = 28;
const TOTAL_W = PAD_LEFT + NUM_FRETS_VISIBLE * CELL_W + PAD_RIGHT;
const TOTAL_H = PAD_TOP + 6 * CELL_H + PAD_BOTTOM;
const NUT_X = PAD_LEFT;

function fretX(fret: number): number {
  return PAD_LEFT + fret * CELL_W;
}

function stringY(str: number): number {
  // str 0 = low E (bottom), str 5 = high E (top) — visual inversion
  return PAD_TOP + (5 - str) * CELL_H;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChordIdentifier() {
  // -2 = unset, -1 = muted, 0 = open, 1+ = fret
  const [frets, setFrets] = useState<number[]>([-2, -2, -2, -2, -2, -2]);
  const [matches, setMatches] = useState<ChordMatch[]>([]);

  const updateFret = useCallback((strIdx: number, fret: number) => {
    setFrets((prev) => {
      const next = [...prev];
      if (next[strIdx] === fret) {
        // Toggle off
        next[strIdx] = -2;
      } else {
        next[strIdx] = fret;
      }

      // Identify chord
      const forLookup = next.map(f => f === -2 ? -1 : f);
      const sounding = forLookup.filter(f => f >= 0).length;
      if (sounding >= 2) {
        setMatches(identifyChord(forLookup));
      } else {
        setMatches([]);
      }
      return next;
    });
  }, []);

  const toggleOpen = useCallback((strIdx: number) => {
    setFrets((prev) => {
      const next = [...prev];
      if (next[strIdx] === 0) {
        next[strIdx] = -2; // remove open → unset
      } else if (next[strIdx] === -1) {
        next[strIdx] = 0; // muted → open
      } else if (next[strIdx] === -2) {
        next[strIdx] = 0; // unset → open
      } else {
        next[strIdx] = 0; // fretted → open
      }
      const forLookup = next.map(f => f === -2 ? -1 : f);
      const sounding = forLookup.filter(f => f >= 0).length;
      setMatches(sounding >= 2 ? identifyChord(forLookup) : []);
      return next;
    });
  }, []);

  const toggleMute = useCallback((strIdx: number) => {
    setFrets((prev) => {
      const next = [...prev];
      next[strIdx] = next[strIdx] === -1 ? -2 : -1;
      const forLookup = next.map(f => f === -2 ? -1 : f);
      const sounding = forLookup.filter(f => f >= 0).length;
      setMatches(sounding >= 2 ? identifyChord(forLookup) : []);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFrets([-2, -2, -2, -2, -2, -2]);
    setMatches([]);
  }, []);

  const activeFrets = frets.map(f => f === -2 ? -1 : f);
  const hasDots = frets.some(f => f >= 0);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Interactive Fretboard ── */}
      <div
        className="te-surface rounded-2xl overflow-x-auto"
        style={{ padding: "16px 8px" }}
      >
        <svg
          viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
          width={TOTAL_W}
          height={TOTAL_H}
          style={{ display: "block", minWidth: TOTAL_W }}
        >
          {/* Nut line */}
          <line
            x1={NUT_X}
            y1={PAD_TOP - 2}
            x2={NUT_X}
            y2={PAD_TOP + 5 * CELL_H + 2}
            stroke="currentColor"
            strokeWidth="3"
          />

          {/* Fret lines */}
          {Array.from({ length: NUM_FRETS_VISIBLE }).map((_, i) => (
            <line
              key={`fret-${i}`}
              x1={fretX(i + 1)}
              y1={PAD_TOP - 2}
              x2={fretX(i + 1)}
              y2={PAD_TOP + 5 * CELL_H + 2}
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.2"
            />
          ))}

          {/* String lines (horizontal) */}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`str-${i}`}
              x1={NUT_X}
              y1={stringY(i)}
              x2={fretX(NUM_FRETS_VISIBLE)}
              y2={stringY(i)}
              stroke="currentColor"
              strokeWidth={1.2 - i * 0.1}
              opacity="0.3"
            />
          ))}

          {/* Fret numbers */}
          {Array.from({ length: NUM_FRETS_VISIBLE }).map((_, i) => (
            <text
              key={`fn-${i}`}
              x={fretX(i) + CELL_W / 2}
              y={PAD_TOP + 5 * CELL_H + 18}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              opacity="0.3"
              fontFamily="inherit"
            >
              {i + 1}
            </text>
          ))}

          {/* Fret position dots (3, 5, 7, 9, 12, 15) */}
          {[3, 5, 7, 9, 15].map(f =>
            f <= NUM_FRETS_VISIBLE ? (
              <circle
                key={`pos-${f}`}
                cx={fretX(f - 1) + CELL_W / 2}
                cy={PAD_TOP + 2.5 * CELL_H}
                r={3}
                fill="currentColor"
                opacity="0.08"
              />
            ) : null
          )}
          {12 <= NUM_FRETS_VISIBLE && (
            <>
              <circle cx={fretX(11) + CELL_W / 2} cy={PAD_TOP + 1.5 * CELL_H} r={3} fill="currentColor" opacity="0.08" />
              <circle cx={fretX(11) + CELL_W / 2} cy={PAD_TOP + 3.5 * CELL_H} r={3} fill="currentColor" opacity="0.08" />
            </>
          )}

          {/* String labels + mute/open toggles */}
          {Array.from({ length: 6 }).map((_, strIdx) => {
            const y = stringY(strIdx);
            const state = frets[strIdx]; // -2=unset, -1=muted, 0=open, 1+=fret
            return (
              <g key={`label-${strIdx}`}>
                {/* String name */}
                <text
                  x={12}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="currentColor"
                  opacity="0.6"
                  fontFamily="inherit"
                >
                  {STRING_LABELS[strIdx]}
                </text>

                {/* Mute toggle (X) */}
                <g
                  onClick={() => toggleMute(strIdx)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={24}
                    y={y - 8}
                    width={16}
                    height={16}
                    fill="transparent"
                  />
                  <text
                    x={32}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill={state === -1 ? "var(--orange)" : "currentColor"}
                    opacity={state === -1 ? 1 : 0.2}
                    fontFamily="inherit"
                  >
                    ×
                  </text>
                </g>
              </g>
            );
          })}

          {/* Open string toggles (O) — above nut */}
          {Array.from({ length: 6 }).map((_, strIdx) => {
            const y = stringY(strIdx);
            const state = frets[strIdx];
            return (
              <g
                key={`open-${strIdx}`}
                onClick={() => toggleOpen(strIdx)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={NUT_X - 10}
                  cy={y}
                  r={7}
                  fill={state === 0 ? "var(--orange)" : "transparent"}
                  stroke={state === 0 ? "var(--orange)" : "currentColor"}
                  strokeWidth="1.2"
                  opacity={state === 0 ? 0.9 : 0.15}
                />
                {state === 0 && (
                  <text
                    x={NUT_X - 10}
                    y={y + 3.5}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="white"
                    fontFamily="inherit"
                  >
                    O
                  </text>
                )}
              </g>
            );
          })}

          {/* Clickable fret cells */}
          {Array.from({ length: 6 }).map((_, strIdx) =>
            Array.from({ length: NUM_FRETS_VISIBLE }).map((_, fretIdx) => {
              const fret = fretIdx + 1;
              const cx = fretX(fretIdx) + CELL_W / 2;
              const cy = stringY(strIdx);
              const isActive = frets[strIdx] === fret;

              return (
                <g
                  key={`cell-${strIdx}-${fretIdx}`}
                  onClick={() => updateFret(strIdx, fret)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Hit area */}
                  <rect
                    x={fretX(fretIdx)}
                    y={cy - CELL_H / 2}
                    width={CELL_W}
                    height={CELL_H}
                    fill="transparent"
                  />
                  {/* Hover hint */}
                  {!isActive && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={9}
                      fill="currentColor"
                      opacity="0.03"
                    />
                  )}
                  {/* Active dot */}
                  {isActive && (
                    <>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={11}
                        fill="var(--orange)"
                      />
                      <text
                        x={cx}
                        y={cy + 4}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="white"
                        fontFamily="inherit"
                      >
                        {noteName(noteAt(strIdx, fret))}
                      </text>
                    </>
                  )}
                </g>
              );
            })
          )}

          {/* Open string note labels */}
          {Array.from({ length: 6 }).map((_, strIdx) => {
            if (frets[strIdx] !== 0) return null;
            const cy = stringY(strIdx);
            return (
              <text
                key={`open-note-${strIdx}`}
                x={NUT_X - 10}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize="8"
                fontWeight="bold"
                fill="white"
                fontFamily="inherit"
                style={{ pointerEvents: "none" }}
              >
                {noteName(noteAt(strIdx, 0))}
              </text>
            );
          })}
        </svg>
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-3">
        <TeButton
          shape="pill"
          onClick={clearAll}
          className="rounded-lg px-4 py-2 text-sm"
          disabled={!hasDots && frets.every(f => f === -2)}
        >
          Очистити
        </TeButton>
        {hasDots && (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {matches.length > 0
              ? `Знайдено ${matches.length} ${matches.length === 1 ? "акорд" : matches.length < 5 ? "акорди" : "акордів"}`
              : "Акорд не розпізнано"}
          </span>
        )}
      </div>

      {/* ── Results ── */}
      {matches.length > 0 && (
        <div>
          <h2
            className="text-lg font-bold mb-4"
            style={{ color: "var(--text)" }}
          >
            Можливі акорди
          </h2>

          <div className="flex flex-wrap gap-4">
            {matches.slice(0, 12).map((match, i) => {
              const defs = lookupChord(match.root + match.quality);
              const def = defs?.[0];

              return (
                <div
                  key={`${match.name}-${i}`}
                  className="te-surface rounded-xl flex flex-col items-center"
                  style={{ padding: "12px 16px" }}
                >
                  <span
                    className="text-lg font-bold mb-1"
                    style={{ color: "var(--orange)" }}
                  >
                    {match.name}
                  </span>
                  {def && (
                    <ChordDiagram
                      name={match.root + match.quality}
                      def={def}
                      width={80}
                      height={100}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
