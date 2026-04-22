// ─── Chord Template Engine ───────────────────────────────────────────────────
// 306 templates + 30 overrides → generates full CHORD_DB for all keys
// Replaces 1874 lines of hardcoded data with ~400 lines of templates

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChordDef = {
  strings: number[]; // 6 values [low E, A, D, G, B, high E], -1=muted, 0=open, 1+=fret
  baseFret: number;  // first fret shown (1 = nut position)
  barre?: number;    // fret where full barre is applied
};

// ─── Music Theory Constants ──────────────────────────────────────────────────

export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
};

export const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb",
};

// Standard tuning: semitones from C for each open string [E, A, D, G, B, E]
const OPEN_STRINGS = [4, 9, 2, 7, 11, 4];

// Allowed pitch classes (relative to root) for each chord quality. Used to
// filter out template entries whose sounding notes don't actually belong to
// the chord — a handful of templates in the list were typos (e.g. major's
// [-1,15,14,10,13,10] generates F and D on top of a C root) and would leak
// bogus voicings into the database, especially via the -12 transpose where
// a wrong note on a high fret becomes a wrong open string further down.
const QUALITY_PCS: Record<string, Set<number>> = {
  major:    new Set([0, 4, 7]),
  m:        new Set([0, 3, 7]),
  dim:      new Set([0, 3, 6]),
  aug:      new Set([0, 4, 8]),
  sus2:     new Set([0, 2, 7]),
  sus4:     new Set([0, 5, 7]),
  "6":      new Set([0, 4, 7, 9]),
  m6:       new Set([0, 3, 7, 9]),
  "7":      new Set([0, 4, 7, 10]),
  m7:       new Set([0, 3, 7, 10]),
  maj7:     new Set([0, 4, 7, 11]),
  dim7:     new Set([0, 3, 6, 9]),
  m7b5:     new Set([0, 3, 6, 10]),
  "9":      new Set([0, 4, 7, 10, 2]),
  add9:     new Set([0, 4, 7, 2]),
  // Extended / altered qualities. These are typically voiced with omitted
  // tones on guitar (the 5th is the first to go), so the allowed PC set is
  // the full chord spelling — any subset that forms the shape is accepted.
  mMaj7:    new Set([0, 3, 7, 11]),
  aug7:     new Set([0, 4, 8, 10]),
  "7#5":    new Set([0, 4, 8, 10]),
  "7b5":    new Set([0, 4, 6, 10]),
  "7b9":    new Set([0, 4, 7, 10, 1]),
  "7#9":    new Set([0, 4, 7, 10, 3]),
  "7#11":   new Set([0, 4, 7, 10, 6]),
  "maj7#11":new Set([0, 4, 7, 11, 6]),
  add11:    new Set([0, 4, 7, 5]),
  maj9:     new Set([0, 4, 7, 11, 2]),
  maj13:    new Set([0, 4, 7, 11, 2, 9]),
  m9:       new Set([0, 3, 7, 10, 2]),
  m11:      new Set([0, 3, 7, 10, 2, 5]),
  "13":     new Set([0, 4, 7, 10, 2, 9]),
  "13sus4": new Set([0, 5, 7, 10, 2, 9]),
  "7sus4":  new Set([0, 5, 7, 10]),
  "9sus4":  new Set([0, 5, 7, 10, 2]),
};

function shapeNotesMatchQuality(shape: number[], quality: string): boolean {
  const allowed = QUALITY_PCS[quality];
  if (!allowed) return true; // unknown quality — don't filter
  for (let i = 0; i < shape.length; i++) {
    const f = shape[i];
    if (f < 0) continue;
    const pc = (OPEN_STRINGS[i] + f) % 12;
    if (!allowed.has(pc)) return false;
  }
  return true;
}

function semi(from: string, to: string): number {
  return (NOTES.indexOf(to as typeof NOTES[number]) - NOTES.indexOf(from as typeof NOTES[number]) + 12) % 12;
}

// ─── Templates ───────────────────────────────────────────────────────────────
// Each template is a voicing shape relative to C root.
// Transposed to all 12 keys to generate the full chord database.
// Format: [lowE, A, D, G, B, highE] — -1=muted, 0=open, 1+=fret

const TEMPLATES: Record<string, number[][]> = {
  "6": [
    [-1,0,2,0,1,-1],[-1,3,2,2,1,-1],[-1,3,2,2,1,0],[-1,3,5,2,5,-1],
    [-1,3,-1,2,5,3],[-1,3,5,5,5,5],[-1,3,7,5,5,5],[-1,3,7,5,5,3],
    [-1,3,7,5,5,-1],[-1,3,-1,5,5,5],[8,-1,7,5,5,5],[8,7,5,5,5,5],
    [8,10,10,9,5,5],[8,-1,10,9,5,5],[8,-1,10,9,8,5],[8,-1,7,9,8,-1],
    [-1,-1,7,9,8,8],[8,10,10,9,10,8],[8,-1,10,9,10,8],[8,-1,10,9,10,-1],
    [-1,-1,10,9,10,8],[8,-1,10,12,10,12],[-1,10,10,9,10,-1],[-1,-1,10,12,10,12],
  ],
  "7": [
    [-1,3,2,3,1,3],[-1,-1,2,3,1,1],[-1,-1,2,3,1,3],[-1,3,2,3,1,0],
    [-1,1,2,0,1,-1],[-1,-1,2,3,1,0],[-1,-1,2,3,1,-1],[-1,3,2,3,5,3],
    [-1,3,5,3,5,3],[-1,3,5,5,5,6],[-1,3,5,3,5,6],[8,-1,5,5,5,6],
    [-1,-1,5,5,5,6],[-1,7,8,5,8,-1],[8,7,5,5,5,6],[8,7,8,5,5,6],
    [8,-1,-1,9,8,6],[-1,-1,10,9,8,6],[8,10,8,9,8,8],[8,10,8,9,11,8],
    [8,10,10,9,11,8],[-1,-1,8,9,8,8],[8,15,14,15,13,8],[-1,-1,14,15,13,8],
    [-1,-1,10,9,11,8],[-1,10,10,9,11,-1],[-1,-1,14,15,13,9],[-1,-1,10,12,11,12],
    [-1,-1,14,15,13,10],
  ],
  "9": [
    [-1,3,2,3,3,0],[-1,3,5,7,5,6],[8,7,5,7,5,6],[8,10,8,9,8,10],
    [-1,-1,10,12,11,10],
  ],
  add9: [
    [-1,3,2,1,3,1],[-1,3,2,1,3,-1],[-1,3,-1,1,3,1],[-1,3,2,2,3,2],
    [-1,3,2,2,3,-1],[-1,3,-1,2,3,2],[-1,3,2,0,3,0],[-1,3,2,0,3,3],
    [-1,3,2,0,3,-1],[-1,3,2,-1,3,-1],[-1,3,-1,3,3,3],[-1,3,5,7,5,3],
    [-1,3,5,7,5,8],[8,10,10,9,3,3],[8,-1,10,9,3,3],[-1,3,-1,0,3,0],
    [-1,3,-1,-1,3,-1],[8,-1,5,7,5,8],[8,-1,5,7,5,-1],[8,7,5,7,5,8],
    [8,5,5,5,5,8],[8,7,10,9,8,8],[8,10,10,9,8,10],[8,10,12,9,8,8],
    [-1,-1,10,9,8,10],[-1,15,14,9,15,9],[-1,15,14,9,15,-1],
    [-1,15,14,12,13,10],[-1,15,14,10,15,10],[-1,15,14,10,15,-1],
    [-1,15,-1,10,15,10],
  ],
  aug: [
    [-1,3,2,1,1,4],[-1,3,2,1,1,-1],[-1,-1,2,1,1,1],[-1,3,2,1,1,0],
    [-1,-1,2,1,1,0],[-1,-1,2,1,1,-1],[-1,3,6,5,5,4],[-1,3,-1,5,5,4],
    [-1,3,6,5,5,8],[-1,3,6,5,5,-1],[-1,3,10,9,9,8],[8,7,6,5,5,-1],
    [8,-1,6,5,5,-1],[8,7,6,5,5,8],[8,-1,10,9,9,8],[8,11,10,9,-1,-1],
    [8,-1,10,9,9,-1],[8,11,10,9,9,8],[-1,-1,10,9,9,8],[8,-1,14,13,13,12],
    [8,15,14,13,13,-1],[-1,-1,14,13,13,9],[-1,-1,10,13,13,12],[-1,-1,14,13,13,10],
  ],
  dim: [
    [-1,3,4,5,4,-1],[8,9,10,8,-1,-1],[-1,-1,10,11,13,11],
  ],
  dim7: [
    [-1,-1,1,2,1,2],[-1,0,1,-1,1,-1],[-1,3,4,2,4,-1],[-1,3,-1,2,4,2],
    [-1,3,4,5,4,5],[-1,3,7,8,7,8],[-1,-1,4,5,4,5],[-1,6,7,5,7,-1],
    [8,-1,7,8,7,-1],[-1,-1,7,8,7,8],[-1,9,10,8,10,-1],[8,-1,10,11,10,11],
    [8,-1,13,14,13,14],[-1,-1,10,11,10,11],
  ],
  m: [
    [-1,-1,1,0,1,-1],[-1,3,5,5,4,3],[-1,3,1,0,1,-1],[-1,3,1,5,4,3],
    [-1,6,5,5,4,3],[-1,3,5,5,4,-1],[-1,-1,5,5,4,3],[-1,3,10,8,8,8],
    [-1,-1,5,5,4,8],[8,6,5,5,8,8],[-1,-1,5,8,8,8],[8,10,10,8,8,8],
    [-1,-1,10,8,8,8],[8,10,10,8,8,11],[-1,-1,10,12,13,11],[-1,-1,13,12,13,11],
  ],
  m6: [
    [-1,3,1,2,1,3],[-1,3,1,2,1,-1],[-1,-1,1,2,1,3],[-1,3,5,2,4,-1],
    [-1,3,-1,2,4,3],[-1,3,5,5,4,5],[-1,3,7,5,4,3],[-1,3,-1,5,4,5],
    [-1,3,7,8,8,8],[-1,3,10,8,10,3],[-1,6,7,5,8,-1],[8,-1,7,8,8,8],
    [8,-1,7,8,8,-1],[8,10,10,8,10,8],[8,-1,10,8,10,8],[-1,10,10,8,10,-1],
    [8,-1,13,12,10,8],[8,12,13,12,13,8],[-1,-1,10,12,10,11],
  ],
  m7: [
    [-1,3,1,3,1,3],[-1,3,1,3,4,3],[-1,3,1,3,1,-1],[-1,-1,1,3,1,3],
    [-1,3,1,0,-1,-1],[-1,3,5,3,4,3],[-1,3,5,3,4,6],[-1,3,5,5,4,6],
    [-1,3,8,8,8,6],[-1,3,5,0,4,6],[-1,3,5,5,-1,-1],[-1,3,5,3,-1,-1],
    [-1,-1,5,5,4,6],[-1,6,8,5,8,-1],[8,6,8,5,8,-1],[8,-1,-1,8,8,6],
    [-1,-1,10,8,8,6],[8,10,8,8,8,8],[8,10,10,8,11,8],[8,10,8,8,11,8],
    [8,10,-1,8,11,8],[-1,10,10,8,11,-1],[8,-1,13,12,11,8],[-1,-1,8,8,8,8],
    [-1,-1,10,12,11,11],
  ],
  m7b5: [
    [-1,-1,1,3,1,2],[-1,3,1,-1,-1,-1],[-1,3,-1,3,4,2],[-1,3,4,3,4,-1],
    [-1,3,4,-1,-1,-1],[-1,3,4,3,-1,-1],[-1,-1,4,5,4,6],[-1,6,8,5,7,-1],
    [-1,-1,10,8,7,6],[8,-1,8,8,7,-1],[-1,9,10,8,11,-1],[-1,-1,10,11,11,11],
  ],
  maj7: [
    [-1,3,2,1,1,1],[-1,-1,2,4,1,3],[-1,3,2,2,2,2],[-1,3,2,0,0,0],
    [-1,3,2,-1,-1,-1],[-1,3,5,4,5,3],[-1,3,5,4,5,7],[-1,3,5,5,5,7],
    [-1,3,10,9,8,7],[8,-1,9,9,8,3],[-1,3,5,4,5,-1],[-1,3,5,5,0,0],
    [-1,3,5,4,5,0],[-1,3,5,4,0,0],[-1,-1,5,5,5,7],[-1,7,-1,5,8,7],
    [8,7,5,5,5,7],[-1,7,9,5,8,-1],[8,-1,9,9,8,7],[8,-1,10,9,8,7],
    [8,7,10,9,8,7],[-1,-1,10,9,8,7],[8,10,9,9,8,8],[-1,-1,9,9,8,8],
    [8,10,9,9,8,12],[8,-1,10,12,12,12],[8,15,14,12,12,12],[-1,-1,14,16,13,15],
    [-1,10,10,9,12,-1],[-1,15,14,9,9,9],[-1,-1,10,12,12,12],[-1,15,14,10,10,10],
  ],
  major: [
    // NOTE: [-1,3,2,1,1,1] and variants removed — G string fret 1 = G# (wrong for major)
    // NOTE: [-1,-1,5,5,5,8] removed — produces sparse 4-string voicing (x,x,D,G,B,e only)
    [-1,3,2,0,1,0],
    [-1,3,2,0,1,3],[-1,3,-1,0,1,0],[-1,3,2,-1,1,-1],
    // NOTE: [-1,-1,2,0,1,0] removed — generates C/E inversion (E bass, not root)
    [-1,3,-1,-1,1,-1],[-1,-1,2,-1,1,-1],[-1,3,5,5,5,3],[-1,3,5,5,5,8],
    [-1,-1,5,5,5,3],[-1,3,5,-1,5,-1],[8,-1,5,5,5,8],[8,7,5,5,5,8],[8,7,5,5,5,-1],[8,7,5,5,8,8],[8,10,10,9,8,8],
    [8,-1,10,9,8,-1],[-1,-1,10,9,8,8],[8,10,10,12,13,12],[8,15,14,12,13,12],
    [8,15,14,12,13,8],[-1,15,14,9,13,9],[-1,15,-1,9,13,9],[-1,-1,14,9,13,9],
    [-1,-1,10,12,13,12],[-1,15,14,10,13,10],[-1,-1,14,10,13,10],[-1,15,-1,10,13,10],
  ],
  sus2: [
    [-1,3,-1,1,3,3],[-1,3,3,0,1,3],[-1,3,-1,2,3,3],[-1,3,-1,3,3,3],
    [-1,3,5,5,3,3],[-1,3,5,7,3,3],[-1,3,5,5,3,-1],[-1,3,-1,0,3,3],
    [-1,3,-1,-1,3,3],[8,-1,5,7,8,8],[8,-1,5,7,8,-1],[8,5,5,5,8,8],
    [8,10,10,7,8,8],[8,-1,-1,7,8,8],[8,10,10,7,-1,-1],[8,-1,10,7,8,-1],
    [-1,-1,10,7,8,8],[8,10,12,12,8,8],[-1,-1,10,12,13,10],[-1,15,-1,10,15,15],
  ],
  sus4: [
    [-1,3,5,5,1,1],[-1,3,3,1,1,-1],[-1,3,3,0,1,1],[-1,3,3,0,1,-1],
    [-1,3,3,-1,1,-1],[-1,3,5,5,6,3],[-1,3,3,5,6,3],[-1,3,10,10,8,3],
    [8,-1,5,5,6,8],[8,-1,5,5,6,-1],[8,8,5,5,6,8],[8,10,10,10,8,8],
    [-1,-1,10,10,8,8],[8,8,10,10,8,8],[8,-1,10,10,8,8],[8,-1,15,12,13,8],
    [-1,15,15,8,13,-1],[-1,15,15,9,13,-1],[-1,-1,10,12,13,13],[-1,15,15,10,13,-1],
  ],
  // ─── Extended / altered qualities ───────────────────────────────────────
  // Each shape is C-rooted. Transposer adds ±offset to reach all 12 roots.
  mMaj7: [
    [-1,3,1,0,0,3],[-1,3,5,4,4,3],[-1,-1,5,4,4,3],
    [8,10,9,8,8,-1],[8,-1,9,8,8,-1],
  ],
  aug7: [
    [-1,3,2,3,1,4],[4,3,2,3,-1,-1],[-1,-1,2,3,1,4],
    [8,-1,8,9,9,-1],
  ],
  "7#5": [
    [-1,3,2,3,1,4],[4,3,2,3,-1,-1],[-1,-1,2,3,1,4],
    [8,-1,8,9,9,-1],
  ],
  "7b5": [
    [-1,3,2,3,1,2],[-1,3,2,3,-1,2],[-1,-1,2,3,1,2],
    [-1,3,4,3,-1,2],
  ],
  "7b9": [
    [-1,3,2,3,2,3],[-1,3,2,3,2,0],[-1,-1,2,3,2,3],
    [8,-1,8,9,8,9],
  ],
  "7#9": [
    [-1,3,2,3,4,3],[-1,3,2,3,4,-1],[-1,-1,2,3,4,3],
    [-1,-1,2,3,4,-1],
  ],
  // 7#11 and 7b5 share voicings on guitar — the natural 5th is almost always
  // omitted, leaving C E Bb F# for both. Keeping separate entries so lookup
  // still succeeds for users who spell it either way.
  "7#11": [
    [-1,3,2,3,1,2],[-1,3,2,3,-1,2],[-1,-1,2,3,1,2],
  ],
  "maj7#11": [
    [-1,3,2,0,0,2],[-1,3,2,4,4,2],[8,-1,9,9,7,7],
  ],
  add11: [
    [-1,3,2,0,1,1],[-1,3,3,0,1,3],[-1,-1,2,0,1,1],
    [8,-1,10,10,8,8],
  ],
  maj9: [
    [-1,3,2,4,3,0],[-1,3,0,0,0,0],[-1,3,5,4,3,-1],
    [8,-1,9,9,10,10],
  ],
  maj13: [
    [-1,3,2,4,5,5],[-1,3,2,4,3,5],[8,-1,9,9,10,12],
  ],
  m9: [
    [-1,3,1,3,3,3],[-1,3,5,3,3,3],[8,-1,8,8,8,10],
  ],
  m11: [
    [-1,3,1,3,3,1],[-1,3,1,3,4,1],[8,-1,8,10,11,11],
  ],
  "13": [
    [-1,3,2,3,5,5],[-1,3,2,3,3,5],[8,-1,8,9,10,10],
  ],
  "13sus4": [
    [-1,3,3,3,3,5],[-1,3,3,3,6,5],
  ],
  "7sus4": [
    [-1,3,3,3,1,1],[-1,3,3,3,1,3],[-1,-1,3,3,1,1],
    [8,10,8,10,11,-1],[8,-1,8,10,11,-1],
  ],
  "9sus4": [
    [-1,3,3,3,3,3],[-1,3,3,0,3,3],[-1,-1,3,3,3,3],
  ],
};

// Voicings that can't be derived from C-root templates (open string shapes)
const OVERRIDES: Record<string, number[][]> = {
  "A#": [[-1,1,3,-1,3,-1]],
  "B": [[-1,2,4,-1,4,-1]],
  "C#": [[-1,4,3,0,2,0],[-1,4,-1,0,2,0],[-1,-1,3,0,2,0]],
  "C#7": [[-1,-1,3,4,2,0]],
  "C#add9": [[-1,4,3,0,4,0],[-1,4,3,0,4,-1],[-1,4,-1,0,4,0]],
  "C#aug": [[-1,-1,3,2,2,0]],
  "C#dim7": [[-1,1,2,0,2,-1]],
  "C#m": [[-1,4,2,1,2,0]],
  "C#m7": [[-1,4,2,1,0,0],[-1,4,2,1,0,-1],[-1,4,6,6,0,0],[-1,4,6,4,0,0]],
  "C#m7b5": [[-1,4,2,0,0,0],[-1,4,5,0,0,0],[-1,4,5,4,0,0]],
  "C#maj7": [[-1,4,3,0,0,0]],
  "C#sus2": [[-1,4,-1,0,4,4]],
  "C#sus4": [[-1,4,4,0,2,-1]],
  "D#dim7": [[-1,3,4,2,4,-1]],
  "Ddim7": [[-1,2,3,1,3,-1]],
  "Edim7": [[-1,4,5,3,5,-1]],
  "Emaj7": [[0,-1,6,8,5,7]],
  "F#dim7": [[-1,6,7,5,7,-1]],
  "Fdim7": [[-1,5,6,4,6,-1]],
  "G#dim7": [[-1,8,9,7,9,-1]],
  "Gdim7": [[-1,7,8,6,8,-1]],
  // Power chords (root + 5th + octave root). Only three strings sound.
  "C5":  [[-1,3,5,5,-1,-1]],
  "C#5": [[-1,4,6,6,-1,-1]],
  "Db5": [[-1,4,6,6,-1,-1]],
  "D5":  [[-1,5,7,7,-1,-1]],
  "D#5": [[-1,6,8,8,-1,-1]],
  "Eb5": [[-1,6,8,8,-1,-1]],
  "E5":  [[0,2,2,-1,-1,-1]],
  "F5":  [[1,3,3,-1,-1,-1]],
  "F#5": [[2,4,4,-1,-1,-1]],
  "Gb5": [[2,4,4,-1,-1,-1]],
  "G5":  [[3,5,5,-1,-1,-1]],
  "G#5": [[4,6,6,-1,-1,-1]],
  "Ab5": [[4,6,6,-1,-1,-1]],
  "A5":  [[-1,0,2,2,-1,-1]],
  "A#5": [[-1,1,3,3,-1,-1]],
  "Bb5": [[-1,1,3,3,-1,-1]],
  "B5":  [[-1,2,4,4,-1,-1]],
};

// ─── Generation Engine ───────────────────────────────────────────────────────

function isValidVoicing(strings: number[]): boolean {
  if (strings.some(f => f < -1)) return false;
  const sounding = strings.filter(f => f >= 0).length;
  if (sounding < 4) return false;
  const played = strings.filter(f => f > 0);
  if (played.length > 0) {
    const span = Math.max(...played) - Math.min(...played);
    if (span > 3) return false;
  }
  const hasOpen = strings.some(f => f === 0);
  if (hasOpen && played.length > 0 && Math.max(...played) > 7) return false;
  return true;
}

function makeChordDef(strings: number[]): ChordDef {
  const played = strings.filter(f => f > 0);
  const minPlayed = played.length > 0 ? Math.min(...played) : 1;
  // When any string rings open, the nut (fret 0) is part of the shape — always
  // render starting at fret 1 so the nut is visible. Without this, open-chord
  // shapes like Em [0,2,2,0,0,0] would start at fret 2 and the open strings
  // would lose their visual anchor.
  const hasOpen = strings.some(f => f === 0);
  const baseFret = hasOpen ? 1 : minPlayed;

  let barre: number | undefined;
  if (played.length > 0) {
    // Barre: 2+ strings at baseFret, AND every string in between is fretted (not open/muted).
    // This correctly handles A-shape barres (index covers strings 1–5 even though middle
    // strings are fretted higher by other fingers) while rejecting non-adjacent same-fret
    // placements like [3,x,0,0,0,3] where the gap contains muted/open strings.
    const barrePositions = strings
      .map((f, i) => (f === baseFret ? i : -1))
      .filter(i => i >= 0);
    if (barrePositions.length >= 2) {
      const minPos = barrePositions[0];
      const maxPos = barrePositions[barrePositions.length - 1];
      const spanAllFretted = strings.slice(minPos, maxPos + 1).every(f => f >= baseFret);
      // A barre implies the index finger covers strings from the low-E side,
      // so open strings below the barre break the shape (e.g. A x02220, D xx0232
      // are three separate dots, not a barre even though strings at baseFret are adjacent).
      const noOpenBelow = strings.slice(0, minPos).every(f => f === -1);
      if (spanAllFretted && noOpenBelow) barre = baseFret;
    }
  }

  return barre !== undefined
    ? { strings, baseFret, barre }
    : { strings, baseFret };
}

// Difficulty = finger count + stretch + position penalty + sandwiched-mute penalty.
// A barre chord counts as 1 finger (index) + extra fingers above it,
// so a clean barre shape scores lower than 4 independently placed fingers.
// Position penalty (0.3/fret) keeps low-position voicings preferred over high-position
// ones with the same finger count (e.g. F at fret 1 over F at fret 8).
// Sandwiched mutes (+3 each) penalise voicings where a string must be actively muted
// between two sounding strings — harder to play cleanly.
export function voicingDifficulty(def: ChordDef): number {
  const { strings, baseFret, barre } = def;
  const played = strings.filter(f => f > 0);
  if (played.length === 0) return 0;

  let fingerCount: number;
  let stretch: number;

  if (barre) {
    const extraFrets = [...new Set(played.filter(f => f > barre))];
    fingerCount = 1 + extraFrets.length; // barre finger + individual fingers above
    stretch = extraFrets.length > 0 ? Math.max(...extraFrets) - barre : 0;
  } else {
    fingerCount = new Set(played).size;
    stretch = Math.max(...played) - Math.min(...played);
  }

  // Count muted strings sandwiched between sounding strings (require active muting)
  const firstSounding = strings.findIndex(f => f >= 0);
  const lastSounding = strings.length - 1 - [...strings].reverse().findIndex(f => f >= 0);
  let mutedPenalty = 0;
  for (let i = firstSounding + 1; i < lastSounding; i++) {
    if (strings[i] === -1) mutedPenalty += 3;
  }

  // Wide stretches are awkward (e.g. first-position shapes spanning frets 1–4
  // with four independent fingers, or a partial barre at fret 1 with a pinky
  // reaching fret 4). Penalise sharply so a clean higher-position barre is
  // preferred over a low-position voicing that needs a big stretch.
  const stretchPenalty = stretch >= 3 ? stretch * 1.5 : 0;

  // Partial voicings with 2+ muted bass strings are mid-neck fragments rather
  // than rooted chord shapes — subjectively thinner and harder to keep clean
  // (the muted strings need active damping with no barre to help). Rooted
  // shapes like x32010 (C) mute only one bass string and are unaffected; any
  // voicing that mutes two or more pays +3 per extra muted bass, pushing it
  // behind a proper barre even when the barre sits higher up the neck.
  const mutedBassCount = Math.max(0, strings.findIndex(f => f >= 0));
  const mutedBassPenalty = Math.max(0, mutedBassCount - 1) * 3;

  // Thinness penalty: 4-string partial voicings (common for sharp/flat roots
  // like A#m, G#m, A#7 where the engine's low-position templates end up with
  // muted bass + muted treble) sound weaker and are subjectively no easier than
  // a proper barre at the same or nearby position. +2 per missing string pushes
  // the clean 5/6-string barre ahead of the 4-string fragment even when the
  // fragment wins on finger count and position alone.
  const soundingCount = strings.filter(f => f >= 0).length;
  const thinnessPenalty = (6 - soundingCount) * 2;

  // Awkward-open penalty: an open string directly adjacent to a high fret
  // (≥4) forces the neighbouring finger to arch over the open string without
  // damping it. That's the specific ergonomic problem with the Bm partial
  // x20432 (pinky at fret 4 on G, open D right next to it) — it subjectively
  // rates harder than the 2nd-fret A-shape barre x24432 that otherwise costs
  // slightly more on paper. Low-fret opens (G, C, D, Am, Em, …) never trigger
  // this because none of their neighbours are at fret 4+.
  let awkwardOpenPenalty = 0;
  if (!barre) {
    for (let i = 0; i < strings.length; i++) {
      if (strings[i] !== 0) continue;
      const left = strings[i - 1];
      const right = strings[i + 1];
      const maxNeighbor = Math.max(left ?? -1, right ?? -1);
      if (maxNeighbor >= 4) awkwardOpenPenalty += (maxNeighbor - 3) * 2;
    }
  }

  return fingerCount * 2 + stretch + stretchPenalty + baseFret * 1.1 + mutedPenalty + mutedBassPenalty + thinnessPenalty + awkwardOpenPenalty;
}

function selectDiverse(defs: ChordDef[], max = 8): ChordDef[] {
  if (defs.length <= max) return defs.sort((a, b) => voicingDifficulty(a) - voicingDifficulty(b));

  const buckets: Record<string, ChordDef[]> = { open: [], low: [], mid: [], high: [] };
  for (const d of defs) {
    // Only true open-string voicings (with at least one open string) belong
    // in the "open" bucket. Non-open first-position shapes go to "low".
    const hasOpen = d.strings.some(f => f === 0);
    if (hasOpen && d.baseFret <= 2) buckets.open.push(d);
    else if (d.baseFret <= 5) buckets.low.push(d);
    else if (d.baseFret <= 9) buckets.mid.push(d);
    else buckets.high.push(d);
  }

  // Sort each bucket by difficulty so easiest voicing in each range is picked first
  const order = ["open", "low", "mid", "high"] as const;
  for (const bucket of order) {
    buckets[bucket].sort((a, b) => voicingDifficulty(a) - voicingDifficulty(b));
  }

  const result: ChordDef[] = [];
  let round = 0;
  while (result.length < max) {
    let added = false;
    for (const bucket of order) {
      if (round < buckets[bucket].length && result.length < max) {
        result.push(buckets[bucket][round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return result.sort((a, b) => voicingDifficulty(a) - voicingDifficulty(b));
}

function generateChordDB(): Record<string, ChordDef[]> {
  const db: Record<string, ChordDef[]> = {};
  const seen = new Set<string>();

  function addVoicing(name: string, strings: number[]) {
    const key = name + "|" + strings.join(",");
    if (seen.has(key)) return;
    seen.add(key);
    if (!db[name]) db[name] = [];
    db[name].push(makeChordDef(strings));
  }

  // Generate from templates
  for (const [quality, shapes] of Object.entries(TEMPLATES)) {
    const q = quality === "major" ? "" : quality;
    for (const shape of shapes) {
      // Skip templates whose sounding notes don't actually form the declared
      // quality — catches typos in the static list (e.g. a "major" shape whose
      // open strings introduce notes outside the triad). Without this, bogus
      // templates get ranked as default voicings for their transposed keys
      // (D was defaulting to [-1,5,4,0,3,0] with stray G and E).
      if (!shapeNotesMatchQuality(shape, quality)) continue;
      for (const root of NOTES) {
        const offset = semi("C", root);
        for (const diff of [offset, offset - 12]) {
          const transposed = shape.map(f => f === -1 ? -1 : f + diff);
          if (isValidVoicing(transposed)) {
            addVoicing(root + q, transposed);
          }
        }
      }
    }
  }

  // Add overrides
  for (const [name, shapes] of Object.entries(OVERRIDES)) {
    for (const shape of shapes) {
      addVoicing(name, shape);
    }
  }

  // Select diverse voicings per chord
  for (const name of Object.keys(db)) {
    db[name] = selectDiverse(db[name]);
  }

  // Force specific voicings to rank first for chords where the scored "easiest"
  // voicing is a thin partial-open shape that textbooks don't actually teach
  // as the default. Gm/G7 open partials technically score lower than the
  // E-shape barre at fret 3, but the barre is what every guitar book presents
  // as the canonical voicing. Beginner mode still falls back via
  // NO_BARRE_ALTERNATIVES below.
  const DEFAULT_PROMOTIONS: Record<string, number[]> = {
    "Cm": [-1, 3, 5, 5, 4, 3],
    "C#m": [-1, 4, 6, 6, 5, 4],
    "Dm": [-1, -1, 0, 2, 3, 1],
    "Gm": [3, 5, 5, 3, 3, 3],
    "G7": [3, 5, 3, 4, 3, 3],
  };
  for (const [name, target] of Object.entries(DEFAULT_PROMOTIONS)) {
    const list = db[name];
    if (!list) continue;
    const key = target.join(",");
    const idx = list.findIndex((d) => d.strings.join(",") === key);
    if (idx > 0) {
      const [promoted] = list.splice(idx, 1);
      list.unshift(promoted);
    } else if (idx === -1) {
      list.unshift(makeChordDef(target));
    }
  }

  // Add enharmonic aliases
  const ENHARMONICS: Record<string, string> = {
    "A#": "Bb", "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab",
  };
  for (const [sharp, flat] of Object.entries(ENHARMONICS)) {
    for (const name of Object.keys(db)) {
      if (name.startsWith(sharp)) {
        const flatName = flat + name.slice(sharp.length);
        if (!db[flatName]) db[flatName] = db[name];
      }
    }
  }

  // Add German H notation
  for (const name of Object.keys(db)) {
    if (name.startsWith("B") && !name.startsWith("Bb")) {
      const hName = "H" + name.slice(1);
      if (!db[hName]) db[hName] = db[name];
    }
  }

  return db;
}

// ─── Generated Database (cached at module load) ─────────────────────────────

export const CHORD_DB: Record<string, ChordDef[]> = generateChordDB();

// ─── Transpose ───────────────────────────────────────────────────────────────

export function transposeChord(chord: string, semitones: number): string {
  if (!chord) return chord;
  if (semitones === 0) return chord;
  const match = chord.match(/^([A-GH][#b]?)(.*)$/);
  if (!match) return chord;

  let root = match[1];
  const modifier = match[2];
  const wasFlat = root.includes("b") || root === "H";

  if (root === "H") root = "B";
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];

  const index = NOTES.indexOf(root as typeof NOTES[number]);
  if (index === -1) return chord;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  const sharpName = NOTES[newIndex];
  const displayRoot = wasFlat && SHARP_TO_FLAT[sharpName] ? SHARP_TO_FLAT[sharpName] : sharpName;
  return displayRoot + modifier;
}

// ─── No-barre alternatives ───────────────────────────────────────────────────
// Easy voicings that avoid a full barre, keyed by chord name.
// Strings order: [lowE, A, D, G, B, highE], -1=muted, 0=open, 1+=fret.

const NO_BARRE_ALTERNATIVES: Record<string, number[]> = {
  "F":   [-1, -1, 3, 2, 1, 0],  // Fmaj7  xx3210
  "F#":  [-1, -1, 4, 3, 2, 0],  // F#maj7 xx4320 (approx)
  "Gb":  [-1, -1, 4, 3, 2, 0],
  "B":   [-1, 2,  4, 4, 4, -1], // B      x2444x (partial)
  "Bb":  [-1, 1,  3, 3, 3, -1], // Bb     x1333x (partial)
  "A#":  [-1, 1,  3, 3, 3, -1],
  "Bm":  [-1, 2,  0, 4, 3, 2],  // Bm     x20432 (partial — no barre)
  "Cm":  [-1, 3,  1, 0, 1, -1], // Cm     x31010 (partial — no barre)
  "Gm":  [3,  1,  0, 0, 3, 3],  // Gm     partial-open (no barre)
  "G7":  [3,  2,  0, 0, 0, 1],  // G7     open dominant (no barre)
};

export function lookupNoBarreVoicing(chord: string): ChordDef | null {
  const strings = NO_BARRE_ALTERNATIVES[chord];
  if (!strings) return null;
  return makeChordDef(strings);
}

// ─── Lookup ──────────────────────────────────────────────────────────────────

function normalizeForDB(chord: string): string {
  const match = chord.match(/^([A-GH][#b]?)(.*)$/);
  if (!match) return chord;
  let root = match[1];
  const modifier = match[2];
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];
  const result = root + modifier;
  if (CHORD_DB[result]?.length) return result;
  if (SHARP_TO_FLAT[root]) {
    const flatResult = SHARP_TO_FLAT[root] + modifier;
    if (CHORD_DB[flatResult]?.length) return flatResult;
  }
  return result;
}

// Parse a note name (C, C#, Db, H/B…) to a semitone index 0–11.
function noteSemitone(note: string): number | null {
  let n = note;
  if (n === "H") n = "B";
  if (FLAT_TO_SHARP[n]) n = FLAT_TO_SHARP[n];
  const i = NOTES.indexOf(n as typeof NOTES[number]);
  return i >= 0 ? i : null;
}

// Build a slash-chord voicing by replacing the lowest sounding string of `def`
// with the target bass note. Picks low-E or A string, prefers low frets and
// positions that don't overstretch the voicing's existing fret range.
function withBassNote(def: ChordDef, bassSemi: number): ChordDef | null {
  const played = def.strings.filter((f) => f > 0);
  const minF = played.length ? Math.min(...played) : 0;
  const maxF = played.length ? Math.max(...played) : 4;

  for (const stringIdx of [0, 1]) {
    const open = OPEN_STRINGS[stringIdx];
    for (let fret = 0; fret <= 14; fret++) {
      if ((open + fret) % 12 !== bassSemi) continue;
      // Keep bass fret within playing zone (or open) so the shape stays reachable
      const inRange = fret === 0 || (fret >= minF - 2 && fret <= maxF + 2);
      if (!inRange) continue;
      const strings = [...def.strings];
      for (let j = 0; j < stringIdx; j++) strings[j] = -1;
      strings[stringIdx] = fret;
      if (isValidVoicing(strings)) return makeChordDef(strings);
    }
  }
  return null;
}

// Drop uncommon quality extensions down to a voicing that exists in CHORD_DB.
// e.g. Dmadd9 → Dm, Fmaj9 → Fmaj7, Am11 → Am7.
function simplifyQuality(chord: string): string | null {
  const rules: [RegExp, string][] = [
    [/madd9$/, "m"],
    [/add\d+$/, ""],
    [/maj(9|11|13)$/, "maj7"],
    [/m(9|11|13)$/, "m7"],
    [/(11|13)$/, "7"],
    [/sus[24]?$/, ""],
  ];
  for (const [re, rep] of rules) {
    if (re.test(chord)) {
      const next = chord.replace(re, rep);
      if (next !== chord) return next;
    }
  }
  return null;
}

export function lookupChord(chord: string): ChordDef[] | undefined {
  // 1. Direct match (with flat↔sharp normalization)
  const lookupKey = normalizeForDB(chord);
  const direct = CHORD_DB[lookupKey] ?? CHORD_DB[chord];
  if (direct?.length) return direct;

  // 2. Slash chord — look up base, then rewrite bass
  const slash = chord.match(/^(.+?)\/([A-GH][#b]?)$/);
  if (slash) {
    const baseDefs = lookupChord(slash[1]);
    const bassSemi = noteSemitone(slash[2]);
    if (baseDefs && bassSemi !== null) {
      const rewritten = baseDefs
        .map((d) => withBassNote(d, bassSemi))
        .filter((d): d is ChordDef => d !== null);
      if (rewritten.length) return rewritten;
      // Can't place bass — fall back to the base chord's voicings
      return baseDefs;
    }
  }

  // 3. Unknown extension — drop to a nearby simpler quality
  const simpler = simplifyQuality(chord);
  if (simpler && simpler !== chord) return lookupChord(simpler);

  return undefined;
}

// ─── Capo suggestion ────────────────────────────────────────────────────────

export function suggestCapo(
  chords: string[],
  transpose = 0,
): { fret: number; score: number }[] {
  const results: { fret: number; score: number }[] = [];

  for (let capo = 0; capo <= 11; capo++) {
    let total = 0;
    for (const chord of chords) {
      const transposed = transposeChord(chord, transpose - capo);
      const defs = lookupChord(transposed);
      if (defs && defs.length > 0) {
        total += voicingDifficulty(defs[0]); // easiest voicing
      } else {
        total += 100; // unknown chord penalty
      }
    }
    results.push({ fret: capo, score: total });
  }

  return results.sort((a, b) => a.score - b.score);
}

// ─── Chord Identifier (reverse lookup by intervals) ─────────────────────────

// Note at string index i, fret f (standard tuning)
export function noteAt(stringIdx: number, fret: number): number {
  return (OPEN_STRINGS[stringIdx] + fret) % 12;
}

export function noteName(semitone: number): string {
  return NOTES[semitone % 12];
}

// Interval patterns for chord identification
const CHORD_PATTERNS: [string, number[]][] = [
  // Triads
  ["",       [0, 4, 7]],       // major
  ["m",      [0, 3, 7]],       // minor
  ["dim",    [0, 3, 6]],       // diminished
  ["aug",    [0, 4, 8]],       // augmented
  ["sus2",   [0, 2, 7]],       // sus2
  ["sus4",   [0, 5, 7]],       // sus4
  // Sevenths
  ["7",      [0, 4, 7, 10]],   // dominant 7
  ["m7",     [0, 3, 7, 10]],   // minor 7
  ["maj7",   [0, 4, 7, 11]],   // major 7
  ["dim7",   [0, 3, 6, 9]],    // diminished 7
  ["m7b5",   [0, 3, 6, 10]],   // half-diminished
  // Extensions
  ["6",      [0, 4, 7, 9]],    // major 6
  ["m6",     [0, 3, 7, 9]],    // minor 6
  ["9",      [0, 4, 7, 10, 2]],// dominant 9 (root, 3, 5, b7, 9)
  ["add9",   [0, 4, 7, 2]],    // add9
];

export interface ChordMatch {
  name: string;     // e.g. "Am7"
  root: string;     // e.g. "A"
  quality: string;  // e.g. "m7"
  bass?: string;    // e.g. "E" for slash chord Am7/E
}

export function identifyChord(frets: number[]): ChordMatch[] {
  if (frets.length !== 6) return [];

  // Collect sounding notes (unique pitch classes)
  const notes = new Set<number>();
  const notesList: number[] = [];
  for (let i = 0; i < 6; i++) {
    if (frets[i] >= 0) {
      const n = noteAt(i, frets[i]);
      notes.add(n);
      notesList.push(n);
    }
  }

  if (notes.size < 2) return [];

  const uniqueNotes = [...notes];
  const results: ChordMatch[] = [];

  // Try each note as potential root
  for (const root of uniqueNotes) {
    // Calculate intervals relative to this root
    const intervals = new Set(uniqueNotes.map(n => (n - root + 12) % 12));

    // Match against known patterns
    for (const [quality, pattern] of CHORD_PATTERNS) {
      // All pattern intervals must be present
      if (pattern.every(p => intervals.has(p % 12))) {
        const rootName = NOTES[root];
        const chordName = rootName + quality;

        // Determine bass note (lowest sounding string)
        let bass: string | undefined;
        for (let i = 0; i < 6; i++) {
          if (frets[i] >= 0) {
            const bassNote = noteAt(i, frets[i]);
            if (bassNote !== root) {
              bass = NOTES[bassNote];
            }
            break;
          }
        }

        results.push({
          name: bass ? `${chordName}/${bass}` : chordName,
          root: rootName,
          quality,
          bass,
        });
      }
    }
  }

  // Sort: prefer simpler chords (fewer intervals), then non-slash chords
  results.sort((a, b) => {
    // Non-slash chords first
    if (!a.bass && b.bass) return -1;
    if (a.bass && !b.bass) return 1;
    // Simpler quality first
    const aPattern = CHORD_PATTERNS.find(p => p[0] === a.quality)?.[1].length ?? 99;
    const bPattern = CHORD_PATTERNS.find(p => p[0] === b.quality)?.[1].length ?? 99;
    return aPattern - bPattern;
  });

  return results;
}
