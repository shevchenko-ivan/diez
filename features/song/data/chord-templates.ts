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
  const baseFret = played.length > 0 ? Math.min(...played) : 1;

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

  return fingerCount * 2 + stretch + baseFret * 1.1 + mutedPenalty;
}

function selectDiverse(defs: ChordDef[], max = 8): ChordDef[] {
  if (defs.length <= max) return defs.sort((a, b) => voicingDifficulty(a) - voicingDifficulty(b));

  const buckets: Record<string, ChordDef[]> = { open: [], low: [], mid: [], high: [] };
  for (const d of defs) {
    if (d.baseFret <= 2) buckets.open.push(d);
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
  const match = chord.match(/^([A-GH][#b]?)(.*)$/);
  if (!match) return chord;

  let root = match[1];
  const modifier = match[2];

  if (root === "H") root = "B";
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];

  const index = NOTES.indexOf(root as typeof NOTES[number]);
  if (index === -1) return chord;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  return NOTES[newIndex] + modifier;
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

export function lookupChord(chord: string): ChordDef[] | undefined {
  const lookupKey = normalizeForDB(chord);
  const defs = CHORD_DB[lookupKey] ?? CHORD_DB[chord];
  return defs?.length ? defs : undefined;
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
