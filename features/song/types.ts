export type Difficulty = "easy" | "medium" | "hard";

export interface ChordPlacement {
  chord: string;
  col: number;        // exact character column where the chord sits
}

export interface ChordLine {
  chords: ChordPlacement[]; // chords with their exact column positions
  lyrics: string;           // lyric text without leading whitespace
  lyricsCol: number;        // column where lyrics start (preserves indent)
}

export interface SongSection {
  label: string;      // "Куплет 1", "Приспів", "Бридж"
  lines: ChordLine[];
  tab?: string;       // raw ASCII tablature (6 string lines)
}

export type Strum = "D" | "U" | "Dx" | "Ux";

export interface SongVariant {
  id: string;
  label: string;
  sections: SongSection[];
  chords: string[];
  key: string;
  capo?: number;
  tempo?: number;
  strumming?: Strum[];
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
  tempo?: number;
  timeSignature?: string;
  difficulty: Difficulty;
  chords: string[];
  views: number;
  sections: SongSection[];
  youtubeId?: string;
  strumming?: Strum[];
  coverImage?: string;
  coverColor?: string;
  variants?: SongVariant[];
  primaryVariantId?: string;
  activeVariantId?: string;
}
