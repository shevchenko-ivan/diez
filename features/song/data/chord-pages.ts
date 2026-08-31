import { FLAT_TO_SHARP, RARE_ENHARMONICS } from "./chord-templates";

// ── Chord dictionary registry (/chords/<slug>) ───────────────────────────────
//
// One landing page per common chord: 12 majors + 12 minors + the 5 dominant
// sevenths that actually occur in the catalogue (E7/A7/D7/G7/B7 — the rest
// are rare). Targets the «акорд am на гітарі» / «як затиснути F» query class,
// which (SERP audit 31.08.2026) had no Ukrainian-language result at all —
// the top was held by five .ru chord sites. Every page renders the voicings
// that already power the song-page diagrams, so the content is generated
// from the same single source of truth (chord-templates*), never hand-typed.
//
// Slug scheme: lowercase root, «#» → «-sharp», minor adds «m» («-m» after
// -sharp): Am → am, F#m → f-sharp-m, B7 → b7. Flats normalize to sharps
// before lookup (Bb → a-sharp) — the catalogue stores sharp-canonical names.

export interface ChordPage {
  /** URL slug in /chords/<slug> */
  slug: string;
  /** Canonical chord name exactly as stored in songs.chords ("Am", "F#") */
  name: string;
  /** Ukrainian musicological name («ля мінор») — used in H1 and copy */
  ukr: string;
  quality: "major" | "minor" | "dom7";
}

/** Ukrainian note names, sharp-canonical — «дієз» is literally the site name. */
export const UKR_NOTE: Record<string, string> = {
  C: "до",
  "C#": "до-дієз",
  D: "ре",
  "D#": "ре-дієз",
  E: "мі",
  F: "фа",
  "F#": "фа-дієз",
  G: "соль",
  "G#": "соль-дієз",
  A: "ля",
  "A#": "ля-дієз",
  B: "сі",
};

const ROOTS = Object.keys(UKR_NOTE);
const SEVENTH_ROOTS = ["E", "A", "D", "G", "B"];

function rootSlug(root: string): string {
  return root.toLowerCase().replace("#", "-sharp");
}

export const CHORD_PAGES: ChordPage[] = [
  ...ROOTS.map((r) => ({
    slug: rootSlug(r),
    name: r,
    ukr: `${UKR_NOTE[r]} мажор`,
    quality: "major" as const,
  })),
  ...ROOTS.map((r) => ({
    slug: rootSlug(r).includes("-") ? `${rootSlug(r)}-m` : `${rootSlug(r)}m`,
    name: `${r}m`,
    ukr: `${UKR_NOTE[r]} мінор`,
    quality: "minor" as const,
  })),
  ...SEVENTH_ROOTS.map((r) => ({
    slug: `${rootSlug(r)}7`,
    name: `${r}7`,
    ukr: `${UKR_NOTE[r]}-септакорд`,
    quality: "dom7" as const,
  })),
];

const BY_SLUG = new Map(CHORD_PAGES.map((p) => [p.slug, p]));
const BY_NAME = new Map(CHORD_PAGES.map((p) => [p.name, p]));

export function getChordPage(slug: string): ChordPage | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Dictionary page for a chord name as it appears in songs.chords — exact
 * quality match only (Am7 has no page and must NOT link to Am; a wrong link
 * would teach the reader the wrong shape). Flats and rare enharmonics
 * normalize to the sharp-canonical registry names.
 */
export function chordPageFor(chord: string): ChordPage | undefined {
  const m = chord.trim().match(/^([A-G](?:#|b)?)(.*)$/);
  if (!m) return undefined;
  let root = RARE_ENHARMONICS[m[1]] ?? m[1];
  root = FLAT_TO_SHARP[root] ?? root;
  return BY_NAME.get(`${root}${m[2]}`);
}
