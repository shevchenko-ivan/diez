"use client";

import { useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChordDef = {
  strings: number[]; // 6 values [low E, A, D, G, B, high E], -1=muted, 0=open, 1+=fret number
  baseFret: number;  // first fret shown (1 = nut position)
  barre?: number;    // fret where full barre is applied
};

// ─── Chord Database ───────────────────────────────────────────────────────────

export const CHORD_DB: Record<string, ChordDef[]> = {
  // ── A ──────────────────────────────────────────────────────────────────────
  A: [
    { strings: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 2, 2, 5], baseFret: 1 },
    { strings: [-1, -1, 2, 2, 2, 0], baseFret: 1 },
    { strings: [5, -1, 2, 2, 2, 5], baseFret: 2, barre: 2 },
    { strings: [5, 4, 2, 2, 2, -1], baseFret: 1 },
    { strings: [5, 7, 7, 6, 5, 5], baseFret: 5, barre: 5 },
    { strings: [5, -1, 7, 6, 5, -1], baseFret: 5, barre: 5 },
    { strings: [-1, 12, 14, 14, 14, 12], baseFret: 12, barre: 12 },
  ],
  Am: [
    { strings: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
    { strings: [-1, 3, 2, 2, 1, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 2, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 2, 1, 0], baseFret: 1 },
    { strings: [-1, 0, 7, 5, 5, 5], baseFret: 5 },
    { strings: [5, 7, 7, 5, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 7, 5, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 12, 14, 14, 13, 12], baseFret: 12, barre: 12 },
  ],
  A7: [
    { strings: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 2, 2, 3], baseFret: 1 },
    { strings: [-1, 0, 2, 0, 2, 3], baseFret: 1 },
    { strings: [5, -1, 2, 2, 2, 3], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 2, 2, 2, 3], baseFret: 1 },
    { strings: [-1, 4, 5, 2, 5, -1], baseFret: 2 },
    { strings: [5, 7, 5, 6, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 12, 14, 12, 14, 12], baseFret: 12, barre: 12 },
  ],
  Am7: [
    { strings: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 0, 1, 3], baseFret: 1 },
    { strings: [-1, 0, 2, 2, 1, 3], baseFret: 1 },
    { strings: [-1, 0, 5, 5, 5, 3], baseFret: 3 },
    { strings: [-1, -1, 2, 2, 1, 3], baseFret: 1 },
    { strings: [-1, 3, 5, 2, 5, -1], baseFret: 2 },
    { strings: [5, 7, 5, 5, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 12, 14, 12, 13, 12], baseFret: 12, barre: 12 },
  ],
  Amaj7: [
    { strings: [-1, 0, 2, 1, 2, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 1, 2, 4], baseFret: 1 },
    { strings: [-1, 0, 2, 2, 2, 4], baseFret: 1 },
    { strings: [-1, 0, 7, 6, 5, 4], baseFret: 4 },
    { strings: [5, -1, 6, 6, 5, 0], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 2, 2, 2, 4], baseFret: 1 },
    { strings: [5, 7, 6, 6, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 12, 14, 13, 14, 12], baseFret: 12, barre: 12 },
  ],
  Asus2: [
    { strings: [-1, 0, -1, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 2, 0, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 4, 0, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 2, 0, -1], baseFret: 1 },
    { strings: [5, -1, 2, 4, 5, 5], baseFret: 2 },
    { strings: [5, -1, 2, 4, 5, -1], baseFret: 2 },
    { strings: [-1, -1, 7, 9, 10, 7], baseFret: 7, barre: 7 },
    { strings: [-1, 12, 14, 14, 12, 12], baseFret: 12, barre: 12 },
  ],
  Asus4: [
    { strings: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
    { strings: [-1, 0, 0, 2, 3, 0], baseFret: 1 },
    { strings: [-1, 0, 7, 7, 5, 0], baseFret: 5 },
    { strings: [5, -1, 2, 2, 3, 5], baseFret: 2, barre: 2 },
    { strings: [5, -1, 2, 2, 3, -1], baseFret: 2, barre: 2 },
    { strings: [5, 7, 7, 7, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 7, 7, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 7, 9, 10, 10], baseFret: 7 },
  ],
  Aadd9: [
    { strings: [-1, 0, -1, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 4, 2, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 4, 2, 5], baseFret: 2, barre: 2 },
    { strings: [5, 7, 7, 6, 0, 0], baseFret: 5 },
    { strings: [5, 7, 9, 6, 0, 0], baseFret: 5 },
    { strings: [5, -1, 7, 6, 0, 0], baseFret: 5 },
    { strings: [5, -1, 2, 4, 2, 5], baseFret: 2, barre: 2 },
    { strings: [5, 7, 9, 6, 5, 5], baseFret: 5, barre: 5 },
  ],
  Adim: [
    { strings: [-1, 0, 1, 2, 1, -1], baseFret: 1 },
    { strings: [5, 6, 7, 5, -1, -1], baseFret: 5 },
  ],
  Adim7: [
    { strings: [-1, 0, 1, 2, 1, 2], baseFret: 1 },
    { strings: [-1, 0, 4, 5, 4, 5], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 1, 2, 1, 2], baseFret: 1 },
    { strings: [-1, 3, 4, 2, 4, -1], baseFret: 1 },
    { strings: [5, -1, 4, 5, 4, -1], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 4, 5, 4, 5], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 7, 8, 7, 8], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 10, 11, 10, 11], baseFret: 10, barre: 10 },
  ],
  Aaug: [
    { strings: [-1, 0, 3, 2, 2, 1], baseFret: 1 },
    { strings: [-1, 0, -1, 2, 2, 1], baseFret: 1 },
    { strings: [-1, 0, 3, 2, 2, 5], baseFret: 1 },
    { strings: [-1, 0, 3, 2, 2, -1], baseFret: 1 },
    { strings: [-1, 0, 7, 6, 6, 5], baseFret: 5 },
    { strings: [5, 4, 3, 2, 2, -1], baseFret: 2, barre: 2 },
    { strings: [5, -1, 7, 6, 6, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 12, 11, 10, 10, 13], baseFret: 10, barre: 10 },
  ],
  A6: [
    { strings: [-1, 0, 2, 2, 2, 2], baseFret: 1 },
    { strings: [-1, 0, 4, 2, 2, 2], baseFret: 1 },
    { strings: [-1, 0, 4, 2, 2, 0], baseFret: 1 },
    { strings: [-1, 0, 4, 2, 2, -1], baseFret: 1 },
    { strings: [-1, 0, -1, 2, 2, 2], baseFret: 1 },
    { strings: [5, -1, 4, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [5, 7, 7, 6, 7, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 9, 11, 9, 10, -1], baseFret: 9, barre: 9 },
  ],
  Am6: [
    { strings: [-1, 0, 2, 2, 1, 2], baseFret: 1 },
    { strings: [-1, 0, 4, 2, 1, 0], baseFret: 1 },
    { strings: [-1, 0, -1, 2, 1, 2], baseFret: 1 },
    { strings: [-1, 0, 4, 5, 5, 5], baseFret: 4 },
    { strings: [-1, 0, 7, 5, 7, 0], baseFret: 5 },
    { strings: [-1, 3, 4, 2, 5, -1], baseFret: 2 },
    { strings: [5, 7, 7, 5, 7, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 12, 10, 11, 10, 12], baseFret: 10, barre: 10 },
  ],
  Am7b5: [
    { strings: [-1, 0, 1, 0, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 1, 2, 1, 3], baseFret: 1 },
    { strings: [-1, 3, 5, 2, 4, -1], baseFret: 2 },
    { strings: [-1, -1, 7, 5, 4, 3], baseFret: 3 },
    { strings: [5, -1, 5, 5, 4, -1], baseFret: 4 },
    { strings: [-1, 6, 7, 5, 8, -1], baseFret: 5 },
    { strings: [-1, 12, 10, 8, 8, 8], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 10, 12, 10, 11], baseFret: 10, barre: 10 },
  ],
  A9: [
    { strings: [-1, 0, 2, 4, 2, 3], baseFret: 1 },
    { strings: [5, 7, 5, 6, 5, 7], baseFret: 5, barre: 5 },
  ],

  // ── A# / Bb ────────────────────────────────────────────────────────────────
  "A#": [
    { strings: [-1, 1, 3, 3, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 3, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 1, 3, -1, 3, -1], baseFret: 1 },
    { strings: [6, 8, 8, 7, 6, 6], baseFret: 6, barre: 6 },
    { strings: [6, -1, 8, 7, 6, -1], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 7, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 10, 11, 10], baseFret: 8 },
  ],
  "A#m": [
    { strings: [-1, 1, 3, 3, 2, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 3, 2, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 1, 3, 3, 2, -1], baseFret: 1 },
    { strings: [6, 8, 8, 6, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 6, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 10, 11, 9], baseFret: 8 },
    { strings: [-1, -1, 11, 10, 11, 9], baseFret: 9 },
  ],
  "A#7": [
    { strings: [-1, 1, 3, 1, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 3, 3, 4], baseFret: 1 },
    { strings: [6, -1, 3, 3, 3, 4], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 6, 3, 6, -1], baseFret: 3 },
    { strings: [6, -1, -1, 7, 6, 4], baseFret: 4 },
    { strings: [-1, -1, 8, 7, 6, 4], baseFret: 4 },
    { strings: [6, 8, 6, 7, 6, 6], baseFret: 6, barre: 6 },
    { strings: [6, 8, 6, 7, 9, 6], baseFret: 6, barre: 6 },
  ],
  "A#m7": [
    { strings: [-1, 1, 3, 1, 2, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 1, 3, 1, 2, 4], baseFret: 1 },
    { strings: [-1, -1, 3, 3, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 3, 6, -1], baseFret: 3 },
    { strings: [6, -1, -1, 6, 6, 4], baseFret: 4 },
    { strings: [-1, -1, 8, 6, 6, 4], baseFret: 4 },
    { strings: [6, 8, 6, 6, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 13, 11, 10, 9, 9], baseFret: 9, barre: 9 },
  ],
  "A#maj7": [
    { strings: [-1, 1, 0, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 1, 3, 2, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 5, 7, 3, 6, -1], baseFret: 3 },
    { strings: [-1, 5, -1, 3, 6, 5], baseFret: 3 },
    { strings: [-1, -1, 3, 3, 3, 5], baseFret: 3, barre: 3 },
    { strings: [6, -1, 7, 7, 6, 5], baseFret: 5 },
    { strings: [6, -1, 8, 7, 6, 5], baseFret: 5 },
    { strings: [6, 8, 7, 7, 6, 6], baseFret: 6, barre: 6 },
  ],
  "A#sus2": [
    { strings: [-1, 1, -1, 0, 1, 1], baseFret: 1 },
    { strings: [-1, 1, 3, 3, 1, 1], baseFret: 1 },
    { strings: [-1, 1, 3, 3, 1, -1], baseFret: 1 },
    { strings: [6, -1, 3, 5, 6, 6], baseFret: 3 },
    { strings: [6, -1, 3, 5, 6, -1], baseFret: 3 },
    { strings: [6, 8, 8, 5, 6, 6], baseFret: 5 },
    { strings: [6, -1, -1, 5, 6, 6], baseFret: 5 },
    { strings: [-1, -1, 8, 10, 11, 8], baseFret: 8, barre: 8 },
  ],
  "A#sus4": [
    { strings: [-1, 1, 3, 3, 4, 1], baseFret: 1 },
    { strings: [6, -1, 3, 3, 4, 6], baseFret: 3, barre: 3 },
    { strings: [6, -1, 3, 3, 4, -1], baseFret: 3, barre: 3 },
    { strings: [6, 8, 8, 8, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 8, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 10, 11, 11], baseFret: 8 },
  ],
  "A#add9": [
    { strings: [-1, 1, 0, 0, 1, 0], baseFret: 1 },
    { strings: [-1, 1, 0, 0, 1, -1], baseFret: 1 },
    { strings: [-1, 1, -1, 0, 1, 0], baseFret: 1 },
    { strings: [-1, 1, 3, 5, 3, 1], baseFret: 1, barre: 1 },
    { strings: [6, -1, 3, 5, 3, 6], baseFret: 3, barre: 3 },
    { strings: [6, -1, 3, 5, 3, -1], baseFret: 3, barre: 3 },
    { strings: [6, 8, 10, 7, 6, 6], baseFret: 6, barre: 6 },
  ],
  "A#dim": [
    { strings: [-1, 1, 2, 3, 2, -1], baseFret: 1 },
    { strings: [6, 7, 8, 6, -1, -1], baseFret: 6 },
  ],
  "A#dim7": [
    { strings: [-1, 1, 2, 0, 2, -1], baseFret: 1 },
    { strings: [-1, 1, -1, 0, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 3, 2, 3], baseFret: 1 },
    { strings: [-1, 4, 5, 3, 5, -1], baseFret: 3 },
    { strings: [6, -1, 5, 6, 5, -1], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 5, 6, 5, 6], baseFret: 5, barre: 5 },
    { strings: [-1, 7, 8, 6, 8, -1], baseFret: 6 },
    { strings: [-1, -1, 11, 12, 11, 12], baseFret: 11, barre: 11 },
  ],
  "A#aug": [
    { strings: [-1, 1, 4, 3, 3, -1], baseFret: 1 },
    { strings: [-1, 1, -1, 3, 3, 2], baseFret: 1 },
    { strings: [6, 5, 4, 3, 3, -1], baseFret: 3, barre: 3 },
    { strings: [6, -1, 4, 3, 3, -1], baseFret: 3, barre: 3 },
    { strings: [6, -1, 8, 7, 7, 6], baseFret: 6, barre: 6 },
    { strings: [6, 9, 8, 7, -1, -1], baseFret: 6 },
    { strings: [6, -1, 8, 7, 7, -1], baseFret: 6 },
    { strings: [-1, 13, 12, 11, 11, 14], baseFret: 11, barre: 11 },
  ],
  "A#6": [
    { strings: [-1, 1, 3, 0, 3, -1], baseFret: 1 },
    { strings: [-1, 1, -1, 0, 3, 1], baseFret: 1 },
    { strings: [-1, 1, 3, 3, 3, 3], baseFret: 1 },
    { strings: [-1, 1, 5, 3, 3, 1], baseFret: 1 },
    { strings: [-1, 1, 5, 3, 3, -1], baseFret: 1 },
    { strings: [6, -1, 5, 3, 3, 3], baseFret: 3, barre: 3 },
    { strings: [6, -1, 8, 7, 8, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 10, 12, 10, 11, -1], baseFret: 10, barre: 10 },
  ],
  "A#m6": [
    { strings: [-1, 1, 3, 0, 2, -1], baseFret: 1 },
    { strings: [-1, 1, -1, 0, 2, 1], baseFret: 1 },
    { strings: [-1, 1, -1, 3, 2, 3], baseFret: 1 },
    { strings: [-1, 4, 5, 3, 6, -1], baseFret: 3 },
    { strings: [6, -1, 5, 6, 6, 6], baseFret: 5 },
    { strings: [6, -1, 5, 6, 6, -1], baseFret: 5 },
    { strings: [-1, -1, 8, 10, 8, 9], baseFret: 8, barre: 8 },
    { strings: [-1, 13, 11, 12, 11, 13], baseFret: 11, barre: 11 },
  ],
  "A#m7b5": [
    { strings: [-1, 1, -1, 1, 2, 0], baseFret: 1 },
    { strings: [-1, 1, 2, 1, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 3, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 3, 5, -1], baseFret: 3 },
    { strings: [-1, -1, 8, 6, 5, 4], baseFret: 4 },
    { strings: [6, -1, 6, 6, 5, -1], baseFret: 5 },
    { strings: [-1, 7, 8, 6, 9, -1], baseFret: 6 },
    { strings: [-1, 13, 11, 9, 9, 9], baseFret: 9, barre: 9 },
  ],
  "Bb": [
    { strings: [-1, 1, 3, 3, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 3, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 1, 3, -1, 3, -1], baseFret: 1 },
    { strings: [6, 8, 8, 7, 6, 6], baseFret: 6, barre: 6 },
    { strings: [6, -1, 8, 7, 6, -1], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 7, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 10, 11, 10], baseFret: 8 },
  ],
  "Bbm": [
    { strings: [-1, 1, 3, 3, 2, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 3, 2, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 1, 3, 3, 2, -1], baseFret: 1 },
    { strings: [6, 8, 8, 6, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 6, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 10, 11, 9], baseFret: 8 },
    { strings: [-1, -1, 11, 10, 11, 9], baseFret: 9 },
  ],
  "Bb7": [
    { strings: [-1, 1, 3, 1, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 3, 3, 4], baseFret: 1 },
    { strings: [6, -1, 3, 3, 3, 4], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 6, 3, 6, -1], baseFret: 3 },
    { strings: [6, -1, -1, 7, 6, 4], baseFret: 4 },
    { strings: [-1, -1, 8, 7, 6, 4], baseFret: 4 },
    { strings: [6, 8, 6, 7, 6, 6], baseFret: 6, barre: 6 },
    { strings: [6, 8, 6, 7, 9, 6], baseFret: 6, barre: 6 },
  ],
  "Bbm7": [
    { strings: [-1, 1, 3, 1, 2, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 1, 3, 1, 2, 4], baseFret: 1 },
    { strings: [-1, -1, 3, 3, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 3, 6, -1], baseFret: 3 },
    { strings: [6, -1, -1, 6, 6, 4], baseFret: 4 },
    { strings: [-1, -1, 8, 6, 6, 4], baseFret: 4 },
    { strings: [6, 8, 6, 6, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 13, 11, 10, 9, 9], baseFret: 9, barre: 9 },
  ],
  "Bbmaj7": [
    { strings: [-1, 1, 0, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 1, 3, 2, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 5, 7, 3, 6, -1], baseFret: 3 },
    { strings: [-1, 5, -1, 3, 6, 5], baseFret: 3 },
    { strings: [-1, -1, 3, 3, 3, 5], baseFret: 3, barre: 3 },
    { strings: [6, -1, 7, 7, 6, 5], baseFret: 5 },
    { strings: [6, -1, 8, 7, 6, 5], baseFret: 5 },
    { strings: [6, 8, 7, 7, 6, 6], baseFret: 6, barre: 6 },
  ],

  // ── B / H ──────────────────────────────────────────────────────────────────
  B: [
    { strings: [-1, 2, 1, 0, 0, 0], baseFret: 1 },
    { strings: [-1, -1, 1, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 2, -1, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 4, 4, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 2, 4, -1, 4, -1], baseFret: 2 },
    { strings: [7, 9, 9, 8, 7, 7], baseFret: 7, barre: 7 },
  ],
  Bm: [
    { strings: [-1, 2, 0, 4, 3, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 4, 3, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 2, 4, 4, 3, -1], baseFret: 1 },
    { strings: [7, 9, 9, 7, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 9, 7, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 9, 11, 12, 10], baseFret: 9 },
    { strings: [-1, -1, 12, 11, 12, 10], baseFret: 10 },
  ],
  B7: [
    { strings: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
    { strings: [-1, -1, 1, 2, 0, 0], baseFret: 1 },
    { strings: [-1, -1, 1, 2, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 1, 2, 4, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 2, 4, 2], baseFret: 2, barre: 2 },
    { strings: [7, -1, 4, 4, 4, 5], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 7, 4, 7, -1], baseFret: 4 },
    { strings: [7, 9, 7, 8, 7, 7], baseFret: 7, barre: 7 },
  ],
  Bm7: [
    { strings: [-1, 2, 0, 2, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 0, 2, 3, 2], baseFret: 1 },
    { strings: [-1, 2, 0, 2, 0, -1], baseFret: 1 },
    { strings: [-1, -1, 0, 2, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 2, 3, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 2, 4, 2, 3, 5], baseFret: 2, barre: 2 },
    { strings: [7, 9, 7, 7, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, 14, 12, 11, 10, 10], baseFret: 10, barre: 10 },
  ],
  Bmaj7: [
    { strings: [-1, 2, 1, 0, 0, 0], baseFret: 1 },
    { strings: [-1, -1, 1, 3, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 3, 4, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 2, 4, 3, 4, -1], baseFret: 2 },
    { strings: [-1, 6, 8, 4, 7, -1], baseFret: 4 },
    { strings: [-1, 6, -1, 4, 7, 6], baseFret: 4 },
    { strings: [-1, -1, 4, 4, 4, 6], baseFret: 4, barre: 4 },
    { strings: [7, 9, 8, 8, 7, 7], baseFret: 7, barre: 7 },
  ],
  Bsus2: [
    { strings: [-1, 2, -1, 0, 2, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 4, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 2, 4, 4, 2, -1], baseFret: 1 },
    { strings: [7, -1, 4, 6, 7, 7], baseFret: 4 },
    { strings: [7, -1, 4, 6, 7, -1], baseFret: 4 },
    { strings: [7, 9, 9, 6, 7, 7], baseFret: 6 },
    { strings: [7, -1, -1, 6, 7, 7], baseFret: 6 },
    { strings: [-1, -1, 9, 11, 12, 9], baseFret: 9, barre: 9 },
  ],
  Bsus4: [
    { strings: [-1, 2, 4, 4, 0, 0], baseFret: 1 },
    { strings: [-1, 2, 2, 0, 0, -1], baseFret: 1 },
    { strings: [-1, 2, 4, 4, 5, 2], baseFret: 2, barre: 2 },
    { strings: [7, -1, 4, 4, 5, 7], baseFret: 4, barre: 4 },
    { strings: [7, -1, 4, 4, 5, -1], baseFret: 4, barre: 4 },
    { strings: [7, 9, 9, 9, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 9, 9, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 9, 11, 12, 12], baseFret: 9 },
  ],
  Badd9: [
    { strings: [-1, 2, 1, 0, 2, 0], baseFret: 1 },
    { strings: [-1, 2, 1, 0, 2, -1], baseFret: 1 },
    { strings: [-1, 2, -1, 0, 2, 0], baseFret: 1 },
    { strings: [-1, 2, 4, 6, 4, 2], baseFret: 2, barre: 2 },
    { strings: [7, -1, 4, 6, 4, 7], baseFret: 4, barre: 4 },
    { strings: [7, -1, 4, 6, 4, -1], baseFret: 4, barre: 4 },
    { strings: [7, 9, 11, 8, 7, 7], baseFret: 7, barre: 7 },
  ],
  Bdim: [
    { strings: [-1, 2, 3, 4, 3, -1], baseFret: 1 },
    { strings: [7, 8, 9, 7, -1, -1], baseFret: 7 },
  ],
  Bdim7: [
    { strings: [-1, -1, 0, 1, 0, 1], baseFret: 1 },
    { strings: [-1, 2, 3, 1, 3, -1], baseFret: 1 },
    { strings: [-1, 2, -1, 1, 3, 1], baseFret: 1 },
    { strings: [-1, -1, 3, 4, 3, 4], baseFret: 1 },
    { strings: [-1, 5, 6, 4, 6, -1], baseFret: 4 },
    { strings: [7, -1, 6, 7, 6, -1], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 6, 7, 6, 7], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 9, 10, 9, 10], baseFret: 9, barre: 9 },
  ],
  Baug: [
    { strings: [-1, 2, 1, 0, 0, 3], baseFret: 1 },
    { strings: [-1, 2, 1, 0, 0, -1], baseFret: 1 },
    { strings: [-1, -1, 1, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 2, -1, 4, 4, 3], baseFret: 1 },
    { strings: [-1, 2, 5, 4, 4, -1], baseFret: 2 },
    { strings: [7, 6, 5, 4, 4, -1], baseFret: 4, barre: 4 },
    { strings: [7, -1, 9, 8, 8, 7], baseFret: 7, barre: 7 },
    { strings: [-1, 14, 13, 12, 12, -1], baseFret: 12, barre: 12 },
  ],
  B6: [
    { strings: [-1, 2, 1, 1, 0, -1], baseFret: 1 },
    { strings: [-1, 2, 4, 1, 4, -1], baseFret: 1 },
    { strings: [-1, 2, -1, 1, 4, 2], baseFret: 1 },
    { strings: [-1, 2, 6, 4, 4, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 2, -1, 4, 4, 4], baseFret: 1 },
    { strings: [-1, 2, 4, 4, 4, 4], baseFret: 2 },
    { strings: [7, -1, 9, 8, 9, 7], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 9, 11, 9, 11], baseFret: 9, barre: 9 },
  ],
  Bm6: [
    { strings: [-1, 2, 0, 1, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 0, 1, 0, -1], baseFret: 1 },
    { strings: [-1, -1, 0, 1, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 1, 3, -1], baseFret: 1 },
    { strings: [-1, 2, -1, 1, 3, 2], baseFret: 1 },
    { strings: [-1, 2, -1, 4, 3, 4], baseFret: 1 },
    { strings: [-1, 5, 6, 4, 7, -1], baseFret: 4 },
    { strings: [-1, 14, 12, 13, 12, 14], baseFret: 12, barre: 12 },
  ],
  Bm7b5: [
    { strings: [-1, -1, 0, 2, 0, 1], baseFret: 1 },
    { strings: [-1, 2, -1, 2, 3, 1], baseFret: 1 },
    { strings: [-1, 2, 3, 2, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 4, 3, 5], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 7, 4, 6, -1], baseFret: 4 },
    { strings: [-1, -1, 9, 7, 6, 5], baseFret: 5 },
    { strings: [7, -1, 7, 7, 6, -1], baseFret: 6 },
    { strings: [-1, 14, 12, 10, 10, 10], baseFret: 10, barre: 10 },
  ],
  H: [
    { strings: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: 2 },
    { strings: [7, 9, 9, 8, 7, 7], baseFret: 7, barre: 7 },
  ],
  Hm: [
    { strings: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: 2 },
    { strings: [7, 9, 9, 7, 7, 7], baseFret: 7, barre: 7 },
  ],
  H7: [
    { strings: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 2, 4, 2], baseFret: 2, barre: 2 },
    { strings: [7, 9, 7, 8, 7, 7], baseFret: 7, barre: 7 },
  ],
  Hm7: [
    { strings: [-1, 2, 0, 2, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 2, 3, 2], baseFret: 2, barre: 2 },
  ],

  // ── C ──────────────────────────────────────────────────────────────────────
  C: [
    { strings: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
    { strings: [-1, 3, 2, 0, 1, 3], baseFret: 1 },
    { strings: [-1, 3, -1, 0, 1, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 0, 1, 0], baseFret: 1 },
    { strings: [-1, 3, 5, 5, 5, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 5, 5, 3], baseFret: 3 },
    { strings: [8, -1, 5, 5, 5, 8], baseFret: 5, barre: 5 },
    { strings: [8, 10, 10, 9, 8, 8], baseFret: 8, barre: 8 },
  ],
  Cm: [
    { strings: [-1, 3, 1, 0, 1, -1], baseFret: 1 },
    { strings: [-1, 3, 5, 5, 4, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 5, 4, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 3, 5, 5, 4, -1], baseFret: 3 },
    { strings: [8, 10, 10, 8, 8, 8], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 10, 8, 8, 8], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 10, 12, 13, 11], baseFret: 10 },
    { strings: [-1, -1, 13, 12, 13, 11], baseFret: 11 },
  ],
  C7: [
    { strings: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
    { strings: [-1, 1, 2, 0, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 3, 1, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 3, 1, 3], baseFret: 1 },
    { strings: [-1, 3, 5, 3, 5, 3], baseFret: 3, barre: 3 },
    { strings: [8, -1, 5, 5, 5, 6], baseFret: 5, barre: 5 },
    { strings: [-1, 7, 8, 5, 8, -1], baseFret: 5 },
    { strings: [8, 10, 8, 9, 8, 8], baseFret: 8, barre: 8 },
  ],
  Cm7: [
    { strings: [-1, 3, 5, 0, 4, 6], baseFret: 3 },
    { strings: [-1, -1, 1, 3, 1, 3], baseFret: 1 },
    { strings: [-1, 3, 1, 3, 1, -1], baseFret: 1 },
    { strings: [-1, 3, 5, 3, 4, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 3, 5, 3, 4, 6], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 5, 4, 6], baseFret: 4 },
    { strings: [-1, 6, 8, 5, 8, -1], baseFret: 5 },
    { strings: [8, 10, 8, 8, 8, 8], baseFret: 8, barre: 8 },
  ],
  Cmaj7: [
    { strings: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 3, 5, 5, 0, 0], baseFret: 3 },
    { strings: [-1, 3, 5, 4, 5, 0], baseFret: 3 },
    { strings: [-1, 3, 5, 4, 0, 0], baseFret: 3 },
    { strings: [-1, -1, 2, 4, 1, 3], baseFret: 1 },
    { strings: [-1, 3, 5, 4, 5, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 7, 9, 5, 8, -1], baseFret: 5 },
    { strings: [8, 10, 9, 9, 8, 8], baseFret: 8, barre: 8 },
  ],
  Csus2: [
    { strings: [-1, 3, 3, 0, 1, 3], baseFret: 1 },
    { strings: [-1, 3, -1, 0, 3, 3], baseFret: 1 },
    { strings: [-1, 3, 5, 5, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 3, 5, 5, 3, -1], baseFret: 3, barre: 3 },
    { strings: [8, -1, 5, 7, 8, 8], baseFret: 5 },
    { strings: [8, -1, 5, 7, 8, -1], baseFret: 5 },
    { strings: [8, 10, 10, 7, 8, 8], baseFret: 7 },
    { strings: [-1, -1, 10, 12, 13, 10], baseFret: 10, barre: 10 },
  ],
  Csus4: [
    { strings: [-1, 3, 3, 0, 1, 1], baseFret: 1 },
    { strings: [-1, 3, 3, 0, 1, -1], baseFret: 1 },
    { strings: [-1, 3, 5, 5, 6, 3], baseFret: 3, barre: 3 },
    { strings: [8, -1, 5, 5, 6, 8], baseFret: 5, barre: 5 },
    { strings: [8, -1, 5, 5, 6, -1], baseFret: 5, barre: 5 },
    { strings: [8, 10, 10, 10, 8, 8], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 10, 10, 8, 8], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 10, 12, 13, 13], baseFret: 10 },
  ],
  Cadd9: [
    { strings: [-1, 3, 2, 0, 3, 0], baseFret: 1 },
    { strings: [-1, 3, 2, 0, 3, 3], baseFret: 1 },
    { strings: [-1, 3, 2, 0, 3, -1], baseFret: 1 },
    { strings: [-1, 3, -1, 0, 3, 0], baseFret: 1 },
    { strings: [-1, 3, 5, 7, 5, 3], baseFret: 3, barre: 3 },
    { strings: [8, -1, 5, 7, 5, 8], baseFret: 5, barre: 5 },
    { strings: [8, -1, 5, 7, 5, -1], baseFret: 5, barre: 5 },
    { strings: [8, 10, 12, 9, 8, 8], baseFret: 8, barre: 8 },
  ],
  Cdim: [
    { strings: [-1, 3, 4, 5, 4, -1], baseFret: 1 },
    { strings: [8, 9, 10, 8, -1, -1], baseFret: 8 },
  ],
  Cdim7: [
    { strings: [-1, -1, 1, 2, 1, 2], baseFret: 1 },
    { strings: [-1, 3, 4, 2, 4, -1], baseFret: 1 },
    { strings: [-1, 3, -1, 2, 4, 2], baseFret: 1 },
    { strings: [-1, -1, 4, 5, 4, 5], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 7, 5, 7, -1], baseFret: 5 },
    { strings: [8, -1, 7, 8, 7, -1], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 7, 8, 7, 8], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 10, 11, 10, 11], baseFret: 10, barre: 10 },
  ],
  Caug: [
    { strings: [-1, 3, 2, 1, 1, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 1, 1, 0], baseFret: 1 },
    { strings: [-1, 3, 2, 1, 1, 4], baseFret: 1 },
    { strings: [-1, 3, 2, 1, 1, -1], baseFret: 1 },
    { strings: [-1, 3, 6, 5, 5, -1], baseFret: 3 },
    { strings: [-1, 3, -1, 5, 5, 4], baseFret: 3 },
    { strings: [8, 7, 6, 5, 5, -1], baseFret: 5, barre: 5 },
    { strings: [8, -1, 6, 5, 5, -1], baseFret: 5, barre: 5 },
  ],
  C6: [
    { strings: [-1, 3, 2, 2, 1, 0], baseFret: 1 },
    { strings: [-1, 0, 2, 0, 1, -1], baseFret: 1 },
    { strings: [-1, 3, 2, 2, 1, -1], baseFret: 1 },
    { strings: [-1, 3, 5, 2, 5, -1], baseFret: 2 },
    { strings: [-1, 3, -1, 2, 5, 3], baseFret: 2 },
    { strings: [-1, 3, 7, 5, 5, 3], baseFret: 3, barre: 3 },
    { strings: [8, -1, 7, 5, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 10, 12, 10, 12], baseFret: 10, barre: 10 },
  ],
  Cm6: [
    { strings: [-1, 3, 1, 2, 1, 3], baseFret: 1 },
    { strings: [-1, 3, 1, 2, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 1, 2, 1, 3], baseFret: 1 },
    { strings: [-1, 3, -1, 2, 4, 3], baseFret: 1 },
    { strings: [-1, 3, 5, 2, 4, -1], baseFret: 2 },
    { strings: [-1, 3, -1, 5, 4, 5], baseFret: 3 },
    { strings: [-1, 6, 7, 5, 8, -1], baseFret: 5 },
    { strings: [-1, -1, 10, 12, 10, 11], baseFret: 10, barre: 10 },
  ],
  Cm7b5: [
    { strings: [-1, -1, 1, 3, 1, 2], baseFret: 1 },
    { strings: [-1, 3, -1, 3, 4, 2], baseFret: 1 },
    { strings: [-1, 3, 4, 3, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 5, 4, 6], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 8, 5, 7, -1], baseFret: 5 },
    { strings: [-1, -1, 10, 8, 7, 6], baseFret: 6 },
    { strings: [8, -1, 8, 8, 7, -1], baseFret: 7 },
    { strings: [-1, 9, 10, 8, 11, -1], baseFret: 8 },
  ],
  C9: [
    { strings: [-1, 3, 2, 3, 3, 0], baseFret: 1 },
  ],

  // ── C# / Db ────────────────────────────────────────────────────────────────
  "C#": [
    { strings: [-1, 4, 3, 0, 2, 0], baseFret: 1 },
    { strings: [-1, 4, -1, 0, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 3, 0, 2, 0], baseFret: 1 },
    { strings: [-1, 4, 6, 6, 6, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 6, 6, 4], baseFret: 4, barre: 4 },
    { strings: [9, -1, 6, 6, 6, 9], baseFret: 6, barre: 6 },
    { strings: [9, 11, 11, 10, 9, 9], baseFret: 9, barre: 9 },
    { strings: [9, -1, 11, 10, 9, -1], baseFret: 9, barre: 9 },
  ],
  "C#m": [
    { strings: [-1, 4, 2, 1, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 1, 2, 0], baseFret: 1 },
    { strings: [-1, 4, 6, 6, 5, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 6, 5, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 4, 6, 6, 5, -1], baseFret: 4 },
    { strings: [9, 11, 11, 9, 9, 9], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 11, 9, 9, 9], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 11, 13, 14, 12], baseFret: 11 },
  ],
  "C#7": [
    { strings: [-1, -1, 3, 4, 2, 0], baseFret: 1 },
    { strings: [-1, 2, 3, 1, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 4, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 4, 6, 4], baseFret: 4, barre: 4 },
    { strings: [9, -1, 6, 6, 6, 7], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 9, 6, 9, -1], baseFret: 6 },
    { strings: [-1, -1, 6, 6, 6, 7], baseFret: 6, barre: 6 },
    { strings: [9, 11, 9, 10, 9, 9], baseFret: 9, barre: 9 },
  ],
  "C#m7": [
    { strings: [-1, 4, 2, 1, 0, 0], baseFret: 1 },
    { strings: [-1, 4, 2, 1, 0, -1], baseFret: 1 },
    { strings: [-1, 4, 6, 6, 0, 0], baseFret: 4 },
    { strings: [-1, 4, 6, 4, 0, 0], baseFret: 4, barre: 4 },
    { strings: [-1, 4, 2, 4, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 4, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 4, 5, 4], baseFret: 4, barre: 4 },
    { strings: [9, 11, 9, 9, 9, 9], baseFret: 9, barre: 9 },
  ],
  "C#maj7": [
    { strings: [-1, 4, 3, 0, 0, 0], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 2, 4], baseFret: 2 },
    { strings: [-1, 4, 6, 5, 6, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 6, 6, 8], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 10, 6, 9, -1], baseFret: 6 },
    { strings: [-1, 8, -1, 6, 9, 8], baseFret: 6 },
    { strings: [9, -1, 10, 10, 9, 8], baseFret: 8 },
    { strings: [9, 11, 10, 10, 9, 9], baseFret: 9, barre: 9 },
  ],
  "C#sus2": [
    { strings: [-1, 4, -1, 0, 4, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 6, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 4, 6, 6, 4, -1], baseFret: 4, barre: 4 },
    { strings: [9, -1, 6, 8, 9, 9], baseFret: 6 },
    { strings: [9, -1, 6, 8, 9, -1], baseFret: 6 },
    { strings: [9, -1, -1, 8, 9, 9], baseFret: 8 },
    { strings: [9, 11, 11, 8, -1, -1], baseFret: 8 },
    { strings: [-1, -1, 11, 13, 14, 11], baseFret: 11, barre: 11 },
  ],
  "C#sus4": [
    { strings: [-1, 4, 4, 0, 2, -1], baseFret: 1 },
    { strings: [-1, 4, 6, 6, 7, 4], baseFret: 4, barre: 4 },
    { strings: [9, -1, 6, 6, 7, 9], baseFret: 6, barre: 6 },
    { strings: [9, -1, 6, 6, 7, -1], baseFret: 6, barre: 6 },
    { strings: [9, 11, 11, 11, 9, 9], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 11, 11, 9, 9], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 11, 13, 14, 14], baseFret: 11 },
  ],
  "C#add9": [
    { strings: [-1, 4, 3, 0, 4, 0], baseFret: 1 },
    { strings: [-1, 4, 3, 0, 4, -1], baseFret: 1 },
    { strings: [-1, 4, -1, 0, 4, 0], baseFret: 1 },
    { strings: [-1, 4, 6, 8, 6, 4], baseFret: 4, barre: 4 },
    { strings: [9, -1, 6, 8, 6, 9], baseFret: 6, barre: 6 },
    { strings: [9, -1, 6, 8, 6, -1], baseFret: 6, barre: 6 },
    { strings: [9, 11, 13, 10, 9, 9], baseFret: 9, barre: 9 },
  ],
  "C#dim": [
    { strings: [-1, 4, 5, 6, 5, -1], baseFret: 4 },
  ],
  "C#dim7": [
    { strings: [-1, 1, 2, 0, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 3, 2, 3], baseFret: 1 },
    { strings: [-1, 4, -1, 3, 5, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 4, 5, 3, 5, -1], baseFret: 3 },
    { strings: [-1, -1, 5, 6, 5, 6], baseFret: 5, barre: 5 },
    { strings: [-1, 7, 8, 6, 8, -1], baseFret: 6 },
    { strings: [9, -1, 8, 9, 8, -1], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 11, 12, 11, 12], baseFret: 11, barre: 11 },
  ],
  "C#aug": [
    { strings: [-1, -1, 3, 2, 2, 0], baseFret: 1 },
    { strings: [-1, 4, 3, 2, 2, 5], baseFret: 2, barre: 2 },
    { strings: [-1, 4, 3, 2, 2, -1], baseFret: 1 },
    { strings: [-1, 4, 7, 6, 6, -1], baseFret: 4 },
    { strings: [-1, 4, -1, 6, 6, 5], baseFret: 4 },
    { strings: [9, 8, 7, 6, 6, -1], baseFret: 6, barre: 6 },
    { strings: [9, -1, 7, 6, 6, -1], baseFret: 6, barre: 6 },
    { strings: [9, -1, 11, 10, 10, 9], baseFret: 9, barre: 9 },
  ],
  "C#6": [
    { strings: [-1, 1, 3, 1, 2, -1], baseFret: 1 },
    { strings: [-1, 4, 3, 3, 2, -1], baseFret: 1 },
    { strings: [-1, 4, 6, 3, 6, -1], baseFret: 3 },
    { strings: [-1, 4, -1, 3, 6, 4], baseFret: 3 },
    { strings: [-1, 4, 8, 6, 6, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 4, 8, 6, 6, -1], baseFret: 4 },
    { strings: [9, -1, 8, 6, 6, 6], baseFret: 6, barre: 6 },
    { strings: [9, -1, 11, 10, 11, 9], baseFret: 9, barre: 9 },
  ],
  "C#m6": [
    { strings: [-1, 4, 2, 3, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 2, 3, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 3, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 3, 5, -1], baseFret: 3 },
    { strings: [-1, 4, -1, 3, 5, 4], baseFret: 3 },
    { strings: [-1, 4, -1, 6, 5, 6], baseFret: 4 },
    { strings: [-1, 7, 8, 6, 9, -1], baseFret: 6 },
    { strings: [-1, -1, 11, 13, 11, 12], baseFret: 11, barre: 11 },
  ],
  "C#m7b5": [
    { strings: [-1, 4, 2, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 4, 5, 0, 0, 0], baseFret: 4 },
    { strings: [-1, 4, 5, 4, 0, 0], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 2, 4, 2, 3], baseFret: 1 },
    { strings: [-1, 4, -1, 4, 5, 3], baseFret: 3 },
    { strings: [-1, 4, 5, 4, 5, -1], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 5, 6, 5, 7], baseFret: 5, barre: 5 },
    { strings: [-1, 7, 9, 6, 8, -1], baseFret: 6 },
  ],
  "Db": [
    { strings: [-1, 4, 3, 0, 2, 0], baseFret: 1 },
    { strings: [-1, 4, -1, 0, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 3, 0, 2, 0], baseFret: 1 },
    { strings: [-1, 4, 6, 6, 6, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 6, 6, 4], baseFret: 4, barre: 4 },
    { strings: [9, -1, 6, 6, 6, 9], baseFret: 6, barre: 6 },
    { strings: [9, 11, 11, 10, 9, 9], baseFret: 9, barre: 9 },
    { strings: [9, -1, 11, 10, 9, -1], baseFret: 9, barre: 9 },
  ],
  "Dbm": [
    { strings: [-1, 4, 2, 1, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 1, 2, 0], baseFret: 1 },
    { strings: [-1, 4, 6, 6, 5, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 6, 5, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 4, 6, 6, 5, -1], baseFret: 4 },
    { strings: [9, 11, 11, 9, 9, 9], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 11, 9, 9, 9], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 11, 13, 14, 12], baseFret: 11 },
  ],
  "Db7": [
    { strings: [-1, -1, 3, 4, 2, 0], baseFret: 1 },
    { strings: [-1, 2, 3, 1, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 4, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 4, 6, 4], baseFret: 4, barre: 4 },
    { strings: [9, -1, 6, 6, 6, 7], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 9, 6, 9, -1], baseFret: 6 },
    { strings: [-1, -1, 6, 6, 6, 7], baseFret: 6, barre: 6 },
    { strings: [9, 11, 9, 10, 9, 9], baseFret: 9, barre: 9 },
  ],
  "Dbm7": [
    { strings: [-1, 4, 2, 1, 0, 0], baseFret: 1 },
    { strings: [-1, 4, 2, 1, 0, -1], baseFret: 1 },
    { strings: [-1, 4, 6, 6, 0, 0], baseFret: 4 },
    { strings: [-1, 4, 6, 4, 0, 0], baseFret: 4, barre: 4 },
    { strings: [-1, 4, 2, 4, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 4, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 4, 5, 4], baseFret: 4, barre: 4 },
    { strings: [9, 11, 9, 9, 9, 9], baseFret: 9, barre: 9 },
  ],
  "Dbmaj7": [
    { strings: [-1, 4, 3, 0, 0, 0], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 2, 4], baseFret: 2 },
    { strings: [-1, 4, 6, 5, 6, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 6, 6, 8], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 10, 6, 9, -1], baseFret: 6 },
    { strings: [-1, 8, -1, 6, 9, 8], baseFret: 6 },
    { strings: [9, -1, 10, 10, 9, 8], baseFret: 8 },
    { strings: [9, 11, 10, 10, 9, 9], baseFret: 9, barre: 9 },
  ],
  "Dbm7b5": [
    { strings: [-1, 4, 2, 0, 0, 0], baseFret: 1 },
    { strings: [-1, 4, 5, 0, 0, 0], baseFret: 4 },
    { strings: [-1, 4, 5, 4, 0, 0], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 2, 4, 2, 3], baseFret: 1 },
    { strings: [-1, 4, -1, 4, 5, 3], baseFret: 3 },
    { strings: [-1, 4, 5, 4, 5, -1], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 5, 6, 5, 7], baseFret: 5, barre: 5 },
    { strings: [-1, 7, 9, 6, 8, -1], baseFret: 6 },
  ],

  // ── D ──────────────────────────────────────────────────────────────────────
  D: [
    { strings: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
    { strings: [-1, 5, 4, 0, 3, 0], baseFret: 3 },
    { strings: [-1, -1, 4, 0, 3, 0], baseFret: 1 },
    { strings: [-1, 5, -1, 0, 3, 0], baseFret: 3 },
    { strings: [-1, 5, 7, 7, 7, 5], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 7, 7, 7, 5], baseFret: 5 },
    { strings: [10, -1, 7, 7, 7, 10], baseFret: 7, barre: 7 },
    { strings: [10, 12, 12, 11, 10, 10], baseFret: 10, barre: 10 },
  ],
  Dm: [
    { strings: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
    { strings: [-1, -1, 3, 2, 3, 1], baseFret: 1 },
    { strings: [-1, 5, 7, 7, 6, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 5, 7, 7, 6, -1], baseFret: 5 },
    { strings: [-1, -1, 7, 7, 6, 5], baseFret: 5 },
    { strings: [10, 12, 12, 10, 10, 10], baseFret: 10, barre: 10 },
    { strings: [-1, -1, 12, 10, 10, 10], baseFret: 10, barre: 10 },
  ],
  D7: [
    { strings: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
    { strings: [-1, -1, 4, 5, 3, 0], baseFret: 3 },
    { strings: [-1, 3, 4, 2, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 5, 3, 5], baseFret: 3 },
    { strings: [-1, 5, 7, 5, 7, 5], baseFret: 5, barre: 5 },
    { strings: [10, -1, 7, 7, 7, 8], baseFret: 7, barre: 7 },
    { strings: [-1, 9, 10, 7, 10, -1], baseFret: 7 },
    { strings: [10, 12, 10, 11, 10, 10], baseFret: 10, barre: 10 },
  ],
  Dm7: [
    { strings: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
    { strings: [-1, 5, 3, 2, 1, 1], baseFret: 1 },
    { strings: [-1, 5, 3, 2, 1, -1], baseFret: 1 },
    { strings: [-1, 5, 3, 5, 3, -1], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 3, 5, 3, 5], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 7, 5, 6, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 5, 7, 5, 6, 8], baseFret: 5, barre: 5 },
    { strings: [10, 12, 10, 10, 10, 10], baseFret: 10, barre: 10 },
  ],
  Dmaj7: [
    { strings: [-1, -1, 0, 2, 2, 2], baseFret: 1 },
    { strings: [-1, 5, 4, 0, 0, 0], baseFret: 4 },
    { strings: [-1, -1, 4, 6, 3, 5], baseFret: 3 },
    { strings: [-1, 5, 7, 6, 7, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 9, 11, 7, 10, -1], baseFret: 7 },
    { strings: [-1, 9, -1, 7, 10, 9], baseFret: 7 },
    { strings: [-1, -1, 7, 7, 7, 9], baseFret: 7, barre: 7 },
    { strings: [10, 12, 11, 11, 10, 10], baseFret: 10, barre: 10 },
  ],
  Dsus2: [
    { strings: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
    { strings: [-1, 5, -1, 0, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 5, 7, 7, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 5, 7, 7, 5, -1], baseFret: 5, barre: 5 },
    { strings: [10, -1, 7, 9, 10, 10], baseFret: 7 },
    { strings: [10, -1, 7, 9, 10, -1], baseFret: 7 },
    { strings: [10, 12, 12, 9, 10, 10], baseFret: 9 },
    { strings: [10, -1, -1, 9, 10, 10], baseFret: 9 },
  ],
  Dsus4: [
    { strings: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
    { strings: [-1, 5, 5, 0, 3, -1], baseFret: 3 },
    { strings: [-1, 5, 7, 7, 8, 5], baseFret: 5, barre: 5 },
    { strings: [10, -1, 7, 7, 8, 10], baseFret: 7, barre: 7 },
    { strings: [10, -1, 7, 7, 8, -1], baseFret: 7, barre: 7 },
    { strings: [10, 12, 12, 12, 10, 10], baseFret: 10, barre: 10 },
    { strings: [-1, -1, 12, 12, 10, 10], baseFret: 10, barre: 10 },
  ],
  Dadd9: [
    { strings: [-1, 5, 4, 2, 3, 0], baseFret: 1 },
    { strings: [-1, 5, 4, 0, 5, 0], baseFret: 4 },
    { strings: [-1, 5, 4, 0, 5, -1], baseFret: 4 },
    { strings: [-1, 5, -1, 0, 5, 0], baseFret: 5, barre: 5 },
    { strings: [-1, 5, 7, 9, 7, 5], baseFret: 5, barre: 5 },
    { strings: [10, -1, 7, 9, 7, 10], baseFret: 7, barre: 7 },
    { strings: [10, -1, 7, 9, 7, -1], baseFret: 7, barre: 7 },
    { strings: [10, 12, 14, 11, 10, 10], baseFret: 10, barre: 10 },
  ],
  Ddim: [
    { strings: [-1, -1, 0, 1, 3, 1], baseFret: 1 },
    { strings: [10, 11, 12, 10, -1, -1], baseFret: 10 },
  ],
  Ddim7: [
    { strings: [-1, -1, 0, 1, 0, 1], baseFret: 1 },
    { strings: [-1, 2, 3, 1, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 4, 3, 4], baseFret: 1 },
    { strings: [-1, 5, -1, 4, 6, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 5, 6, 4, 6, -1], baseFret: 4 },
    { strings: [-1, -1, 6, 7, 6, 7], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 9, 7, 9, -1], baseFret: 7 },
    { strings: [10, -1, 9, 10, 9, -1], baseFret: 9, barre: 9 },
  ],
  Daug: [
    { strings: [-1, -1, 0, 3, 3, 2], baseFret: 1 },
    { strings: [-1, -1, 4, 3, 3, 0], baseFret: 1 },
    { strings: [-1, 5, 4, 3, 3, 6], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 4, 3, 3, -1], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 8, 7, 7, -1], baseFret: 5 },
    { strings: [-1, 5, -1, 7, 7, 6], baseFret: 5 },
    { strings: [10, 9, 8, 7, 7, -1], baseFret: 7, barre: 7 },
    { strings: [10, -1, 12, 11, 11, 10], baseFret: 10, barre: 10 },
  ],
  D6: [
    { strings: [-1, -1, 0, 2, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 2, 3, -1], baseFret: 1 },
    { strings: [-1, 5, 4, 4, 3, -1], baseFret: 3 },
    { strings: [-1, 5, 7, 4, 7, -1], baseFret: 4 },
    { strings: [-1, 5, -1, 4, 7, 5], baseFret: 4 },
    { strings: [-1, 5, 9, 7, 7, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 5, 7, 7, 7, 7], baseFret: 5 },
    { strings: [10, -1, 12, 11, 12, 10], baseFret: 10, barre: 10 },
  ],
  Dm6: [
    { strings: [-1, -1, 0, 2, 0, 1], baseFret: 1 },
    { strings: [-1, 5, 3, 4, 3, 5], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 3, 4, 3, -1], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 3, 4, 3, 5], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 7, 4, 6, -1], baseFret: 4 },
    { strings: [-1, 5, -1, 4, 6, 5], baseFret: 4 },
    { strings: [-1, 5, 7, 7, 6, 7], baseFret: 5 },
    { strings: [-1, -1, 12, 14, 12, 13], baseFret: 12, barre: 12 },
  ],
  Dm7b5: [
    { strings: [-1, -1, 0, 1, 1, 1], baseFret: 1 },
    { strings: [-1, 5, 3, 1, 1, 1], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 3, 4], baseFret: 3, barre: 3 },
    { strings: [-1, 5, -1, 5, 6, 4], baseFret: 4 },
    { strings: [-1, 5, 6, 5, 6, -1], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 6, 7, 6, 8], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 10, 7, 9, -1], baseFret: 7 },
    { strings: [-1, -1, 12, 10, 9, 8], baseFret: 8 },
  ],
  D9: [
    { strings: [-1, -1, 0, 2, 1, 0], baseFret: 1 },
  ],

  // ── D# / Eb ────────────────────────────────────────────────────────────────
  "D#": [
    { strings: [-1, 6, 5, 0, 4, 0], baseFret: 4 },
    { strings: [-1, 6, -1, 0, 4, 0], baseFret: 4 },
    { strings: [-1, -1, 5, 0, 4, 0], baseFret: 4 },
    { strings: [-1, -1, 1, 3, 4, 3], baseFret: 1 },
    { strings: [-1, 6, 8, 8, 8, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 8, 8, 6], baseFret: 6 },
    { strings: [11, -1, 8, 8, 8, 11], baseFret: 8, barre: 8 },
    { strings: [11, 13, 13, 12, 11, 11], baseFret: 11, barre: 11 },
  ],
  "D#m": [
    { strings: [-1, -1, 1, 3, 4, 2], baseFret: 1 },
    { strings: [-1, -1, 4, 3, 4, 2], baseFret: 1 },
    { strings: [-1, 6, 8, 8, 7, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 6, 8, 8, 7, -1], baseFret: 6 },
    { strings: [-1, -1, 8, 8, 7, 6], baseFret: 6 },
    { strings: [11, 13, 13, 11, 11, 11], baseFret: 11, barre: 11 },
    { strings: [-1, -1, 13, 11, 11, 11], baseFret: 11, barre: 11 },
  ],
  "D#7": [
    { strings: [-1, 1, 1, 0, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 5, 6, 4, 0], baseFret: 4 },
    { strings: [-1, -1, 1, 3, 2, 3], baseFret: 1 },
    { strings: [-1, 4, 5, 3, 4, -1], baseFret: 3 },
    { strings: [-1, -1, 5, 6, 4, 6], baseFret: 4 },
    { strings: [-1, 6, 8, 6, 8, 6], baseFret: 6, barre: 6 },
    { strings: [11, -1, 8, 8, 8, 9], baseFret: 8, barre: 8 },
    { strings: [11, 13, 11, 12, 11, 11], baseFret: 11, barre: 11 },
  ],
  "D#m7": [
    { strings: [-1, -1, 1, 3, 2, 2], baseFret: 1 },
    { strings: [-1, 6, 4, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 6, 4, 3, 2, -1], baseFret: 2 },
    { strings: [-1, 6, 4, 6, 4, -1], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 4, 6, 4, 6], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 8, 6, 7, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 6, 8, 6, 7, 9], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 8, 7, 9], baseFret: 7 },
  ],
  "D#maj7": [
    { strings: [-1, 1, 1, 0, 3, -1], baseFret: 1 },
    { strings: [-1, 6, 5, 0, 0, 0], baseFret: 5 },
    { strings: [-1, -1, 1, 3, 3, 3], baseFret: 1 },
    { strings: [-1, -1, 5, 7, 4, 6], baseFret: 4 },
    { strings: [-1, 6, 8, 7, 8, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 10, 12, 8, 11, -1], baseFret: 8 },
    { strings: [-1, 10, -1, 8, 11, 10], baseFret: 8 },
    { strings: [-1, -1, 12, 12, 11, 11], baseFret: 11, barre: 11 },
  ],
  "D#sus2": [
    { strings: [-1, -1, 1, 3, 4, 1], baseFret: 1 },
    { strings: [-1, 6, 8, 8, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 6, 8, 8, 6, -1], baseFret: 6, barre: 6 },
    { strings: [11, -1, 8, 10, 11, 11], baseFret: 8 },
    { strings: [11, -1, 8, 10, 11, -1], baseFret: 8 },
    { strings: [11, -1, -1, 10, 11, 11], baseFret: 10 },
    { strings: [11, 13, 13, 10, -1, -1], baseFret: 10 },
    { strings: [11, -1, 13, 10, 11, -1], baseFret: 10 },
  ],
  "D#sus4": [
    { strings: [-1, 6, 6, 0, 4, -1], baseFret: 4 },
    { strings: [-1, -1, 1, 3, 4, 4], baseFret: 1 },
    { strings: [-1, 6, 8, 8, 9, 6], baseFret: 6, barre: 6 },
    { strings: [11, -1, 8, 8, 9, 11], baseFret: 8, barre: 8 },
    { strings: [11, -1, 8, 8, 9, -1], baseFret: 8, barre: 8 },
    { strings: [11, 13, 13, 13, 11, 11], baseFret: 11, barre: 11 },
    { strings: [-1, -1, 13, 13, 11, 11], baseFret: 11, barre: 11 },
  ],
  "D#add9": [
    { strings: [-1, 6, 5, 0, 6, 0], baseFret: 5 },
    { strings: [-1, 6, 5, 0, 6, -1], baseFret: 5 },
    { strings: [-1, 6, 8, 10, 8, 6], baseFret: 6, barre: 6 },
    { strings: [11, -1, 8, 10, 8, 11], baseFret: 8, barre: 8 },
    { strings: [11, -1, 8, 10, 8, -1], baseFret: 8, barre: 8 },
  ],
  "D#dim": [
    { strings: [-1, -1, 1, 2, 4, 2], baseFret: 1 },
  ],
  "D#dim7": [
    { strings: [-1, -1, 1, 2, 1, 2], baseFret: 1 },
    { strings: [-1, 3, 4, 2, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 5, 4, 5], baseFret: 4, barre: 4 },
    { strings: [-1, 6, -1, 5, 7, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 6, 7, 5, 7, -1], baseFret: 5 },
    { strings: [-1, -1, 7, 8, 7, 8], baseFret: 7, barre: 7 },
    { strings: [-1, 9, 10, 8, 10, -1], baseFret: 8 },
    { strings: [11, -1, 10, 11, 10, -1], baseFret: 10, barre: 10 },
  ],
  "D#aug": [
    { strings: [-1, -1, 5, 4, 4, 0], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 1, 4, 4, 3], baseFret: 1 },
    { strings: [-1, 6, 5, 4, 4, 7], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 5, 4, 4, -1], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 9, 8, 8, -1], baseFret: 6 },
    { strings: [-1, 6, -1, 8, 8, 7], baseFret: 6 },
    { strings: [11, 10, 9, 8, 8, -1], baseFret: 8, barre: 8 },
    { strings: [11, -1, 13, 12, 12, 11], baseFret: 11, barre: 11 },
  ],
  "D#6": [
    { strings: [-1, 1, 1, 0, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 1, 3, 1, 3], baseFret: 1 },
    { strings: [-1, 3, 5, 3, 4, -1], baseFret: 3, barre: 3 },
    { strings: [-1, 6, 5, 5, 4, -1], baseFret: 4 },
    { strings: [-1, 6, 8, 5, 8, -1], baseFret: 5 },
    { strings: [-1, 6, -1, 5, 8, 6], baseFret: 5 },
    { strings: [-1, 6, 10, 8, 8, 6], baseFret: 6, barre: 6 },
    { strings: [11, -1, 13, 12, 13, 11], baseFret: 11, barre: 11 },
  ],
  "D#m6": [
    { strings: [-1, -1, 1, 3, 1, 2], baseFret: 1 },
    { strings: [-1, 6, 4, 5, 4, 6], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 4, 5, 4, -1], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 4, 5, 4, 6], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 8, 5, 7, -1], baseFret: 5 },
    { strings: [-1, 6, -1, 5, 7, 6], baseFret: 5 },
    { strings: [-1, 6, -1, 8, 7, 8], baseFret: 6 },
    { strings: [-1, 9, 10, 8, 11, -1], baseFret: 8 },
  ],
  "D#m7b5": [
    { strings: [-1, -1, 1, 2, 2, 2], baseFret: 1 },
    { strings: [-1, 6, 4, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 6, 4, 5], baseFret: 4, barre: 4 },
    { strings: [-1, 6, -1, 6, 7, 5], baseFret: 5 },
    { strings: [-1, 6, 7, 6, 7, -1], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 7, 8, 7, 9], baseFret: 7, barre: 7 },
    { strings: [-1, 9, 11, 8, 10, -1], baseFret: 8 },
    { strings: [-1, -1, 13, 11, 10, 9], baseFret: 9 },
  ],
  "Eb": [
    { strings: [-1, 6, 5, 0, 4, 0], baseFret: 4 },
    { strings: [-1, 6, -1, 0, 4, 0], baseFret: 4 },
    { strings: [-1, -1, 5, 0, 4, 0], baseFret: 4 },
    { strings: [-1, -1, 1, 3, 4, 3], baseFret: 1 },
    { strings: [-1, 6, 8, 8, 8, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 8, 8, 6], baseFret: 6 },
    { strings: [11, -1, 8, 8, 8, 11], baseFret: 8, barre: 8 },
    { strings: [11, 13, 13, 12, 11, 11], baseFret: 11, barre: 11 },
  ],
  "Ebm": [
    { strings: [-1, -1, 1, 3, 4, 2], baseFret: 1 },
    { strings: [-1, -1, 4, 3, 4, 2], baseFret: 1 },
    { strings: [-1, 6, 8, 8, 7, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 6, 8, 8, 7, -1], baseFret: 6 },
    { strings: [-1, -1, 8, 8, 7, 6], baseFret: 6 },
    { strings: [11, 13, 13, 11, 11, 11], baseFret: 11, barre: 11 },
    { strings: [-1, -1, 13, 11, 11, 11], baseFret: 11, barre: 11 },
  ],
  "Eb7": [
    { strings: [-1, 1, 1, 0, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 5, 6, 4, 0], baseFret: 4 },
    { strings: [-1, -1, 1, 3, 2, 3], baseFret: 1 },
    { strings: [-1, 4, 5, 3, 4, -1], baseFret: 3 },
    { strings: [-1, -1, 5, 6, 4, 6], baseFret: 4 },
    { strings: [-1, 6, 8, 6, 8, 6], baseFret: 6, barre: 6 },
    { strings: [11, -1, 8, 8, 8, 9], baseFret: 8, barre: 8 },
    { strings: [11, 13, 11, 12, 11, 11], baseFret: 11, barre: 11 },
  ],
  "Ebm7": [
    { strings: [-1, -1, 1, 3, 2, 2], baseFret: 1 },
    { strings: [-1, 6, 4, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 6, 4, 3, 2, -1], baseFret: 2 },
    { strings: [-1, 6, 4, 6, 4, -1], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 4, 6, 4, 6], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 8, 6, 7, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 6, 8, 6, 7, 9], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 8, 7, 9], baseFret: 7 },
  ],
  "Ebmaj7": [
    { strings: [-1, 1, 1, 0, 3, -1], baseFret: 1 },
    { strings: [-1, 6, 5, 0, 0, 0], baseFret: 5 },
    { strings: [-1, -1, 1, 3, 3, 3], baseFret: 1 },
    { strings: [-1, -1, 5, 7, 4, 6], baseFret: 4 },
    { strings: [-1, 6, 8, 7, 8, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 10, 12, 8, 11, -1], baseFret: 8 },
    { strings: [-1, 10, -1, 8, 11, 10], baseFret: 8 },
    { strings: [-1, -1, 12, 12, 11, 11], baseFret: 11, barre: 11 },
  ],

  // ── E ──────────────────────────────────────────────────────────────────────
  E: [
    { strings: [0, 2, 2, 1, 0, 0], baseFret: 1 },
    { strings: [0, -1, 2, 1, 0, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 1, 0, 0], baseFret: 1 },
    { strings: [0, 2, 2, 4, 5, 4], baseFret: 1 },
    { strings: [0, 7, 6, 4, 5, 4], baseFret: 4, barre: 4 },
    { strings: [0, 7, 6, 4, 5, 0], baseFret: 4 },
    { strings: [-1, 7, 9, 9, 9, 7], baseFret: 7, barre: 7 },
    { strings: [12, 14, 14, 13, 12, 12], baseFret: 12, barre: 12 },
  ],
  Em: [
    { strings: [0, 2, 2, 0, 0, 0], baseFret: 1 },
    { strings: [0, 2, 2, 0, 0, 3], baseFret: 1 },
    { strings: [-1, -1, 2, 0, 0, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 4, 5, 3], baseFret: 2 },
    { strings: [-1, -1, 5, 4, 5, 3], baseFret: 3 },
    { strings: [-1, 7, 9, 9, 8, 7], baseFret: 7, barre: 7 },
    { strings: [-1, 7, 9, 9, 8, -1], baseFret: 7 },
    { strings: [12, 14, 14, 12, 12, 12], baseFret: 12, barre: 12 },
  ],
  E7: [
    { strings: [0, 2, 0, 1, 0, 0], baseFret: 1 },
    { strings: [0, 2, 2, 1, 3, 0], baseFret: 1 },
    { strings: [0, 2, 0, 1, 3, 0], baseFret: 1 },
    { strings: [-1, -1, 0, 1, 0, 0], baseFret: 1 },
    { strings: [0, 7, 6, 7, 5, 0], baseFret: 5 },
    { strings: [-1, -1, 6, 7, 5, 0], baseFret: 5 },
    { strings: [-1, 7, 9, 7, 9, 7], baseFret: 7, barre: 7 },
    { strings: [12, 14, 12, 13, 12, 12], baseFret: 12, barre: 12 },
  ],
  Em7: [
    { strings: [0, 2, 2, 0, 3, 0], baseFret: 1 },
    { strings: [0, 2, 0, 0, 0, 0], baseFret: 1 },
    { strings: [0, 2, 0, 0, 3, 0], baseFret: 1 },
    { strings: [0, 2, -1, 0, 3, 0], baseFret: 1 },
    { strings: [-1, 2, 2, 0, 3, -1], baseFret: 1 },
    { strings: [0, -1, 5, 4, 3, 0], baseFret: 3 },
    { strings: [-1, 7, 5, 4, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 7, 9, 7, 8, 7], baseFret: 7, barre: 7 },
  ],
  Emaj7: [
    { strings: [0, 2, 1, 1, 0, 0], baseFret: 1 },
    { strings: [0, 2, 1, 1, 0, 4], baseFret: 1 },
    { strings: [-1, -1, 1, 1, 0, 0], baseFret: 1 },
    { strings: [0, -1, 2, 4, 4, 4], baseFret: 1 },
    { strings: [0, 7, 6, 4, 4, 4], baseFret: 4, barre: 4 },
    { strings: [0, -1, 6, 8, 5, 7], baseFret: 5 },
    { strings: [-1, 7, 9, 8, 9, 7], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 9, 9, 9, 11], baseFret: 9, barre: 9 },
  ],
  Esus2: [
    { strings: [0, 2, 4, 4, 0, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 4, 5, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 7, 9, 9, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, 7, 9, 9, 7, -1], baseFret: 7, barre: 7 },
    { strings: [12, -1, 9, 11, 12, 12], baseFret: 9 },
    { strings: [12, -1, 9, 11, 12, -1], baseFret: 9 },
    { strings: [12, -1, -1, 11, 12, 12], baseFret: 11 },
    { strings: [12, 14, 14, 11, -1, -1], baseFret: 11 },
  ],
  Esus4: [
    { strings: [0, 2, 2, 2, 0, 0], baseFret: 1 },
    { strings: [0, 0, 2, 2, 0, 0], baseFret: 1 },
    { strings: [0, -1, 2, 2, 0, 0], baseFret: 1 },
    { strings: [-1, -1, 2, 2, 0, 0], baseFret: 1 },
    { strings: [0, -1, 7, 4, 5, 0], baseFret: 4 },
    { strings: [-1, 7, 7, 0, 5, -1], baseFret: 5 },
    { strings: [-1, 7, 9, 9, 10, 7], baseFret: 7, barre: 7 },
    { strings: [12, 14, 14, 14, 12, 12], baseFret: 12, barre: 12 },
  ],
  Eadd9: [
    { strings: [0, 2, 2, 1, 0, 2], baseFret: 1 },
    { strings: [0, 2, 4, 1, 0, 0], baseFret: 1 },
    { strings: [0, -1, 6, 4, 5, 2], baseFret: 2 },
    { strings: [-1, 7, 9, 11, 9, 7], baseFret: 7, barre: 7 },
    { strings: [12, -1, 9, 11, 9, 12], baseFret: 9, barre: 9 },
    { strings: [12, -1, 9, 11, 9, -1], baseFret: 9, barre: 9 },
  ],
  Edim: [
    { strings: [0, 1, 2, 0, -1, -1], baseFret: 1 },
  ],
  Edim7: [
    { strings: [-1, 1, 2, 0, 2, -1], baseFret: 1 },
    { strings: [0, -1, 2, 3, 2, 3], baseFret: 1 },
    { strings: [0, -1, 5, 6, 5, 6], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 2, 3, 2, 3], baseFret: 1 },
    { strings: [-1, 4, 5, 3, 5, -1], baseFret: 3 },
    { strings: [-1, -1, 5, 6, 5, 6], baseFret: 5, barre: 5 },
    { strings: [-1, 7, 8, 6, 8, -1], baseFret: 6 },
    { strings: [12, -1, 11, 12, 11, -1], baseFret: 11, barre: 11 },
  ],
  Eaug: [
    { strings: [0, 3, 2, 1, 1, 0], baseFret: 1 },
    { strings: [0, -1, 2, 1, 1, 0], baseFret: 1 },
    { strings: [0, 3, 2, 1, -1, -1], baseFret: 1 },
    { strings: [0, -1, 2, 1, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 1, 1, 0], baseFret: 1 },
    { strings: [0, -1, 6, 5, 5, 4], baseFret: 4 },
    { strings: [0, 7, 6, 5, 5, -1], baseFret: 5, barre: 5 },
    { strings: [12, 11, 10, 9, 9, -1], baseFret: 9, barre: 9 },
  ],
  E6: [
    { strings: [0, 2, 2, 1, 2, 0], baseFret: 1 },
    { strings: [0, -1, 2, 1, 2, 0], baseFret: 1 },
    { strings: [0, -1, 2, 1, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 1, 2, 0], baseFret: 1 },
    { strings: [0, -1, 2, 4, 2, 4], baseFret: 1 },
    { strings: [-1, 4, 6, 4, 5, -1], baseFret: 4, barre: 4 },
    { strings: [-1, 7, 11, 9, 9, 7], baseFret: 7, barre: 7 },
    { strings: [12, -1, 11, 9, 9, 9], baseFret: 9, barre: 9 },
  ],
  Em6: [
    { strings: [0, 2, 2, 0, 2, 0], baseFret: 1 },
    { strings: [0, -1, 2, 0, 2, 0], baseFret: 1 },
    { strings: [-1, 2, 2, 0, 2, -1], baseFret: 1 },
    { strings: [0, -1, 5, 4, 2, 0], baseFret: 2 },
    { strings: [0, 4, 5, 4, 5, 0], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 2, 4, 2, 3], baseFret: 1 },
    { strings: [-1, 7, 5, 6, 5, 7], baseFret: 5, barre: 5 },
    { strings: [-1, 7, 5, 6, 5, -1], baseFret: 5, barre: 5 },
  ],
  Em7b5: [
    { strings: [-1, 1, 2, 0, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 3, 3, 3], baseFret: 1 },
    { strings: [-1, 7, 5, 3, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 7, 5, 6], baseFret: 5, barre: 5 },
    { strings: [-1, 7, -1, 7, 8, 6], baseFret: 6 },
    { strings: [-1, 7, 8, 7, 8, -1], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 8, 9, 8, 10], baseFret: 8, barre: 8 },
    { strings: [-1, 10, 12, 9, 11, -1], baseFret: 9 },
  ],
  E9: [
    { strings: [0, 2, 0, 1, 0, 2], baseFret: 1 },
  ],

  // ── F ──────────────────────────────────────────────────────────────────────
  F: [
    { strings: [1, 3, 3, 2, 1, 1], baseFret: 1, barre: 1 },
    { strings: [1, 3, 3, 2, 1, 5], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 2, 1, 1], baseFret: 1 },
    { strings: [1, -1, 3, 2, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 6, 5], baseFret: 3 },
    { strings: [-1, 8, 10, 10, 10, 8], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 10, 10, 10, 8], baseFret: 8 },
    { strings: [13, -1, 10, 10, 10, 13], baseFret: 10, barre: 10 },
  ],
  Fm: [
    { strings: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 1, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 5, 6, 4], baseFret: 3 },
    { strings: [-1, -1, 6, 5, 6, 4], baseFret: 4 },
    { strings: [-1, 8, 10, 10, 9, 8], baseFret: 8, barre: 8 },
    { strings: [-1, 8, 10, 10, 9, -1], baseFret: 8 },
    { strings: [-1, -1, 10, 10, 9, 8], baseFret: 8 },
  ],
  F7: [
    { strings: [1, 3, 1, 2, 1, 1], baseFret: 1, barre: 1 },
    { strings: [1, 3, 1, 2, 4, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 1, 2, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 3, 3, 2, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 4, 5], baseFret: 3 },
    { strings: [-1, 6, 7, 5, 6, -1], baseFret: 5 },
    { strings: [-1, 8, 10, 8, 10, 8], baseFret: 8, barre: 8 },
    { strings: [13, -1, 10, 10, 10, 11], baseFret: 10, barre: 10 },
  ],
  Fm7: [
    { strings: [1, 3, 1, 1, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 1, 1, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 3, 3, 1, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 4, 4], baseFret: 3 },
    { strings: [-1, 8, 6, 5, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 8, 6, 5, 4, -1], baseFret: 4 },
    { strings: [-1, 8, 6, 8, 6, -1], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 10, 8, 9, 8], baseFret: 8, barre: 8 },
  ],
  Fmaj7: [
    { strings: [1, 0, 3, 2, 1, 0], baseFret: 1 },
    { strings: [1, -1, 2, 2, 1, 0], baseFret: 1 },
    { strings: [1, -1, 3, 2, 1, 0], baseFret: 1 },
    { strings: [-1, -1, 3, 2, 1, 0], baseFret: 1 },
    { strings: [1, 3, 2, 2, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 2, 2, 1, 1], baseFret: 1 },
    { strings: [-1, 8, 10, 9, 10, 8], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 10, 10, 10, 12], baseFret: 10, barre: 10 },
  ],
  Fsus2: [
    { strings: [1, 3, 3, 0, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 0, 1, 1], baseFret: 1 },
    { strings: [1, -1, -1, 0, 1, 1], baseFret: 1 },
    { strings: [1, 3, 3, 0, -1, -1], baseFret: 1 },
    { strings: [1, -1, 3, 0, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 6, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 8, 10, 10, 8, 8], baseFret: 8, barre: 8 },
    { strings: [-1, 8, 10, 10, 8, -1], baseFret: 8, barre: 8 },
  ],
  Fsus4: [
    { strings: [1, 3, 3, 3, 1, 1], baseFret: 1, barre: 1 },
    { strings: [-1, -1, 3, 3, 1, 1], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 6, 6], baseFret: 3 },
    { strings: [-1, 8, 10, 10, 11, 8], baseFret: 8, barre: 8 },
    { strings: [13, -1, 10, 10, 11, 13], baseFret: 10, barre: 10 },
    { strings: [13, -1, 10, 10, 11, -1], baseFret: 10, barre: 10 },
  ],
  Fadd9: [
    { strings: [1, 0, 3, 2, 1, 1], baseFret: 1 },
    { strings: [1, 3, 5, 2, 1, 1], baseFret: 1 },
    { strings: [-1, -1, 3, 2, 1, 3], baseFret: 1 },
    { strings: [-1, 8, 10, 12, 10, 8], baseFret: 8, barre: 8 },
    { strings: [13, -1, 10, 12, 10, 13], baseFret: 10, barre: 10 },
    { strings: [13, -1, 10, 12, 10, -1], baseFret: 10, barre: 10 },
  ],
  Fdim: [
    { strings: [1, 2, 3, 1, -1, -1], baseFret: 1 },
  ],
  Fdim7: [
    { strings: [1, -1, 0, 1, 0, -1], baseFret: 1 },
    { strings: [-1, -1, 0, 1, 0, 1], baseFret: 1 },
    { strings: [-1, 2, 3, 1, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 4, 3, 4], baseFret: 1 },
    { strings: [-1, 5, 6, 4, 6, -1], baseFret: 4 },
    { strings: [-1, -1, 6, 7, 6, 7], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 9, 7, 9, -1], baseFret: 7 },
    { strings: [-1, -1, 9, 10, 9, 10], baseFret: 9, barre: 9 },
  ],
  Faug: [
    { strings: [1, -1, 3, 2, 2, 1], baseFret: 1 },
    { strings: [1, 4, 3, 2, -1, -1], baseFret: 1 },
    { strings: [1, -1, 3, 2, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 2, 2, 1], baseFret: 1 },
    { strings: [-1, -1, 3, 6, 6, 5], baseFret: 3 },
    { strings: [-1, 8, 7, 6, 6, 9], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 7, 6, 6, -1], baseFret: 6, barre: 6 },
    { strings: [13, 12, 11, 10, 10, -1], baseFret: 10, barre: 10 },
  ],
  F6: [
    { strings: [1, -1, 0, 2, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
    { strings: [1, 3, 3, 2, 3, 1], baseFret: 1, barre: 1 },
    { strings: [1, -1, 3, 2, 3, 1], baseFret: 1 },
    { strings: [-1, -1, 3, 2, 3, 1], baseFret: 1 },
    { strings: [1, -1, 3, 2, 3, -1], baseFret: 1 },
    { strings: [-1, 8, 12, 10, 10, 8], baseFret: 8, barre: 8 },
    { strings: [13, -1, 12, 10, 10, 10], baseFret: 10, barre: 10 },
  ],
  Fm6: [
    { strings: [1, -1, 0, 1, 1, 1], baseFret: 1 },
    { strings: [1, -1, 0, 1, 1, -1], baseFret: 1 },
    { strings: [1, 3, 3, 1, 3, 1], baseFret: 1, barre: 1 },
    { strings: [-1, 3, 3, 1, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 5, 3, 4], baseFret: 3, barre: 3 },
    { strings: [-1, 8, 6, 7, 6, 8], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 6, 7, 6, -1], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 6, 7, 6, 8], baseFret: 6, barre: 6 },
  ],
  Fm7b5: [
    { strings: [1, -1, 1, 1, 0, -1], baseFret: 1 },
    { strings: [-1, 2, 3, 1, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 4, 4, 4], baseFret: 1 },
    { strings: [-1, 8, 6, 4, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 8, 6, 7], baseFret: 6, barre: 6 },
    { strings: [-1, 8, -1, 8, 9, 7], baseFret: 7 },
    { strings: [-1, 8, 9, 8, 9, -1], baseFret: 8, barre: 8 },
    { strings: [-1, -1, 9, 10, 9, 11], baseFret: 9, barre: 9 },
  ],
  F9: [
    { strings: [1, 3, 1, 2, 1, 3], baseFret: 1, barre: 1 },
  ],

  // ── F# / Gb ────────────────────────────────────────────────────────────────
  "F#": [
    { strings: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 3, 2, 2], baseFret: 2 },
    { strings: [2, -1, 4, 3, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 6, 7, 6], baseFret: 4 },
    { strings: [-1, 9, 11, 11, 11, 9], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 11, 11, 11, 9], baseFret: 9 },
    { strings: [14, -1, 11, 11, 11, 14], baseFret: 11, barre: 11 },
  ],
  "F#m": [
    { strings: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 6, 7, 5], baseFret: 4 },
    { strings: [-1, -1, 7, 6, 7, 5], baseFret: 5 },
    { strings: [-1, 9, 11, 11, 10, 9], baseFret: 9, barre: 9 },
    { strings: [-1, 9, 11, 11, 10, -1], baseFret: 9 },
    { strings: [-1, -1, 11, 11, 10, 9], baseFret: 9 },
  ],
  "F#7": [
    { strings: [2, -1, -1, 3, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 4, 3, 2, 0], baseFret: 1 },
    { strings: [2, 4, 2, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 2, 3, 2, 2], baseFret: 1 },
    { strings: [2, 4, 2, 3, 5, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 3, 5, 2], baseFret: 2 },
    { strings: [-1, 4, 4, 3, 5, -1], baseFret: 3 },
    { strings: [-1, 9, 11, 9, 11, 9], baseFret: 9, barre: 9 },
  ],
  "F#m7": [
    { strings: [2, -1, -1, 2, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 4, 2, 2, 0], baseFret: 1 },
    { strings: [2, 4, 2, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 2, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 4, 4, 2, 5, -1], baseFret: 2 },
    { strings: [-1, -1, 4, 6, 5, 5], baseFret: 4 },
    { strings: [-1, 9, 7, 6, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 9, 11, 9, 10, 9], baseFret: 9, barre: 9 },
  ],
  "F#maj7": [
    { strings: [2, -1, 3, 3, 2, 1], baseFret: 1 },
    { strings: [2, -1, 4, 3, 2, 1], baseFret: 1 },
    { strings: [-1, -1, 4, 3, 2, 1], baseFret: 1 },
    { strings: [2, 4, 3, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 3, 3, 2, 2], baseFret: 1 },
    { strings: [-1, 4, 4, 3, 6, -1], baseFret: 3 },
    { strings: [-1, -1, 4, 6, 6, 6], baseFret: 4 },
    { strings: [-1, 9, 11, 10, 11, 9], baseFret: 9, barre: 9 },
  ],
  "F#sus2": [
    { strings: [2, -1, -1, 1, 2, 2], baseFret: 1 },
    { strings: [2, 4, 4, 1, -1, -1], baseFret: 1 },
    { strings: [2, -1, 4, 1, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 6, 7, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 9, 11, 11, 9, 9], baseFret: 9, barre: 9 },
    { strings: [-1, 9, 11, 11, 9, -1], baseFret: 9, barre: 9 },
    { strings: [14, -1, 11, 13, 14, 14], baseFret: 11 },
    { strings: [14, -1, 11, 13, 14, -1], baseFret: 11 },
  ],
  "F#sus4": [
    { strings: [2, 4, 4, 4, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 4, 2, 2], baseFret: 1 },
    { strings: [-1, -1, 4, 6, 7, 7], baseFret: 4 },
    { strings: [-1, 9, 11, 11, 12, 9], baseFret: 9, barre: 9 },
    { strings: [14, -1, 11, 11, 12, 14], baseFret: 11, barre: 11 },
    { strings: [14, -1, 11, 11, 12, -1], baseFret: 11, barre: 11 },
  ],
  "F#add9": [
    { strings: [2, 4, 6, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 9, 11, 13, 11, 9], baseFret: 9, barre: 9 },
    { strings: [14, -1, 11, 13, 11, 14], baseFret: 11, barre: 11 },
    { strings: [14, -1, 11, 13, 11, -1], baseFret: 11, barre: 11 },
  ],
  "F#dim": [
    { strings: [2, 3, 4, 2, -1, -1], baseFret: 2 },
  ],
  "F#dim7": [
    { strings: [2, -1, 1, 2, 1, -1], baseFret: 1 },
    { strings: [-1, -1, 1, 2, 1, 2], baseFret: 1 },
    { strings: [-1, 3, 4, 2, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 5, 4, 5], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 7, 5, 7, -1], baseFret: 5 },
    { strings: [-1, -1, 7, 8, 7, 8], baseFret: 7, barre: 7 },
    { strings: [-1, 9, 10, 8, 10, -1], baseFret: 8 },
    { strings: [-1, -1, 10, 11, 10, 11], baseFret: 10, barre: 10 },
  ],
  "F#aug": [
    { strings: [2, -1, 4, 3, 3, 2], baseFret: 1 },
    { strings: [2, -1, 4, 3, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 3, 3, 2], baseFret: 1 },
    { strings: [2, 5, 4, 3, -1, -1], baseFret: 2 },
    { strings: [-1, -1, 4, 7, 7, 6], baseFret: 4 },
    { strings: [-1, 9, 8, 7, 7, 10], baseFret: 7, barre: 7 },
    { strings: [-1, 9, 8, 7, 7, -1], baseFret: 7, barre: 7 },
    { strings: [14, 13, 12, 11, 11, -1], baseFret: 11, barre: 11 },
  ],
  "F#6": [
    { strings: [2, -1, 1, 3, 2, -1], baseFret: 1 },
    { strings: [2, -1, 4, 3, 4, 2], baseFret: 1 },
    { strings: [2, -1, 4, 3, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 3, 4, 2], baseFret: 1 },
    { strings: [-1, 4, 4, 3, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 6, 4, 6], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 8, 6, 7, -1], baseFret: 6, barre: 6 },
    { strings: [-1, 9, 13, 11, 11, 9], baseFret: 9, barre: 9 },
  ],
  "F#m6": [
    { strings: [2, -1, 1, 2, 2, 2], baseFret: 1 },
    { strings: [2, -1, 1, 2, 2, -1], baseFret: 1 },
    { strings: [-1, 4, 4, 2, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 6, 4, 5], baseFret: 4, barre: 4 },
    { strings: [-1, 9, 7, 8, 7, 9], baseFret: 7, barre: 7 },
    { strings: [-1, 9, 7, 8, 7, -1], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 7, 8, 7, 9], baseFret: 7, barre: 7 },
    { strings: [-1, 9, 11, 8, 10, -1], baseFret: 8 },
  ],
  "F#m7b5": [
    { strings: [-1, -1, 4, 2, 1, 0], baseFret: 1 },
    { strings: [2, -1, 2, 2, 1, -1], baseFret: 1 },
    { strings: [-1, 3, 4, 2, 5, -1], baseFret: 2 },
    { strings: [-1, -1, 4, 5, 5, 5], baseFret: 4 },
    { strings: [-1, 9, 7, 5, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, -1, 7, 9, 7, 8], baseFret: 7, barre: 7 },
    { strings: [-1, 9, -1, 9, 10, 8], baseFret: 8 },
    { strings: [-1, 9, 10, 9, 10, -1], baseFret: 9, barre: 9 },
  ],
  "Gb": [
    { strings: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 3, 2, 2], baseFret: 2 },
    { strings: [2, -1, 4, 3, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 4, 6, 7, 6], baseFret: 4 },
    { strings: [-1, 9, 11, 11, 11, 9], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 11, 11, 11, 9], baseFret: 9 },
    { strings: [14, -1, 11, 11, 11, 14], baseFret: 11, barre: 11 },
  ],
  "Gbm": [
    { strings: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 6, 7, 5], baseFret: 4 },
    { strings: [-1, -1, 7, 6, 7, 5], baseFret: 5 },
    { strings: [-1, 9, 11, 11, 10, 9], baseFret: 9, barre: 9 },
    { strings: [-1, 9, 11, 11, 10, -1], baseFret: 9 },
    { strings: [-1, -1, 11, 11, 10, 9], baseFret: 9 },
  ],
  "Gb7": [
    { strings: [2, -1, -1, 3, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 4, 3, 2, 0], baseFret: 1 },
    { strings: [2, 4, 2, 3, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 2, 3, 2, 2], baseFret: 1 },
    { strings: [2, 4, 2, 3, 5, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 4, 3, 5, 2], baseFret: 2 },
    { strings: [-1, 4, 4, 3, 5, -1], baseFret: 3 },
    { strings: [-1, 9, 11, 9, 11, 9], baseFret: 9, barre: 9 },
  ],
  "Gbm7": [
    { strings: [2, -1, -1, 2, 2, 0], baseFret: 1 },
    { strings: [-1, -1, 4, 2, 2, 0], baseFret: 1 },
    { strings: [2, 4, 2, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, -1, 2, 2, 2, 2], baseFret: 2, barre: 2 },
    { strings: [-1, 4, 4, 2, 5, -1], baseFret: 2 },
    { strings: [-1, -1, 4, 6, 5, 5], baseFret: 4 },
    { strings: [-1, 9, 7, 6, 5, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 9, 11, 9, 10, 9], baseFret: 9, barre: 9 },
  ],

  // ── G ──────────────────────────────────────────────────────────────────────
  G: [
    { strings: [3, 2, 0, 0, 0, 3], baseFret: 1 },
    { strings: [3, 2, 0, 0, 3, 3], baseFret: 1 },
    { strings: [3, -1, 0, 0, 0, 3], baseFret: 1 },
    { strings: [3, 5, 5, 4, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 4, 3, 3], baseFret: 3 },
    { strings: [3, -1, 5, 4, 3, -1], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 7, 8, 7], baseFret: 5 },
    { strings: [-1, 10, 12, 12, 12, 10], baseFret: 10, barre: 10 },
  ],
  Gm: [
    { strings: [3, 1, 0, 0, 3, 3], baseFret: 1 },
    { strings: [-1, -1, 0, 3, 3, 3], baseFret: 1 },
    { strings: [3, 5, 5, 3, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 3, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 7, 8, 6], baseFret: 5 },
    { strings: [-1, -1, 8, 7, 8, 6], baseFret: 6 },
    { strings: [-1, 10, 12, 12, 11, 10], baseFret: 10, barre: 10 },
    { strings: [-1, 10, 12, 12, 11, -1], baseFret: 10 },
  ],
  G7: [
    { strings: [3, 2, 0, 0, 0, 1], baseFret: 1 },
    { strings: [3, 2, 3, 0, 0, 1], baseFret: 1 },
    { strings: [3, -1, 0, 0, 0, 1], baseFret: 1 },
    { strings: [-1, -1, 0, 0, 0, 1], baseFret: 1 },
    { strings: [-1, 2, 3, 0, 3, -1], baseFret: 1 },
    { strings: [3, -1, -1, 4, 3, 1], baseFret: 1 },
    { strings: [3, 5, 3, 4, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 10, 12, 10, 12, 10], baseFret: 10, barre: 10 },
  ],
  Gm7: [
    { strings: [3, 1, 3, 0, 3, -1], baseFret: 1 },
    { strings: [-1, 1, 3, 0, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 5, 3, 3, 1], baseFret: 1 },
    { strings: [3, -1, -1, 3, 3, 1], baseFret: 1 },
    { strings: [3, 5, 3, 3, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 5, 3, 6, -1], baseFret: 3 },
    { strings: [-1, 10, 8, 7, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 10, 12, 10, 11, 10], baseFret: 10, barre: 10 },
  ],
  Gmaj7: [
    { strings: [3, 2, 0, 0, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 0, 3, -1], baseFret: 1 },
    { strings: [-1, 2, -1, 0, 3, 2], baseFret: 1 },
    { strings: [-1, -1, 0, 0, 0, 2], baseFret: 1 },
    { strings: [3, -1, 4, 4, 3, 2], baseFret: 1 },
    { strings: [3, 5, 4, 4, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 4, 4, 3, 3], baseFret: 1 },
    { strings: [-1, 10, 12, 11, 12, 10], baseFret: 10, barre: 10 },
  ],
  Gsus2: [
    { strings: [3, -1, 0, 2, 3, 3], baseFret: 1 },
    { strings: [3, -1, 0, 2, 3, -1], baseFret: 1 },
    { strings: [3, 0, 0, 0, 3, 3], baseFret: 1 },
    { strings: [3, -1, -1, 2, 3, 3], baseFret: 1 },
    { strings: [3, 5, 5, 2, 3, 3], baseFret: 2 },
    { strings: [3, 5, 5, 2, -1, -1], baseFret: 2 },
    { strings: [-1, -1, 5, 7, 8, 5], baseFret: 5, barre: 5 },
    { strings: [-1, 10, 12, 12, 10, 10], baseFret: 10, barre: 10 },
  ],
  Gsus4: [
    { strings: [3, 3, 0, 0, 1, 3], baseFret: 1 },
    { strings: [3, -1, 0, 0, 1, 3], baseFret: 1 },
    { strings: [3, -1, 0, 0, 1, -1], baseFret: 1 },
    { strings: [3, 5, 5, 5, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 5, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 7, 8, 8], baseFret: 5 },
    { strings: [-1, 10, 12, 12, 13, 10], baseFret: 10, barre: 10 },
  ],
  Gadd9: [
    { strings: [3, 2, 0, 2, 0, 3], baseFret: 1 },
    { strings: [3, -1, 0, 2, 0, 3], baseFret: 1 },
    { strings: [3, -1, 0, 2, 0, -1], baseFret: 1 },
    { strings: [3, 0, 0, 0, 0, 3], baseFret: 1 },
    { strings: [3, 5, 7, 4, 3, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 10, 12, 14, 12, 10], baseFret: 10, barre: 10 },
  ],
  Gdim: [
    { strings: [3, 4, 5, 3, -1, -1], baseFret: 3 },
  ],
  Gdim7: [
    { strings: [-1, 1, 2, 0, 2, -1], baseFret: 1 },
    { strings: [3, -1, 2, 3, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 2, 3, 2, 3], baseFret: 1 },
    { strings: [-1, 4, 5, 3, 5, -1], baseFret: 3 },
    { strings: [-1, -1, 5, 6, 5, 6], baseFret: 5, barre: 5 },
    { strings: [-1, 7, 8, 6, 8, -1], baseFret: 6 },
    { strings: [-1, -1, 8, 9, 8, 9], baseFret: 8, barre: 8 },
    { strings: [-1, 10, -1, 9, 11, 9], baseFret: 9, barre: 9 },
  ],
  Gaug: [
    { strings: [3, 2, 1, 0, 0, 3], baseFret: 1 },
    { strings: [3, 2, 1, 0, 0, -1], baseFret: 1 },
    { strings: [3, -1, 1, 0, 0, -1], baseFret: 1 },
    { strings: [3, -1, 5, 4, 4, 3], baseFret: 3, barre: 3 },
    { strings: [3, 6, 5, 4, -1, -1], baseFret: 3 },
    { strings: [3, -1, 5, 4, 4, -1], baseFret: 3 },
    { strings: [-1, -1, 5, 4, 4, 3], baseFret: 3 },
    { strings: [-1, 10, 9, 8, 8, 11], baseFret: 8, barre: 8 },
  ],
  G6: [
    { strings: [3, 2, 0, 0, 0, 0], baseFret: 1 },
    { strings: [3, -1, 2, 0, 0, 0], baseFret: 1 },
    { strings: [3, 5, 5, 4, 0, 0], baseFret: 3 },
    { strings: [3, -1, 5, 4, 0, 0], baseFret: 3 },
    { strings: [3, -1, 5, 4, 3, 0], baseFret: 3, barre: 3 },
    { strings: [3, 5, 5, 4, 5, 3], baseFret: 3, barre: 3 },
    { strings: [-1, -1, 5, 7, 5, 7], baseFret: 5, barre: 5 },
    { strings: [-1, 10, 14, 12, 12, 10], baseFret: 10, barre: 10 },
  ],
  Gm6: [
    { strings: [-1, 1, 2, 0, 3, -1], baseFret: 1 },
    { strings: [3, -1, 2, 3, 3, 3], baseFret: 1 },
    { strings: [3, -1, 2, 3, 3, -1], baseFret: 1 },
    { strings: [3, 5, 5, 3, 5, 3], baseFret: 3, barre: 3 },
    { strings: [-1, 5, 5, 3, 5, -1], baseFret: 3 },
    { strings: [-1, -1, 5, 7, 5, 6], baseFret: 5, barre: 5 },
    { strings: [-1, 10, 8, 9, 8, 10], baseFret: 8, barre: 8 },
    { strings: [-1, 10, 8, 9, 8, -1], baseFret: 8, barre: 8 },
  ],
  Gm7b5: [
    { strings: [-1, 1, 3, 0, 2, -1], baseFret: 1 },
    { strings: [-1, -1, 5, 3, 2, 1], baseFret: 1 },
    { strings: [3, -1, 3, 3, 2, -1], baseFret: 1 },
    { strings: [-1, 4, 5, 3, 6, -1], baseFret: 3 },
    { strings: [-1, -1, 5, 6, 6, 6], baseFret: 5 },
    { strings: [-1, 10, 8, 6, 6, 6], baseFret: 6, barre: 6 },
    { strings: [-1, -1, 8, 10, 8, 9], baseFret: 8, barre: 8 },
    { strings: [-1, 10, 11, 10, 11, -1], baseFret: 10, barre: 10 },
  ],
  G9: [
    { strings: [3, 2, 0, 2, 0, 1], baseFret: 1 },
  ],

  // ── G# / Ab ────────────────────────────────────────────────────────────────
  "G#": [
    { strings: [4, -1, 1, 1, 1, 4], baseFret: 1 },
    { strings: [-1, -1, 1, 1, 1, 4], baseFret: 1 },
    { strings: [4, 6, 6, 5, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 5, 4, 4], baseFret: 4 },
    { strings: [4, -1, 6, 5, 4, -1], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 8, 9, 8], baseFret: 6 },
    { strings: [-1, 11, 13, 13, 13, 11], baseFret: 11, barre: 11 },
    { strings: [-1, -1, 13, 13, 13, 11], baseFret: 11 },
  ],
  "G#m": [
    { strings: [-1, -1, 1, 1, 0, 4], baseFret: 1 },
    { strings: [4, 6, 6, 4, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 4, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 8, 9, 7], baseFret: 6 },
    { strings: [-1, -1, 9, 8, 9, 7], baseFret: 7 },
    { strings: [-1, 11, 13, 13, 12, 11], baseFret: 11, barre: 11 },
    { strings: [-1, 11, 13, 13, 12, -1], baseFret: 11 },
    { strings: [-1, -1, 13, 13, 12, 11], baseFret: 11 },
  ],
  "G#7": [
    { strings: [4, -1, 1, 1, 1, 2], baseFret: 1 },
    { strings: [-1, 3, 4, 1, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 1, 1, 1, 2], baseFret: 1 },
    { strings: [4, -1, -1, 5, 4, 2], baseFret: 2 },
    { strings: [-1, -1, 6, 5, 4, 2], baseFret: 2 },
    { strings: [4, 6, 4, 5, 4, 4], baseFret: 4, barre: 4 },
    { strings: [4, 6, 4, 5, 7, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 11, 13, 11, 13, 11], baseFret: 11, barre: 11 },
  ],
  "G#m7": [
    { strings: [-1, -1, 1, 1, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 1, 4, -1], baseFret: 1 },
    { strings: [4, -1, -1, 4, 4, 2], baseFret: 1 },
    { strings: [-1, -1, 6, 4, 4, 2], baseFret: 2 },
    { strings: [4, 6, 4, 4, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 6, 4, 7, -1], baseFret: 4 },
    { strings: [-1, 11, 9, 8, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, 11, 13, 11, 12, 11], baseFret: 11, barre: 11 },
  ],
  "G#maj7": [
    { strings: [-1, 3, 5, 1, 4, -1], baseFret: 1 },
    { strings: [-1, 3, -1, 1, 4, 3], baseFret: 1 },
    { strings: [-1, -1, 1, 1, 1, 3], baseFret: 1 },
    { strings: [4, -1, 5, 5, 4, 3], baseFret: 3 },
    { strings: [4, -1, 6, 5, 4, 3], baseFret: 3 },
    { strings: [-1, -1, 6, 5, 4, 3], baseFret: 3 },
    { strings: [4, 6, 5, 5, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 11, 13, 12, 13, 11], baseFret: 11, barre: 11 },
  ],
  "G#sus2": [
    { strings: [4, -1, 1, 3, 4, 4], baseFret: 1 },
    { strings: [4, -1, 1, 3, 4, -1], baseFret: 1 },
    { strings: [4, -1, -1, 3, 4, 4], baseFret: 1 },
    { strings: [4, 6, 6, 3, -1, -1], baseFret: 3 },
    { strings: [4, -1, 6, 3, 4, -1], baseFret: 3 },
    { strings: [-1, -1, 6, 8, 9, 6], baseFret: 6, barre: 6 },
    { strings: [-1, 11, 13, 13, 11, 11], baseFret: 11, barre: 11 },
    { strings: [-1, 11, 13, 13, 11, -1], baseFret: 11, barre: 11 },
  ],
  "G#sus4": [
    { strings: [4, -1, 1, 1, 2, 4], baseFret: 1 },
    { strings: [4, -1, 1, 1, 2, -1], baseFret: 1 },
    { strings: [4, 6, 6, 6, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 6, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 8, 9, 9], baseFret: 6 },
    { strings: [-1, 11, 13, 13, 14, 11], baseFret: 11, barre: 11 },
  ],
  "G#add9": [
    { strings: [4, -1, 1, 3, 1, 4], baseFret: 1 },
    { strings: [4, -1, 1, 3, 1, -1], baseFret: 1 },
    { strings: [4, 6, 8, 5, 4, 4], baseFret: 4, barre: 4 },
  ],
  "G#dim": [
    { strings: [4, 5, 6, 4, -1, -1], baseFret: 4 },
  ],
  "G#dim7": [
    { strings: [-1, -1, 0, 1, 0, 1], baseFret: 1 },
    { strings: [-1, 2, 3, 1, 3, -1], baseFret: 1 },
    { strings: [4, -1, 3, 4, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 3, 4, 3, 4], baseFret: 1 },
    { strings: [-1, 5, 6, 4, 6, -1], baseFret: 4 },
    { strings: [-1, -1, 6, 7, 6, 7], baseFret: 6, barre: 6 },
    { strings: [-1, 8, 9, 7, 9, -1], baseFret: 7 },
    { strings: [-1, -1, 9, 10, 9, 10], baseFret: 9, barre: 9 },
  ],
  "G#aug": [
    { strings: [4, 3, 2, 1, 1, -1], baseFret: 1 },
    { strings: [4, -1, 2, 1, 1, -1], baseFret: 1 },
    { strings: [4, -1, 6, 5, 5, 4], baseFret: 4, barre: 4 },
    { strings: [4, 7, 6, 5, -1, -1], baseFret: 4 },
    { strings: [4, -1, 6, 5, 5, -1], baseFret: 4 },
    { strings: [-1, -1, 6, 5, 5, 4], baseFret: 4 },
    { strings: [-1, -1, 6, 9, 9, 8], baseFret: 6 },
    { strings: [-1, 11, 10, 9, 9, 12], baseFret: 9, barre: 9 },
  ],
  "G#6": [
    { strings: [4, -1, 3, 1, 1, 1], baseFret: 1 },
    { strings: [4, -1, 3, 5, 4, -1], baseFret: 3 },
    { strings: [-1, -1, 3, 5, 4, 4], baseFret: 3 },
    { strings: [4, -1, 6, 5, 6, 4], baseFret: 4, barre: 4 },
    { strings: [4, -1, 6, 5, 6, -1], baseFret: 4 },
    { strings: [-1, -1, 6, 5, 6, 4], baseFret: 4 },
    { strings: [-1, 6, 6, 5, 6, -1], baseFret: 5 },
    { strings: [-1, -1, 6, 8, 6, 8], baseFret: 6, barre: 6 },
  ],
  "G#m6": [
    { strings: [-1, 2, 3, 1, 4, -1], baseFret: 1 },
    { strings: [4, -1, 3, 4, 4, 4], baseFret: 1 },
    { strings: [4, -1, 3, 4, 4, -1], baseFret: 1 },
    { strings: [-1, 6, 6, 4, 6, -1], baseFret: 4 },
    { strings: [-1, -1, 6, 8, 6, 7], baseFret: 6, barre: 6 },
    { strings: [-1, 11, 9, 10, 9, 11], baseFret: 9, barre: 9 },
    { strings: [-1, 11, 9, 10, 9, -1], baseFret: 9, barre: 9 },
    { strings: [-1, -1, 9, 10, 9, 11], baseFret: 9, barre: 9 },
  ],
  "G#m7b5": [
    { strings: [-1, -1, 0, 1, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 1, 3, -1], baseFret: 1 },
    { strings: [-1, -1, 6, 4, 3, 2], baseFret: 2 },
    { strings: [4, -1, 4, 4, 3, -1], baseFret: 1 },
    { strings: [-1, 5, 6, 4, 7, -1], baseFret: 4 },
    { strings: [-1, -1, 6, 7, 7, 7], baseFret: 6 },
    { strings: [-1, 11, 9, 7, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, -1, 9, 11, 9, 10], baseFret: 9, barre: 9 },
  ],
  "Ab": [
    { strings: [4, -1, 1, 1, 1, 4], baseFret: 1 },
    { strings: [-1, -1, 1, 1, 1, 4], baseFret: 1 },
    { strings: [4, 6, 6, 5, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 5, 4, 4], baseFret: 4 },
    { strings: [4, -1, 6, 5, 4, -1], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 8, 9, 8], baseFret: 6 },
    { strings: [-1, 11, 13, 13, 13, 11], baseFret: 11, barre: 11 },
    { strings: [-1, -1, 13, 13, 13, 11], baseFret: 11 },
  ],
  "Abm": [
    { strings: [-1, -1, 1, 1, 0, 4], baseFret: 1 },
    { strings: [4, 6, 6, 4, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 4, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 8, 9, 7], baseFret: 6 },
    { strings: [-1, -1, 9, 8, 9, 7], baseFret: 7 },
    { strings: [-1, 11, 13, 13, 12, 11], baseFret: 11, barre: 11 },
    { strings: [-1, 11, 13, 13, 12, -1], baseFret: 11 },
    { strings: [-1, -1, 13, 13, 12, 11], baseFret: 11 },
  ],
  "Ab7": [
    { strings: [4, -1, 1, 1, 1, 2], baseFret: 1 },
    { strings: [-1, 3, 4, 1, 4, -1], baseFret: 1 },
    { strings: [-1, -1, 1, 1, 1, 2], baseFret: 1 },
    { strings: [4, -1, -1, 5, 4, 2], baseFret: 2 },
    { strings: [-1, -1, 6, 5, 4, 2], baseFret: 2 },
    { strings: [4, 6, 4, 5, 4, 4], baseFret: 4, barre: 4 },
    { strings: [4, 6, 4, 5, 7, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 11, 13, 11, 13, 11], baseFret: 11, barre: 11 },
  ],
  "Abm7": [
    { strings: [-1, -1, 1, 1, 0, 2], baseFret: 1 },
    { strings: [-1, 2, 4, 1, 4, -1], baseFret: 1 },
    { strings: [4, -1, -1, 4, 4, 2], baseFret: 1 },
    { strings: [-1, -1, 6, 4, 4, 2], baseFret: 2 },
    { strings: [4, 6, 4, 4, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 6, 6, 4, 7, -1], baseFret: 4 },
    { strings: [-1, 11, 9, 8, 7, 7], baseFret: 7, barre: 7 },
    { strings: [-1, 11, 13, 11, 12, 11], baseFret: 11, barre: 11 },
  ],
  "Abmaj7": [
    { strings: [-1, 3, 5, 1, 4, -1], baseFret: 1 },
    { strings: [-1, 3, -1, 1, 4, 3], baseFret: 1 },
    { strings: [-1, -1, 1, 1, 1, 3], baseFret: 1 },
    { strings: [4, -1, 5, 5, 4, 3], baseFret: 3 },
    { strings: [4, -1, 6, 5, 4, 3], baseFret: 3 },
    { strings: [-1, -1, 6, 5, 4, 3], baseFret: 3 },
    { strings: [4, 6, 5, 5, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, 11, 13, 12, 13, 11], baseFret: 11, barre: 11 },
  ],
  "Absus4": [
    { strings: [4, -1, 1, 1, 2, 4], baseFret: 1 },
    { strings: [4, -1, 1, 1, 2, -1], baseFret: 1 },
    { strings: [4, 6, 6, 6, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 6, 4, 4], baseFret: 4, barre: 4 },
    { strings: [-1, -1, 6, 8, 9, 9], baseFret: 6 },
    { strings: [-1, 11, 13, 13, 14, 11], baseFret: 11, barre: 11 },
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
  fontSize = 10,
}: {
  chordName: string;
  total: number;
  idx: number;
  setVoicingIdx: VoicingState["setVoicingIdx"];
  fontSize?: number;
}) {
  if (total <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
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
