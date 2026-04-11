import { createBrowserClient } from "@supabase/ssr";
import { type Song, type SongSection, type Difficulty } from "../types";
import { hasEnvVars } from "@/lib/utils";

// Public read-only client — no cookie/session needed for published song reads.
// Works at build time (generateStaticParams) and at request time.
function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

const SONG_COLUMNS =
  "slug, title, artist, album, genre, key, capo, tempo, difficulty, chords, views, sections, strumming, cover_image, cover_color, youtube_id";

function mapRow(row: Record<string, unknown>): Song {
  return {
    slug: row.slug as string,
    title: row.title as string,
    artist: row.artist as string,
    album: (row.album as string | null) ?? undefined,
    genre: row.genre as string,
    key: row.key as string,
    capo: (row.capo as number | null) ?? undefined,
    tempo: (row.tempo as number | null) ?? undefined,
    difficulty: row.difficulty as Difficulty,
    chords: row.chords as string[],
    views: row.views as number,
    sections: row.sections as SongSection[],
    strumming: (row.strumming as Song["strumming"] | null) ?? undefined,
    coverImage: (row.cover_image as string | null) ?? undefined,
    coverColor: (row.cover_color as string | null) ?? undefined,
    youtubeId: (row.youtube_id as string | null) ?? undefined,
  };
}

export async function getAllSongs(): Promise<Song[]> {
  if (!hasEnvVars) return [];
  const { data, error } = await getClient()
    .from("songs")
    .select(SONG_COLUMNS)
    .eq("status", "published")
    .order("views", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getSongBySlug(slug: string): Promise<Song | undefined> {
  if (!hasEnvVars) return undefined;
  const { data, error } = await getClient()
    .from("songs")
    .select(SONG_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  if (error || !data) return undefined;
  return mapRow(data as Record<string, unknown>);
}
