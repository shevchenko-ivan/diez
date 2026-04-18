import { unstable_cache } from "next/cache";
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

export const getAllSongs = unstable_cache(
  async (options?: { sortBy?: "views" | "created_at" }): Promise<Song[]> => {
    if (!hasEnvVars) return [];
    const { data, error } = await getClient()
      .from("songs")
      .select(SONG_COLUMNS)
      .eq("status", "published")
      .order(options?.sortBy ?? "views", { ascending: false });
    if (error || !data) return [];
    return data.map(mapRow);
  },
  ["all-songs"],
  { revalidate: 300, tags: ["songs"] },
);

export const getFreshSongs = unstable_cache(
  async (limit = 4): Promise<Song[]> => {
    if (!hasEnvVars) return [];
    const { data, error } = await getClient()
      .from("songs")
      .select(SONG_COLUMNS)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(mapRow);
  },
  ["fresh-songs"],
  { revalidate: 300, tags: ["songs"] },
);

export const getSongsByArtist = unstable_cache(
  async (
    artist: string,
    options?: { excludeSlug?: string; limit?: number },
  ): Promise<Song[]> => {
    if (!hasEnvVars) return [];
    let q = getClient()
      .from("songs")
      .select(SONG_COLUMNS)
      .eq("status", "published")
      .eq("artist", artist)
      .order("views", { ascending: false });
    if (options?.excludeSlug) q = q.neq("slug", options.excludeSlug);
    if (options?.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(mapRow);
  },
  ["songs-by-artist"],
  { revalidate: 300, tags: ["songs"] },
);

export const getSongBySlug = unstable_cache(
  async (slug: string): Promise<Song | undefined> => {
    if (!hasEnvVars) return undefined;
    const { data, error } = await getClient()
      .from("songs")
      .select(SONG_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    if (error || !data) return undefined;
    return mapRow(data as Record<string, unknown>);
  },
  ["song-by-slug"],
  { revalidate: 300, tags: ["songs"] },
);
