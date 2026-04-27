export type Difficulty = "easy" | "medium" | "hard";

export interface ChordPlacement {
  chord: string;
  col: number;        // exact character column where the chord sits
}

export interface ChordLine {
  chords: ChordPlacement[]; // chords with their exact column positions
  lyrics: string;           // lyric text without leading whitespace
  lyricsCol: number;        // column where lyrics start (preserves indent)
  /**
   * When true, the chord substrings are still embedded inside `lyrics` at
   * their `col` positions — the renderer should skip the separate chord row
   * and instead color the chord characters inline within the lyric text.
   * Used for mixed rows like "вст. Am" or "Solo: G D Em C".
   */
  inlineChords?: boolean;
  /**
   * Inline performer marker that points to a previously-defined section,
   * e.g. "Приспів x2" (parsed from "|Приспів| x2"). Rendered as a compact
   * section-label chip — does NOT open a new section.
   */
  marker?: string;
}

export interface SongSection {
  label: string;      // "Куплет 1", "Приспів", "Бридж"
  lines: ChordLine[];
  tab?: string;       // raw ASCII tablature (6 string lines)
}

// ─── Strumming patterns (rich model — multiple per song) ─────────────────────
export type StrumDir = "D" | "U";
export type NoteLength = "1/4" | "1/8" | "1/16" | "1/4t" | "1/8t" | "1/16t";

/**
 * A single strum within a pattern. Compact JSON keys (d/a/m/r) match the
 * shape stored in `song_strumming_patterns.strokes` to keep the column
 * payload small.
 */
export interface Stroke {
  d: StrumDir;
  /** Accented (louder). Drawn with ">" mark. */
  a?: boolean;
  /** Palm-muted / staccato. */
  m?: boolean;
  /** Rest — slot keeps timing but produces no sound. */
  r?: boolean;
}

export interface StrumPattern {
  id: string;
  position: number;
  name: string;
  tempo: number;
  noteLength: NoteLength;
  strokes: Stroke[];
}

export interface SongVariant {
  id: string;
  label: string;
  sections: SongSection[];
  chords: string[];
  key: string;
  capo?: number;
  views: number;
  createdAt: string;
  isPrimary: boolean;
}

export interface Song {
  slug: string;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  key: string;
  capo?: number;
  timeSignature?: string;
  difficulty: Difficulty;
  chords: string[];
  views: number;
  sections: SongSection[];
  youtubeId?: string;
  coverImage?: string;
  coverColor?: string;
  variants?: SongVariant[];
  primaryVariantId?: string;
  activeVariantId?: string;
  /** Rich strumming patterns (multiple per song). */
  strumPatterns?: StrumPattern[];
}
