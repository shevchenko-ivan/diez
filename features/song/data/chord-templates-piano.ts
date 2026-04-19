import { NOTES, FLAT_TO_SHARP } from "./chord-templates";

// Piano chord = a set of semitones measured from C4 (MIDI 60 = 0 here).
// Voicings start with the root in the first octave, so the root is always 0–11
// and added intervals (e.g. 9ths) can extend into the next octave (up to ~24).
export type PianoChordDef = { notes: number[] };

// Semitone intervals from the chord root for each suffix.
const INTERVALS: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  mmaj7: [0, 3, 7, 11],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  "9": [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  aug: [0, 4, 8],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  "m7b5": [0, 3, 6, 10],
};

function normalize(chord: string): string {
  const m = chord.match(/^([A-G])(b|#)?(.*)$/);
  if (!m) return chord;
  const root = m[1] + (m[2] ?? "");
  const sharpRoot = FLAT_TO_SHARP[root] ?? root;
  return sharpRoot + m[3];
}

export function lookupChordPiano(chord: string): PianoChordDef[] | null {
  const normalized = normalize(chord);
  const m = normalized.match(/^([A-G]#?)(.*)$/);
  if (!m) return null;
  const [, root, suffix] = m;
  const intervals = INTERVALS[suffix];
  if (!intervals) return null;
  const rootIdx = NOTES.indexOf(root as typeof NOTES[number]);
  if (rootIdx < 0) return null;
  const notes = intervals.map((iv) => rootIdx + iv);
  return [{ notes }];
}
