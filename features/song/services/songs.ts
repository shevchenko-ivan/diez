import { Song } from "../types";

// ─── Mock songs database ───────────────────────────────────────────────────────
// Replace with Supabase queries when ready

export const MOCK_SONGS: Song[] = [
  {
    slug: "obiymy",
    title: "Обійми",
    artist: "Океан Ельзи",
    album: "Земля",
    genre: "Рок",
    key: "Am",
    capo: 0,
    tempo: 76,
    difficulty: "easy",
    chords: ["Am", "F", "C", "G"],
    views: 12400,
    coverImage: "/songs/obiymy.png",
    sections: [
      {
        label: "Куплет 1",
        lines: [
          {
            chords: ["Am", "", "", "F", "", ""],
            lyrics: "Обійми мене, обійми",
          },
          {
            chords: ["C", "", "", "G", "", ""],
            lyrics: "Так, як ти вмієш тільки ти",
          },
          {
            chords: ["Am", "", "", "F", "", ""],
            lyrics: "Обійми мене і лети",
          },
          {
            chords: ["C", "", "G", "", "Am", ""],
            lyrics: "Зі мною в небо, в небо",
          },
        ],
      },
      {
        label: "Приспів",
        lines: [
          {
            chords: ["F", "", "", "C", "", ""],
            lyrics: "Ти моя, моя земля",
          },
          {
            chords: ["G", "", "", "Am", "", ""],
            lyrics: "Ти моє тепле вогнище",
          },
          {
            chords: ["F", "", "", "C", "", ""],
            lyrics: "Ти моя, моя зоря",
          },
          {
            chords: ["G", "", "", "", "", ""],
            lyrics: "Що веде мене додому",
          },
        ],
      },
      {
        label: "Куплет 2",
        lines: [
          {
            chords: ["Am", "", "", "F", "", ""],
            lyrics: "Обійми мене, обійми",
          },
          {
            chords: ["C", "", "", "G", "", ""],
            lyrics: "Серед ночі і гризоти",
          },
          {
            chords: ["Am", "", "", "F", "", ""],
            lyrics: "Обійми і я знайду",
          },
          {
            chords: ["C", "", "G", "", "Am", ""],
            lyrics: "Дорогу крізь всі тумани",
          },
        ],
      },
      {
        label: "Аутро",
        lines: [
          {
            chords: ["Am", "F", "C", "G"],
            lyrics: "× 4",
          },
        ],
      },
    ],
  },
  {
    slug: "strilyaly-ochi",
    title: "Стріляли очі",
    artist: "Скрябін",
    genre: "Поп-рок",
    key: "Dm",
    difficulty: "medium",
    chords: ["Dm", "Am", "G", "C", "Bb"],
    views: 8900,
    coverImage: "/songs/strilyaly-ochi.png",
    sections: [
      {
        label: "Куплет 1",
        lines: [
          { chords: ["Dm", "", "", "Am", ""], lyrics: "Стріляли очі, чорні очі" },
          { chords: ["G", "", "", "Dm", ""], lyrics: "У саме серце вцілили" },
          { chords: ["Bb", "", "", "C", ""], lyrics: "І залишили без сили" },
          { chords: ["Dm", "", "Am", ""], lyrics: "Мене самого зовсім" },
        ],
      },
      {
        label: "Приспів",
        lines: [
          { chords: ["Dm", "", "C", "", ""], lyrics: "Ти — моя загибель" },
          { chords: ["Bb", "", "G", "", ""], lyrics: "Ти — моя любов" },
          { chords: ["Dm", "", "C", "", ""], lyrics: "Без тебе холодно і зимно" },
          { chords: ["Bb", "C", "Dm", ""], lyrics: "Навіть серед слів" },
        ],
      },
    ],
  },
];

export function getSongBySlug(slug: string): Song | undefined {
  return MOCK_SONGS.find((s) => s.slug === slug);
}
