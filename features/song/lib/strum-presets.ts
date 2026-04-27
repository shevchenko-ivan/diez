import type { NoteLength, Stroke } from "@/features/song/types";

/**
 * Curated library of common strumming patterns the admin can apply with one
 * click. Each preset is a complete (noteLength, strokes) pair — choosing one
 * fully replaces the current pattern's body.
 *
 * Names use Ukrainian since the editor UI is in Ukrainian. Accents (`a:true`)
 * are added on the natural downbeat so the pattern audibly "groove" right
 * after applying — admins can fine-tune from there.
 */

const D: Stroke = { d: "D" };
const U: Stroke = { d: "U" };
const DA: Stroke = { d: "D", a: true };
const M: Stroke = { d: "D", m: true };
const REST: Stroke = { d: "D", r: true };

export interface StrumPreset {
  id: string;
  label: string;
  noteLength: NoteLength;
  strokes: Stroke[];
}

export const STRUM_PRESETS: StrumPreset[] = [
  // ── Quarters / eighths — the building blocks ──────────────────────────────
  {
    id: "quarters",
    label: "Чверті",
    noteLength: "1/4",
    strokes: [DA, D, D, D],
  },
  {
    id: "eighths-du",
    label: "Вісімки D-U",
    noteLength: "1/8",
    strokes: [DA, U, D, U, D, U, D, U],
  },
  {
    id: "eighths-d",
    label: "Тільки вниз",
    noteLength: "1/8",
    strokes: [DA, D, D, D, D, D, D, D],
  },

  // ── Popular pop / folk / rock strums ──────────────────────────────────────
  {
    id: "pop-classic",
    // D · D U · U D U — the universal pop pattern (Wonderwall, etc.)
    label: "Pop / класика",
    noteLength: "1/8",
    strokes: [DA, REST, D, U, REST, U, D, U],
  },
  {
    id: "folk",
    // D D U · U D U — folk variation with rest on the and-of-2.
    label: "Folk",
    noteLength: "1/8",
    strokes: [DA, D, U, REST, U, D, U, REST],
  },
  {
    id: "country",
    // D U · U D U · U — country bounce.
    label: "Country",
    noteLength: "1/8",
    strokes: [DA, U, REST, U, D, U, REST, U],
  },
  {
    id: "ballad",
    // D · · U D U · U — slow ballad with whole-note feel on beat 1.
    label: "Балада",
    noteLength: "1/8",
    strokes: [DA, REST, REST, U, D, U, REST, U],
  },
  {
    id: "rock-eighths",
    // D! D D U D! D D U — straight rock 8ths with accents on beats 1 & 3.
    label: "Рок",
    noteLength: "1/8",
    strokes: [DA, D, D, U, DA, D, D, U],
  },
  {
    id: "petty",
    // D · D U · D U · — Tom Petty / Free Fallin' / Hey There Delilah feel.
    label: "Petty",
    noteLength: "1/8",
    strokes: [DA, REST, D, U, REST, D, U, REST],
  },
  {
    id: "half-ballad",
    // D · · · D U · U — sparse half-time ballad, lots of air.
    label: "Балада повільна",
    noteLength: "1/8",
    strokes: [DA, REST, REST, REST, D, U, REST, U],
  },
  {
    id: "bossa",
    // D · U · D U · U — bossa-nova-style syncopation.
    label: "Босса",
    noteLength: "1/8",
    strokes: [DA, REST, U, REST, D, U, REST, U],
  },
  {
    id: "backbeat",
    // D U Dm U D U Dm U — palm-mute "chuck" on beats 2 & 4 (funk/disco backbeat).
    label: "Бекбіт",
    noteLength: "1/8",
    strokes: [DA, U, M, U, D, U, M, U],
  },
  {
    id: "march",
    // D! U D! U D! U D! U — every downbeat accented (march / pop-punk).
    label: "Марш",
    noteLength: "1/8",
    strokes: [DA, U, DA, U, DA, U, DA, U],
  },
  {
    id: "reggae",
    // · U · U · U · U — upbeats only (skank).
    label: "Реггі",
    noteLength: "1/8",
    strokes: [REST, U, REST, U, REST, U, REST, U],
  },

  // ── Sixteenths ────────────────────────────────────────────────────────────
  {
    id: "sixteenths",
    label: "Шістнадцятки",
    noteLength: "1/16",
    strokes: Array.from({ length: 16 }, (_, i): Stroke => ({
      d: i % 2 === 0 ? "D" : "U",
      ...(i % 4 === 0 ? { a: true } : {}),
    })),
  },

  // ── Triplets / compound time ──────────────────────────────────────────────
  {
    id: "waltz-6-8",
    // 6/8 — two triplets per measure, downbeat accents.
    label: "6/8 (вальс)",
    noteLength: "1/8t",
    strokes: [DA, U, U, DA, U, U],
  },
  {
    id: "house-6-8",
    // 6/8 arpeggio feel — House of the Rising Sun.
    label: "House 6/8",
    noteLength: "1/8t",
    strokes: [DA, REST, U, D, U, U],
  },
  {
    id: "shuffle",
    // Long-short blues shuffle: D · U on each beat.
    label: "Shuffle",
    noteLength: "1/8t",
    strokes: [
      DA, REST, U,
      D, REST, U,
      DA, REST, U,
      D, REST, U,
    ],
  },
  {
    id: "triplets",
    label: "Тріолі",
    noteLength: "1/8t",
    strokes: [
      DA, D, U,
      DA, D, U,
      DA, D, U,
      DA, D, U,
    ],
  },
];
