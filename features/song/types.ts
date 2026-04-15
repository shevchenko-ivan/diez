export type Difficulty = "easy" | "medium" | "hard";

export interface ChordLine {
  chords: string[];   // aligned chord names, empty string = no chord above that word
  lyrics: string;     // the lyric line
  indent?: number;    // leading spaces count (for visual indentation)
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
  difficulty: Difficulty;
  chords: string[];
  views: number;
  sections: SongSection[];
  youtubeId?: string;
  strumming?: ("D" | "U" | "Dx" | "Ux")[]; // D=Down, U=Up, x=Mute
  coverImage?: string;
  coverColor?: string;
}
