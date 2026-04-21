import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { type Song, type SongSection, type SongVariant, type Difficulty, type Strum } from "../types";
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
  "slug, title, artist, album, genre, key, capo, tempo, time_signature, difficulty, chords, views, sections, strumming, cover_image, cover_color, youtube_id, primary_variant_id";

// Slim column set for list views — excludes heavy JSONB (sections, strumming)
// so the cached payload stays under Next.js's 2MB unstable_cache limit.
const SONG_LIST_COLUMNS =
  "slug, title, artist, album, genre, key, capo, tempo, time_signature, difficulty, chords, views, cover_image, cover_color, youtube_id, primary_variant_id";

const VARIANT_COLUMNS =
  "id, label, sections, chords, key, capo, tempo, strumming, views, created_at";

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

function mapVariantRow(row: Record<string, unknown>, primaryId: string | null): SongVariant {
  const id = row.id as string;
  return {
    id,
    label: row.label as string,
    sections: resolveSections(row.sections),
    chords: (row.chords as string[] | null) ?? [],
    key: row.key as string,
    capo: (row.capo as number | null) ?? undefined,
    tempo: (row.tempo as number | null) ?? undefined,
    strumming: (row.strumming as Strum[] | null) ?? undefined,
    views: (row.views as number | null) ?? 0,
    createdAt: row.created_at as string,
    isPrimary: id === primaryId,
  };
}

function mapRow(row: Record<string, unknown>): Song {
  const primaryVariantId = (row.primary_variant_id as string | null) ?? undefined;
  const rawVariants = (row.song_variants as Record<string, unknown>[] | undefined) ?? undefined;
  const variants = rawVariants
    ? rawVariants
        .map((v) => mapVariantRow(v, primaryVariantId ?? null))
        .sort((a, b) => {
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
          return a.createdAt.localeCompare(b.createdAt);
        })
    : undefined;

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
    strumming: (row.strumming as Strum[] | null) ?? undefined,
    coverImage: (row.cover_image as string | null) ?? undefined,
    coverColor: (row.cover_color as string | null) ?? undefined,
    youtubeId: (row.youtube_id as string | null) ?? undefined,
    primaryVariantId,
    variants,
  };
}

type SortBy = "views" | "created_at_desc" | "created_at_asc" | "source_popularity" | "source_views" | "title_asc";

export interface SongsPageArgs {
  q?: string;
  difficulty?: "easy" | "medium" | "hard";
  sortBy?: SortBy;
  offset?: number;
  limit?: number;
}

// Returns slug+artist list for sitemap — tiny payload, easily cached.
// Paginated: Supabase caps a single select at 1000 rows, so without this the
// sitemap would silently omit songs past row 1000.
export const getAllSongSlugs = unstable_cache(
  async (): Promise<{ slug: string; artist: string }[]> => {
    if (!hasEnvVars) return [];
    return fetchAllPublishedSongs<{ slug: string; artist: string }>("slug, artist");
  },
  ["all-song-slugs"],
  { revalidate: 3600, tags: ["songs"] },
);

// Paginate through all published-song rows for a given column set.
// Supabase caps a single select at 1000 rows — without this helper, aggregates
// over the full songs table silently truncate (any artist past row 1000 shows 0).
async function fetchAllPublishedSongs<T>(columns: string): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  let offset = 0;
  const client = getClient();
  while (true) {
    const { data, error } = await client
      .from("songs")
      .select(columns)
      .eq("status", "published")
      .range(offset, offset + pageSize - 1);
    if (error || !data || data.length === 0) break;
    out.push(...(data as unknown as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

// Returns {artist, count}[] aggregated client-side from a slim artist-only
// select. Keeps payload ~50KB even with thousands of songs, so the cache works.
export const getArtistSongCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    if (!hasEnvVars) return {};
    const rows = await fetchAllPublishedSongs<{ artist: string }>("artist");
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const key = row.artist.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  },
  ["artist-song-counts"],
  { revalidate: 1800, tags: ["songs"] },
);

// Aggregate popularity per artist, keyed by artist.toLowerCase().
// Returns avg + total source_views across published songs. Songs with NULL
// views count as 0 so a single hit doesn't get inflated via avg bias.
export const getArtistPopularity = unstable_cache(
  async (): Promise<Record<string, { avg: number; total: number; count: number }>> => {
    if (!hasEnvVars) return {};
    const rows = await fetchAllPublishedSongs<{ artist: string; source_views: number | null }>("artist, source_views");
    const agg: Record<string, { total: number; count: number }> = {};
    for (const row of rows) {
      const key = row.artist.toLowerCase();
      const v = Number.isFinite(row.source_views as number) ? (row.source_views as number) : 0;
      if (!agg[key]) agg[key] = { total: 0, count: 0 };
      agg[key].total += v;
      agg[key].count += 1;
    }
    const out: Record<string, { avg: number; total: number; count: number }> = {};
    for (const [k, v] of Object.entries(agg)) {
      out[k] = { avg: v.count > 0 ? v.total / v.count : 0, total: v.total, count: v.count };
    }
    return out;
  },
  ["artist-popularity"],
  { revalidate: 1800, tags: ["songs"] },
);

// Look up canonical artist names whose alias array contains a value matching
// the search query (case-insensitive substring). Used to expand the search so
// that "DZIDZIO" also returns songs by "Дзідзьо".
async function resolveArtistNamesByAlias(q: string): Promise<string[]> {
  if (!hasEnvVars || !q || q.length < 2) return [];
  const { data } = await getClient()
    .from("artists")
    .select("name, aliases")
    .not("aliases", "is", null);
  if (!data) return [];
  const needle = q.toLowerCase();
  const out: string[] = [];
  for (const row of data as { name: string; aliases: string[] | null }[]) {
    const als = row.aliases ?? [];
    if (als.some(a => a.toLowerCase().includes(needle))) out.push(row.name);
  }
  return out;
}

export const getSongsPage = unstable_cache(
  async (args: SongsPageArgs = {}): Promise<{ songs: Song[]; total: number }> => {
    if (!hasEnvVars) return { songs: [], total: 0 };
    const { q = "", difficulty, sortBy = "views", offset = 0, limit = 50 } = args;
    let qry = getClient()
      .from("songs")
      .select(SONG_LIST_COLUMNS, { count: "exact" })
      .eq("status", "published");
    if (difficulty) qry = qry.eq("difficulty", difficulty);
    if (q) {
      // Resolve aliases: if the query matches an artist's alias (e.g. "DZIDZIO"),
      // also search songs whose artist equals the canonical name ("Дзідзьо").
      const canonicalNames = await resolveArtistNamesByAlias(q);
      const escaped = q.replace(/[%,()]/g, "\\$&");
      const clauses = [
        `title.ilike.%${escaped}%`,
        `artist.ilike.%${escaped}%`,
        ...canonicalNames.map(n => `artist.eq.${n.replace(/[,()]/g, "\\$&")}`),
      ];
      // Lyrics search activates for queries of 3+ chars (avoids matching
      // every "a"/"і" in the catalogue and keeps trigram index efficient).
      if (q.length >= 3) clauses.push(`lyrics_text.ilike.%${escaped}%`);
      qry = qry.or(clauses.join(","));
    }
    if (sortBy === "created_at_desc") qry = qry.order("created_at", { ascending: false });
    else if (sortBy === "created_at_asc") qry = qry.order("created_at", { ascending: true });
    else if (sortBy === "source_popularity") qry = qry.order("source_popularity", { ascending: false, nullsFirst: false });
    else if (sortBy === "source_views") qry = qry.order("source_views", { ascending: false, nullsFirst: false });
    else if (sortBy === "title_asc") qry = qry.order("title", { ascending: true });
    else qry = qry.order("views", { ascending: false });
    const { data, count, error } = await qry.range(offset, offset + limit - 1);
    if (error || !data) return { songs: [], total: 0 };
    return { songs: data.map(mapRow), total: count ?? data.length };
  },
  ["songs-page"],
  { revalidate: 600, tags: ["songs"] },
);

export const getFreshSongs = unstable_cache(
  async (limit = 4): Promise<Song[]> => {
    if (!hasEnvVars) return [];
    const { data, error } = await getClient()
      .from("songs")
      .select(SONG_LIST_COLUMNS)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(mapRow);
  },
  ["fresh-songs"],
  { revalidate: 1800, tags: ["songs"] },
);

export const getSongsByArtist = unstable_cache(
  async (
    artist: string,
    options?: { excludeSlug?: string; limit?: number; sortBy?: SortBy },
  ): Promise<Song[]> => {
    if (!hasEnvVars) return [];
    let q = getClient()
      .from("songs")
      .select(SONG_LIST_COLUMNS)
      .eq("status", "published")
      .eq("artist", artist);
    const s = options?.sortBy ?? "views";
    if (s === "created_at_desc") q = q.order("created_at", { ascending: false });
    else if (s === "created_at_asc") q = q.order("created_at", { ascending: true });
    else if (s === "source_popularity") q = q.order("source_popularity", { ascending: false, nullsFirst: false });
    else if (s === "source_views") q = q.order("source_views", { ascending: false, nullsFirst: false });
    else if (s === "title_asc") q = q.order("title", { ascending: true });
    else q = q.order("views", { ascending: false });
    if (options?.excludeSlug) q = q.neq("slug", options.excludeSlug);
    if (options?.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(mapRow);
  },
  ["songs-by-artist"],
  { revalidate: 1800, tags: ["songs"] },
);

// Song + all of its published variants. The viewer decides which variant to
// render based on a `?v=<id>` query param; default is primary.
export const getSongBySlug = unstable_cache(
  async (slug: string): Promise<Song | undefined> => {
    if (!hasEnvVars) return undefined;
    const { data, error } = await getClient()
      .from("songs")
      .select(`${SONG_COLUMNS}, song_variants!song_variants_song_id_fkey(${VARIANT_COLUMNS})`)
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    if (error || !data) return undefined;
    return mapRow(data as Record<string, unknown>);
  },
  ["song-by-slug"],
  { revalidate: 3600, tags: ["songs"] },
);

// Apply an active variant on top of the base song fields — swaps sections,
// chords, key, capo, tempo, strumming. Falls back to song-level values when
// the variant is missing or primary.
export function applyVariant(song: Song, variantId: string | undefined): Song {
  if (!song.variants || song.variants.length === 0) return song;
  const target =
    (variantId && song.variants.find((v) => v.id === variantId)) ||
    song.variants.find((v) => v.isPrimary) ||
    song.variants[0];
  if (!target) return song;
  return {
    ...song,
    sections: target.sections,
    chords: target.chords.length > 0 ? target.chords : song.chords,
    key: target.key,
    capo: target.capo ?? song.capo,
    tempo: target.tempo ?? song.tempo,
    strumming: target.strumming ?? song.strumming,
    activeVariantId: target.id,
  };
}
