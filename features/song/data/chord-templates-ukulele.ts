import { NOTES, FLAT_TO_SHARP, type ChordDef } from "./chord-templates";

// Ukulele standard tuning (high-G / re-entrant): G4, C4, E4, A4.
export const UKE_OPEN_FREQS = [391.995, 261.626, 329.628, 440.0];

// C-rooted voicing templates. Keys are chord suffixes ("" = major triad).
// strings are [G, C, E, A], -1 = muted, 0 = open, 1+ = fret number.
const TEMPLATES_C: Record<string, number[]> = {
  "": [0, 0, 0, 3],
  m: [0, 3, 3, 3],
  "7": [0, 0, 0, 1],
  maj7: [0, 0, 0, 2],
  m7: [3, 3, 3, 3],
  "6": [0, 0, 0, 0],
  m6: [2, 3, 3, 3],
  sus2: [0, 2, 3, 3],
  sus4: [0, 0, 1, 3],
  add9: [0, 2, 0, 3],
  "9": [0, 2, 0, 1],
  aug: [1, 0, 0, 3],
  dim: [-1, 3, 2, 3],
  dim7: [-1, 3, 2, 3],
};

// Hand-picked open/near-nut voicings. These win over transposition because
// they're the shapes players actually learn first on ukulele.
const OVERRIDES: Record<string, ChordDef> = {
  // Major triads
  C: { strings: [0, 0, 0, 3], baseFret: 1 },
  "C#": { strings: [1, 1, 1, 4], baseFret: 1, barre: 1 },
  D: { strings: [2, 2, 2, 0], baseFret: 1 },
  "D#": { strings: [0, 3, 3, 1], baseFret: 1 },
  E: { strings: [1, 4, 0, 2], baseFret: 1 },
  F: { strings: [2, 0, 1, 0], baseFret: 1 },
  "F#": { strings: [3, 1, 2, 1], baseFret: 1 },
  G: { strings: [0, 2, 3, 2], baseFret: 1 },
  "G#": { strings: [5, 3, 4, 3], baseFret: 3 },
  A: { strings: [2, 1, 0, 0], baseFret: 1 },
  "A#": { strings: [3, 2, 1, 1], baseFret: 1, barre: 1 },
  B: { strings: [4, 3, 2, 2], baseFret: 1, barre: 2 },

  // Minor triads
  Cm: { strings: [0, 3, 3, 3], baseFret: 1 },
  "C#m": { strings: [1, 1, 0, 4], baseFret: 1 },
  Dm: { strings: [2, 2, 1, 0], baseFret: 1 },
  "D#m": { strings: [3, 3, 2, 1], baseFret: 1 },
  Em: { strings: [0, 4, 3, 2], baseFret: 1 },
  Fm: { strings: [1, 0, 1, 3], baseFret: 1 },
  "F#m": { strings: [2, 1, 2, 0], baseFret: 1 },
  Gm: { strings: [0, 2, 3, 1], baseFret: 1 },
  "G#m": { strings: [1, 3, 4, 2], baseFret: 1 },
  Am: { strings: [2, 0, 0, 0], baseFret: 1 },
  "A#m": { strings: [3, 1, 1, 1], baseFret: 1, barre: 1 },
  Bm: { strings: [4, 2, 2, 2], baseFret: 1, barre: 2 },

  // Dominant 7ths
  C7: { strings: [0, 0, 0, 1], baseFret: 1 },
  D7: { strings: [2, 2, 2, 3], baseFret: 1 },
  E7: { strings: [1, 2, 0, 2], baseFret: 1 },
  F7: { strings: [2, 3, 1, 3], baseFret: 1 },
  G7: { strings: [0, 2, 1, 2], baseFret: 1 },
  A7: { strings: [0, 1, 0, 0], baseFret: 1 },
  B7: { strings: [2, 3, 2, 2], baseFret: 1 },
  "A#7": { strings: [3, 2, 1, 3], baseFret: 1 },

  // Minor 7ths
  Am7: { strings: [0, 0, 0, 0], baseFret: 1 },
  Dm7: { strings: [2, 2, 1, 3], baseFret: 1 },
  Em7: { strings: [0, 2, 0, 2], baseFret: 1 },
  Gm7: { strings: [0, 2, 1, 1], baseFret: 1 },
  Cm7: { strings: [3, 3, 3, 3], baseFret: 1, barre: 3 },
  Bm7: { strings: [2, 2, 2, 2], baseFret: 1, barre: 2 },
  Fm7: { strings: [1, 3, 1, 3], baseFret: 1 },

  // Major 7ths
  Cmaj7: { strings: [0, 0, 0, 2], baseFret: 1 },
  Dmaj7: { strings: [2, 2, 2, 4], baseFret: 1 },
  Fmaj7: { strings: [2, 4, 1, 0], baseFret: 1 },
  Gmaj7: { strings: [0, 2, 2, 2], baseFret: 1 },
  Amaj7: { strings: [1, 1, 0, 0], baseFret: 1 },
  Emaj7: { strings: [1, 3, 0, 2], baseFret: 1 },
};

function normalizeName(chord: string): string {
  const m = chord.match(/^([A-G])(b|#)?(.*)$/);
  if (!m) return chord;
  const root = m[1] + (m[2] ?? "");
  const sharpRoot = FLAT_TO_SHARP[root] ?? root;
  return sharpRoot + m[3];
}

function parseChord(chord: string): { root: string; suffix: string } | null {
  const m = chord.match(/^([A-G]#?)(.*)$/);
  if (!m) return null;
  return { root: m[1], suffix: m[2] };
}

function fitBaseFret(strings: number[]): { strings: number[]; baseFret: number } {
  const fretted = strings.filter((f) => f > 0);
  if (fretted.length === 0) return { strings, baseFret: 1 };
  const maxF = Math.max(...fretted);
  if (maxF <= 4) return { strings, baseFret: 1 };
  // If all fretted notes sit in a 4-fret window and there are no open
  // strings to anchor to the nut, shift the diagram up to show the position.
  const hasOpen = strings.some((f) => f === 0);
  if (hasOpen) return { strings, baseFret: 1 };
  const minF = Math.min(...fretted);
  return { strings, baseFret: minF };
}

export function lookupChordUke(chord: string): ChordDef[] | null {
  const normalized = normalizeName(chord);
  const override = OVERRIDES[normalized];
  if (override) return [override];

  const parsed = parseChord(normalized);
  if (!parsed) return null;
  const tmpl = TEMPLATES_C[parsed.suffix];
  if (!tmpl) return null;

  const rootIdx = NOTES.indexOf(parsed.root as typeof NOTES[number]);
  if (rootIdx < 0) return null;

  // Transpose the C-rooted template: shift every non-muted fret by the root distance.
  const delta = rootIdx; // C is index 0
  const strings = tmpl.map((f) => (f === -1 ? -1 : f + delta));
  return [fitBaseFret(strings)];
}
