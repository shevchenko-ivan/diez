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
  strumming?: ("D" | "U" | "Dx" | "Ux")[]; // D=Down, U=Up, x=Mute
  coverImage?: string;
  coverColor?: string;
}
