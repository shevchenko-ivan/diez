// Pure — shared by the «Для початківців» topic filter (server) and the song
// viewer (client), so it lives outside data/topics.ts and its long SEO copy.

import { transposeChord } from "../data/chord-templates";

// Chords a beginner plays in open position, without a barre — gates the
// `no-barre` topic. A whitelist, not a blacklist: the old list of «hard»
// chords let through everything it didn't name (Gm, Cm, Fm, A#, Hm…), so the
// «Для початківців» top was led by songs full of barre chords. Slash chords
// are judged by their shape (Dm/A → Dm, D/F# → D); power chords only in the
// open-string positions.
const OPEN_CHORDS = new Set([
  "C", "D", "E", "G", "A",
  "Am", "Em", "Dm",
  "A7", "B7", "H7", "C7", "D7", "E7", "G7",
  "Am7", "Dm7", "Em7",
  "Cmaj7", "Fmaj7", "Gmaj7",
  "Asus2", "Csus2", "Dsus2",
  "Asus4", "Dsus4", "Esus4",
  "A5", "D5", "E5",
  "Am6", "Dm6", "G6",
]);

export function isOpenChord(c: string): boolean {
  return OPEN_CHORDS.has(c.trim().split("/")[0]);
}

export function isNoBarreSong(chords: string[] | null | undefined): boolean {
  if (!chords || chords.length === 0) return false;
  return chords.every(isOpenChord);
}

// Same search order as the viewer's beginner mode: closest keys first.
const BEGINNER_SHIFTS = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6];

/** Smallest transposition that turns every chord into an open shape —
 *  0 when the song is already barre-free, null when no key gets there. */
export function noBarreShift(chords: string[] | null | undefined): number | null {
  if (!chords || chords.length === 0) return null;
  for (const d of BEGINNER_SHIFTS) {
    if (chords.every((c) => isOpenChord(transposeChord(c.trim(), d)))) return d;
  }
  return null;
}
