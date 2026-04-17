import { createClient } from "@supabase/supabase-js";
import { type Song, type SongSection, type Difficulty } from "../types";
import { hasEnvVars } from "@/lib/utils";
import { parseLyricsWithChords } from "../lib/parseLyrics";

// Public read-only client — no auth needed for published song reads.
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const SONG_COLUMNS =
  "slug, title, artist, album, genre, key, capo, tempo, time_signature, difficulty, chords, views, sections, strumming, cover_image, cover_color, youtube_id";

// Re-parse sections from the stored `raw` text so old rows (saved in the
// previous word-aligned format) render with the new column-preserving parser.
function resolveSections(value: unknown): SongSection[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.raw === "string") {
      return parseLyricsWithChords(obj.raw).sections;
    }
    if (Array.isArray(obj.sections)) return obj.sections as SongSection[];
  }
  if (Array.isArray(value)) return value as SongSection[];
  return [];
}

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
    timeSignature: (row.time_signature as string | null) ?? undefined,
    difficulty: row.difficulty as Difficulty,
    chords: row.chords as string[],
    views: row.views as number,
    sections: resolveSections(row.sections),
    strumming: (row.strumming as Song["strumming"] | null) ?? undefined,
    coverImage: (row.cover_image as string | null) ?? undefined,
    coverColor: (row.cover_color as string | null) ?? undefined,
    youtubeId: (row.youtube_id as string | null) ?? undefined,
  };
}

export async function getAllSongs(options?: { sortBy?: "views" | "created_at" }): Promise<Song[]> {
  if (!hasEnvVars) return [];
  const { data, error } = await getClient()
    .from("songs")
    .select(SONG_COLUMNS)
    .eq("status", "published")
    .order(options?.sortBy ?? "views", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getFreshSongs(limit = 4): Promise<Song[]> {
  if (!hasEnvVars) return [];
  const { data, error } = await getClient()
    .from("songs")
    .select(SONG_COLUMNS)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
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
