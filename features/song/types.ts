export type Difficulty = "easy" | "medium" | "hard";

export interface ChordLine {
  chords: string[];   // aligned chord names, empty string = no chord above that word
  lyrics: string;     // the lyric line
}

export interface SongSection {
  label: string;      // "Куплет 1", "Приспів", "Бридж"
  lines: ChordLine[];
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
  coverImage?: string;
  coverColor?: string;
}
