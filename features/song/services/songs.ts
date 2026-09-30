import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { type Song, type SongSection, type SongVariant, type Difficulty, type StrumPattern, type Stroke, type NoteLength } from "../types";
import { hasEnvVars } from "@/lib/utils";
import { parseLyricsWithChords } from "../lib/parseLyrics";
import { normalizeForSearch } from "../lib/translit";
import type { ChordDef } from "../data/chord-templates";
import { getTopicBySlug, type Topic } from "../data/topics";
import { noBarreShift } from "../lib/barre";
import { getPublicAuthors } from "@/features/profile/services/public-profile";

// Public read-only client — no auth needed for published song reads.
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const SONG_COLUMNS =
  "id, slug, title, artist, album, genre, key, capo, time_signature, difficulty, chords, views, sections, cover_image, cover_color, youtube_id, primary_variant_id, created_at";

// Slim column set for list views — excludes heavy JSONB (sections) so the
// cached payload stays under Next.js's 2MB unstable_cache limit.
const SONG_LIST_COLUMNS =
  "slug, title, artist, album, genre, key, capo, time_signature, difficulty, chords, views, cover_image, cover_color, youtube_id, primary_variant_id";

// `chord_voicings` is added by migration 022. Older deployments may not have
// it yet — `getSongBySlug` retries with this fallback list on column-missing
// errors so the public viewer keeps working until the migration is applied.
const VARIANT_COLUMNS_BASE =
  "id, label, sections, chords, key, capo, views, created_at, author_id";
const VARIANT_COLUMNS =
  `${VARIANT_COLUMNS_BASE}, chord_voicings, custom_voicings`;

// Re-parse sections from the stored `raw` text so old rows (saved in the
// previous word-aligned format) render with the new column-preserving parser.
// Also returns the chord list extracted by the current parser — important
// whenever the parser's chord-recognition regex is extended (e.g. new qualities
// like Cmaj7#11 that older saves couldn't tokenize), so the chord sidebar
// stays in sync with what's actually rendered on the page.
function resolveSectionsAndChords(
  value: unknown,
  storedChords: string[] | null,
): { sections: SongSection[]; chords: string[] } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.raw === "string") {
      const parsed = parseLyricsWithChords(obj.raw);
      return { sections: parsed.sections, chords: parsed.chords };
    }
    if (Array.isArray(obj.sections)) {
      return { sections: obj.sections as SongSection[], chords: storedChords ?? [] };
    }
  }
  if (Array.isArray(value)) {
    return { sections: value as SongSection[], chords: storedChords ?? [] };
  }
  return { sections: [], chords: storedChords ?? [] };
}

function mapVariantRow(row: Record<string, unknown>, primaryId: string | null): SongVariant {
  const id = row.id as string;
  const resolved = resolveSectionsAndChords(
    row.sections,
    (row.chords as string[] | null) ?? null,
  );
  const rawVoicings = row.chord_voicings;
  const chordVoicings =
    rawVoicings && typeof rawVoicings === "object" && !Array.isArray(rawVoicings)
      ? (rawVoicings as Record<string, number>)
      : undefined;
  const rawCustom = row.custom_voicings;
  const customVoicings =
    rawCustom && typeof rawCustom === "object" && !Array.isArray(rawCustom)
      ? (rawCustom as Record<string, ChordDef>)
      : undefined;
  return {
    id,
    label: row.label as string,
    sections: resolved.sections,
    chords: resolved.chords,
    key: row.key as string,
    capo: (row.capo as number | null) ?? undefined,
    views: (row.views as number | null) ?? 0,
    createdAt: row.created_at as string,
    isPrimary: id === primaryId,
    chordVoicings,
    customVoicings,
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

  const resolved = resolveSectionsAndChords(
    row.sections,
    (row.chords as string[] | null) ?? null,
  );

  return {
    slug: row.slug as string,
    title: row.title as string,
    artist: row.artist as string,
    album: (row.album as string | null) ?? undefined,
    genre: row.genre as string,
    key: row.key as string,
    capo: (row.capo as number | null) ?? undefined,
    timeSignature: (row.time_signature as string | null) ?? undefined,
    difficulty: row.difficulty as Difficulty,
    chords: resolved.chords,
    views: row.views as number,
    sourceViews: typeof row.source_views === "number" ? row.source_views : undefined,
    sections: resolved.sections,
    coverImage: (row.cover_image as string | null) ?? undefined,
    coverColor: (row.cover_color as string | null) ?? undefined,
    youtubeId: (row.youtube_id as string | null) ?? undefined,
    // `created_at` is exposed on Song so the song-detail page can stamp it
    // into the VideoObject `uploadDate` field — Google's structured-data
    // checker rejects date-only or missing-timezone values.
    createdAt: (row.created_at as string | null) ?? undefined,
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
  /** Topic slug from features/song/data/topics.ts; filters to that topic's songs. */
  topic?: string;
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

/**
 * All published songs with the minimum columns needed for an image-sitemap
 * entry. Separate from `getAllSongSlugs` so we don't bloat the cached payload
 * for callers that only need slugs (sitemap of pages, route-revalidation, …).
 */
export const getAllSongCovers = unstable_cache(
  async (): Promise<{ slug: string; title: string; artist: string; cover_image: string | null; updated_at: string | null }[]> => {
    if (!hasEnvVars) return [];
    // `updated_at` is included so sitemap.ts can emit per-URL `<lastmod>`
    // values. Google trusts a real changing lastmod ~10× more than a
    // global `new Date()` — uncrawled pages with stale lastmod get
    // re-prioritised when the value actually moves.
    return fetchAllPublishedSongs<{ slug: string; title: string; artist: string; cover_image: string | null; updated_at: string | null }>(
      "slug, title, artist, cover_image, updated_at",
    );
  },
  ["all-song-covers"],
  { revalidate: 3600, tags: ["songs"] },
);

// Paginate through all published-song rows for a given column set.
// Supabase caps a single select at 1000 rows — without this helper, aggregates
// over the full songs table silently truncate (any artist past row 1000 shows 0).
async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  const client = getClient();
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as T[]));
    if (data.length < pageSize) break;
  }
  return out;
}

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
      // Stable order is required for correct pagination: .range() without
      // .order() lets Postgres return nondeterministic page boundaries, so
      // rows can repeat or vanish between pages (and this helper feeds the
      // sitemap, where duplicates/missing URLs are directly visible to
      // crawlers).
      .order("id", { ascending: true })
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

// Look up canonical artist names matching the search query. Matches against
// aliases (case-insensitive substring) AND a transliterated, punctuation-free
// form of the name, so that "DZIDZIO" → "Дзідзьо" and "оторвальд" → "O.Torvald"
// both expand the search to the right artist.
async function resolveArtistNamesByAlias(q: string): Promise<string[]> {
  if (!hasEnvVars || !q || q.length < 2) return [];
  const { data } = await getClient()
    .from("artists")
    .select("name, aliases");
  if (!data) return [];
  const needle = q.toLowerCase();
  const nq = normalizeForSearch(q);
  const out: string[] = [];
  for (const row of data as { name: string; aliases: string[] | null }[]) {
    const als = row.aliases ?? [];
    const aliasMatch = als.some(
      (a) => a.toLowerCase().includes(needle) || (nq.length >= 3 && normalizeForSearch(a).includes(nq)),
    );
    const nameMatch = nq.length >= 3 && normalizeForSearch(row.name).includes(nq);
    if (aliasMatch || nameMatch) out.push(row.name);
  }
  return out;
}

// «Для початківців»: every song that a beginner can play without barre —
// as written, or after the beginner mode's transposition — judged on its
// EASIEST variant, not only the primary one. Many hits are stored in an
// awkward key (Відпусти: Gm A# Cm) while a community variant plays them in
// Am/Em; that variant is what the list should open.
// Picks prefer: barre-free as written > needs transposing; then the primary
// variant; then the most-viewed one.
export type BeginnerPick = { slug: string; variantId: string | null };

const getBeginnerPicks = unstable_cache(
  async (): Promise<BeginnerPick[]> => {
    if (!hasEnvVars) return [];
    const songs = await fetchAllPublishedSongs<{
      id: string; slug: string; chords: string[] | null; primary_variant_id: string | null;
    }>("id, slug, chords, primary_variant_id");
    const variants = await fetchAllRows<{
      id: string; song_id: string; chords: string[] | null; views: number | null;
    }>("song_variants", "id, song_id, chords, views");
    const bySong = new Map<string, typeof variants>();
    for (const v of variants) {
      const list = bySong.get(v.song_id);
      if (list) list.push(v);
      else bySong.set(v.song_id, [v]);
    }
    const picks: BeginnerPick[] = [];
    for (const song of songs) {
      const list = bySong.get(song.id);
      if (!list || list.length === 0) {
        if (noBarreShift(song.chords) !== null) picks.push({ slug: song.slug, variantId: null });
        continue;
      }
      const primaryId = song.primary_variant_id ?? list[0].id;
      let best: { rank: [number, number, number]; id: string } | null = null;
      for (const v of list) {
        const shift = noBarreShift(v.chords);
        if (shift === null) continue;
        const rank: [number, number, number] = [shift === 0 ? 0 : 1, v.id === primaryId ? 0 : 1, -(v.views ?? 0)];
        if (!best || rank[0] < best.rank[0] || (rank[0] === best.rank[0] && (rank[1] < best.rank[1] || (rank[1] === best.rank[1] && rank[2] < best.rank[2])))) {
          best = { rank, id: v.id };
        }
      }
      if (best) picks.push({ slug: song.slug, variantId: best.id === primaryId ? null : best.id });
    }
    return picks;
  },
  ["beginner-picks"],
  { revalidate: 3600, tags: ["songs"] },
);

const getNoBarreSlugs = async (): Promise<string[]> =>
  (await getBeginnerPicks()).map((p) => p.slug);

/** slug → variant to open, for picks whose easiest variant isn't primary. */
export async function getBeginnerVariantMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const p of await getBeginnerPicks()) if (p.variantId) map[p.slug] = p.variantId;
  return map;
}

// Slug list for songs playable with at most `max` unique chords — the
// «Пісні на 3 акорди» topic. Same shape as getNoBarreSlugs above; the arg is
// part of the cache key, so different `max` values cache independently.
const getMaxChordsSlugs = unstable_cache(
  async (max: number): Promise<string[]> => {
    if (!hasEnvVars) return [];
    const rows = await fetchAllPublishedSongs<{ slug: string; chords: string[] | null }>(
      "slug, chords",
    );
    return rows
      .filter((r) => {
        const unique = new Set(r.chords ?? []);
        return unique.size > 0 && unique.size <= max;
      })
      .map((r) => r.slug);
  },
  ["max-chords-slugs"],
  { revalidate: 1800, tags: ["songs"] },
);

// Resolve a Topic into a `slug IN (...)` set so the page query can paginate
// and sort like any other listing. Returns null when the topic has no
// matching songs, which the caller renders as an empty result.
async function resolveTopicSlugs(topic: Topic): Promise<string[] | null> {
  if (topic.match.kind === "slugs") return topic.match.slugs;
  if (topic.match.kind === "no-barre") return await getNoBarreSlugs();
  if (topic.match.kind === "max-chords") return await getMaxChordsSlugs(topic.match.max);
  if (topic.match.kind === "artists") {
    const { data } = await getClient()
      .from("songs")
      .select("slug")
      .eq("status", "published")
      .in("artist", topic.match.artists);
    return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
  }
  return null;
}

async function fetchSongsPage(args: SongsPageArgs = {}): Promise<{ songs: Song[]; total: number }> {
  if (!hasEnvVars) return { songs: [], total: 0 };
  const { q = "", difficulty, sortBy = "views", offset = 0, limit = 50, topic } = args;
  // songs_search = published-only view with owner rights: under the anon RLS
  // policy the ILIKE search patterns can't use the trigram indexes (ILIKE is
  // not leakproof) and every uncached search seq-scans the catalogue.
  let topicSlugs: string[] | null = null;
  if (topic) {
    const t = getTopicBySlug(topic);
    if (!t) return { songs: [], total: 0 };
    topicSlugs = await resolveTopicSlugs(t);
    if (!topicSlugs || topicSlugs.length === 0) return { songs: [], total: 0 };
  }
  // A topic of a few hundred songs filters in SQL (`slug IN (...)`). A bigger
  // one (the beginner list is ~1000) would overflow the request URL, so it
  // walks the sorted slug column instead and fetches only the visible page.
  const bigTopic = topicSlugs !== null && topicSlugs.length > MAX_IN_SLUGS;
  const canonicalNames = q ? await resolveArtistNamesByAlias(q) : [];

  const applyFilters = (base: SongsQuery): SongsQuery => {
    type Q = SongsQuery;
    let qry = base;
    if (topicSlugs && !bigTopic) qry = qry.in("slug", topicSlugs) as Q;
    if (difficulty) qry = qry.eq("difficulty", difficulty) as Q;
  if (q) {
    // Token-AND search: split on whitespace and require EACH token to match
    // somewhere (title OR artist OR lyrics_text). Natural multi-word queries
    // like "Скрябін Мам" then work — token1 matches artist, token2 matches
    // title — even though the full phrase isn't in any single column.
    // Aliases are still resolved against the full query (e.g. "DZIDZIO" →
    // canonical "Дзідзьо") and OR'd into the FIRST token's clause so a
    // matching artist still appears regardless of other tokens.
    const tokens = q.trim().split(/\s+/).filter((t) => t.length >= 2);
    const usedTokens = tokens.length ? tokens : [q]; // fallback for 1-char queries
    usedTokens.forEach((token, i) => {
      const escaped = token.replace(/[%,()]/g, "\\$&");
      const clauses = [
        `title.ilike.%${escaped}%`,
        `artist.ilike.%${escaped}%`,
      ];
      // Lyrics search activates for tokens of 3+ chars (avoids matching every
      // "a"/"і" in the catalogue and keeps trigram index efficient).
      if (token.length >= 3) clauses.push(`lyrics_text.ilike.%${escaped}%`);
      // Alias-resolved canonical artist names attach to the first token's
      // OR group — that's enough to surface alias-matched songs without
      // having to repeat them across every token.
      if (i === 0) {
        clauses.push(
          ...canonicalNames.map((n) => `artist.eq.${n.replace(/[,()]/g, "\\$&")}`),
        );
      }
      qry = qry.or(clauses.join(",")) as Q;
    });
  }
  if (sortBy === "created_at_desc") qry = qry.order("created_at", { ascending: false }) as Q;
  else if (sortBy === "created_at_asc") qry = qry.order("created_at", { ascending: true }) as Q;
  else if (sortBy === "source_popularity") qry = qry.order("source_popularity", { ascending: false, nullsFirst: false }) as Q;
  else if (sortBy === "source_views") qry = qry.order("source_views", { ascending: false, nullsFirst: false }) as Q;
  else if (sortBy === "title_asc") qry = qry.order("title_sort", { ascending: true }) as Q;
  else qry = qry.order("views", { ascending: false }) as Q;
  // Tie-breaker: without it equal sort keys page nondeterministically.
  return qry.order("slug", { ascending: true }) as Q;
  };

  if (bigTopic) {
    const wanted = new Set(topicSlugs);
    const ordered: string[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await applyFilters(getClient().from("songs_search").select("slug") as SongsQuery)
        .range(from, from + pageSize - 1);
      if (error || !data) return { songs: [], total: 0 };
      for (const r of data as { slug: string }[]) if (wanted.has(r.slug)) ordered.push(r.slug);
      if (data.length < pageSize) break;
    }
    const page = ordered.slice(offset, offset + limit);
    if (page.length === 0) return { songs: [], total: ordered.length };
    const { data, error } = await getClient().from("songs_search").select(SONG_LIST_COLUMNS).in("slug", page);
    if (error || !data) return { songs: [], total: 0 };
    const pos = new Map(page.map((slug, i) => [slug, i]));
    const rows = (data as unknown as Record<string, unknown>[])
      .slice()
      .sort((a, b) => (pos.get(a.slug as string) ?? 0) - (pos.get(b.slug as string) ?? 0));
    return { songs: rows.map(mapRow), total: ordered.length };
  }

  const { data, count, error } = await applyFilters(
    getClient().from("songs_search").select(SONG_LIST_COLUMNS, { count: "exact" }) as SongsQuery,
  ).range(offset, offset + limit - 1);
  if (error || !data) return { songs: [], total: 0 };
  return { songs: (data as unknown as Record<string, unknown>[]).map(mapRow), total: count ?? data.length };
}

// PostgREST puts `slug IN (...)` in the URL; a few hundred slugs is safe.
const MAX_IN_SLUGS = 300;

type SongsQuery = ReturnType<ReturnType<ReturnType<typeof getClient>["from"]>["select"]>;

// Cached only for the FINITE key space (sort × difficulty × topic × offset).
// unstable_cache keys on every argument, so caching free-text searches too
// minted one durable cache entry per distinct query string users typed —
// and each entry was rewritten every 10 minutes. That was the bulk of the
// 289K ISR writes (limit 200K) behind the 17.09.2026 Hobby fair-use block.
// Searches now hit the database directly (trigram-indexed, ~100 ms); the
// shared listings keep an hour-long cache — admin saves still call
// revalidateTag("songs"), so new songs appear immediately regardless.
const getSongsPageCached = unstable_cache(fetchSongsPage, ["songs-page"], {
  revalidate: 3600,
  tags: ["songs"],
});

export async function getSongsPage(
  args: SongsPageArgs = {},
): Promise<{ songs: Song[]; total: number }> {
  return args.q ? fetchSongsPage(args) : getSongsPageCached(args);
}

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
    // created_at + source_views ride along so the (static) artist page can
    // re-sort the list on the client — see app/artists/[slug]/ArtistSongsList.
    let q = getClient()
      .from("songs")
      .select(`${SONG_LIST_COLUMNS}, created_at, source_views`)
      .eq("status", "published")
      .eq("artist", artist);
    const s = options?.sortBy ?? "views";
    if (s === "created_at_desc") q = q.order("created_at", { ascending: false });
    else if (s === "created_at_asc") q = q.order("created_at", { ascending: true });
    else if (s === "source_popularity") q = q.order("source_popularity", { ascending: false, nullsFirst: false });
    else if (s === "source_views") q = q.order("source_views", { ascending: false, nullsFirst: false });
    else if (s === "title_asc") q = q.order("title_sort", { ascending: true });
    else q = q.order("views", { ascending: false });
    if (options?.excludeSlug) q = q.neq("slug", options.excludeSlug);
    if (options?.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(mapRow);
  },
  ["songs-by-artist"],
  { revalidate: 86400, tags: ["songs"] },  // 24 h — read on ISR pages; tag-invalidated on every mutation
);

/**
 * Songs whose chord array contains one specific chord — the song list on the
 * /chords/<slug> dictionary pages. NOT getSongsSharingChords: that one ranks
 * and filters by ≥3-chord overlap with a seed song, so a single-chord seed
 * always comes back empty. `.contains` (Postgres `@>`) keeps the filter on
 * the database side; popularity order, small slice.
 */
export const getSongsWithChord = unstable_cache(
  async (chord: string, limit = 12): Promise<Song[]> => {
    if (!hasEnvVars) return [];
    const { data, error } = await getClient()
      .from("songs")
      .select(SONG_LIST_COLUMNS)
      .eq("status", "published")
      .contains("chords", [chord])
      .order("views", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(mapRow);
  },
  ["songs-with-chord"],
  { revalidate: 86400, tags: ["songs"] },  // 24 h — read on ISR pages; tag-invalidated on every mutation
);

/**
 * Songs that share **chords** with a given song — used for the
 * "Пісні з тими ж акордами" internal-linking block on song-detail pages.
 *
 * Strategy: pull rows whose `chords` array overlaps with the seed song's
 * chord list, then sort client-side by overlap count desc. This produces
 * songs that are most similar harmonically, which is a far stronger
 * "you might also like" signal than same-artist (which we render
 * separately).
 *
 * Postgres `&&` array-overlap operator via `.overlaps()` filters before
 * Postgres hits 1000 rows, so this stays cheap even on the full catalog.
 */
export const getSongsSharingChords = unstable_cache(
  async (
    chords: string[],
    options: { excludeSlug: string; limit?: number },
  ): Promise<Song[]> => {
    if (!hasEnvVars) return [];
    if (!chords || chords.length === 0) return [];
    const seed = new Set(chords);
    const { data, error } = await getClient()
      .from("songs")
      .select(SONG_LIST_COLUMNS)
      .eq("status", "published")
      .neq("slug", options.excludeSlug)
      .overlaps("chords", chords)
      .order("views", { ascending: false })
      .limit((options.limit ?? 4) * 8);
    if (error || !data) return [];
    // Rank by overlap count desc, then by views (preserved from query).
    return data
      .map((row) => {
        const song = mapRow(row);
        const overlap = (song.chords ?? []).reduce(
          (n, c) => (seed.has(c) ? n + 1 : n),
          0,
        );
        return { song, overlap };
      })
      .filter((x) => x.overlap >= 3) // require at least 3 shared chords
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, options.limit ?? 4)
      .map((x) => x.song);
  },
  ["songs-sharing-chords"],
  { revalidate: 86400, tags: ["songs"] },  // 24 h — read on ISR pages; tag-invalidated on every mutation
);

// Song + all of its published variants. The viewer decides which variant to
// render based on a `?v=<id>` query param; default is primary.
// Not using unstable_cache here — in Next.js 16 its tag-based invalidation
// via revalidateTag is flaky after server actions, so admin edits to tempo/
// strumming appeared stale on the viewer. Direct fetch is fast enough and
// the result is per-request-deduped by Next automatically.
/**
 * Old-slug lookup for permanent redirects (migration 030 renamed ~110
 * timestamp slugs to {title}-{artist}). Consulted only after getSongBySlug
 * misses, so the happy path pays nothing. Deliberately swallows every error:
 * this code deploys BEFORE the migration that creates the table, and a
 * missing-relation error here must read as "no redirect", not a crash.
 */
export async function getSongSlugRedirect(slug: string): Promise<string | null> {
  if (!hasEnvVars) return null;
  const { data, error } = await getClient()
    .from("slug_redirects")
    .select("new_slug")
    .eq("old_slug", slug)
    .maybeSingle();
  // Throw rather than return null on a DB error: this runs inside the ISR
  // render of an unknown slug, and null here means notFound() → a cached 404
  // for a day where a 308 belonged.
  if (error) throw new Error(`getSongSlugRedirect(${slug}) failed: ${error.message}`);
  return (data?.new_slug as string | undefined) ?? null;
}

export async function getSongBySlug(slug: string): Promise<Song | undefined> {
  if (!hasEnvVars) return undefined;
  const client = getClient();
  // 42703 = undefined_column. Retry without chord_voicings if migration 022
  // hasn't been applied yet (keeps the public site online during rollout).
  // Use `any` casts on results — the two selects differ in inferred shape by
  // exactly one nullable column, which we re-narrow downstream via `mapRow`.
  let data: unknown = null;
  let error: { code?: string; message?: string } | null = null;
  {
    const res = await client
      .from("songs")
      .select(`${SONG_COLUMNS}, song_variants!song_variants_song_id_fkey(${VARIANT_COLUMNS})`)
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    data = res.data;
    error = res.error;
  }
  if (error && error.code === "42703") {
    const retry = await client
      .from("songs")
      .select(`${SONG_COLUMNS}, song_variants!song_variants_song_id_fkey(${VARIANT_COLUMNS_BASE})`)
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    data = retry.data;
    error = retry.error;
  }
  // PGRST116 = "no rows" — the only error that means "this song does not
  // exist". Anything else (timeout, 5xx, RLS hiccup) is thrown: the caller is
  // an ISR render, and `undefined` there becomes a notFound() that Next
  // caches for a day — a sticky 404 on a live, sitemap-listed URL. A thrown
  // error fails just this render instead (Next keeps any previous copy).
  if (error && error.code !== "PGRST116") {
    throw new Error(`getSongBySlug(${slug}) failed: ${error.message ?? error.code}`);
  }
  if (!data) return undefined;
  const song = mapRow(data as Record<string, unknown>);

  // Fetch rich strumming patterns separately (the table is small, the join
  // would bloat the row payload, and missing patterns are not an error).
  const songId = (data as Record<string, unknown>).id as string | undefined;
  // The row id rides along only on the single-song fetch: the song page's
  // admin "Редагувати" link is built on the client now (the page is ISR and
  // can't check the viewer's role at render time), and it needs the id.
  if (songId) song.id = songId;

  // «Додав(ла)» in the variant switcher — only for contributions by users.
  const rawVariants = ((data as Record<string, unknown>).song_variants as Record<string, unknown>[] | undefined) ?? [];
  const authorOf = new Map(rawVariants.map((v) => [v.id as string, v.author_id as string | null]));
  if (song.variants && song.variants.length > 0) {
    const authors = await getPublicAuthors([...authorOf.values()].filter((a): a is string => !!a));
    for (const v of song.variants) {
      const a = authorOf.get(v.id);
      if (a && authors[a]) v.author = authors[a];
    }
  }

  if (songId) {
    const { data: patternRows } = await client
      .from("song_strumming_patterns")
      .select("id, position, name, tempo, note_length, strokes")
      .eq("song_id", songId)
      .order("position", { ascending: true });
    if (patternRows && patternRows.length > 0) {
      song.strumPatterns = patternRows.map(mapPatternRow);
    }
  }
  return song;
}

export function mapPatternRow(row: Record<string, unknown>): StrumPattern {
  const rawStrokes = (row.strokes as unknown[] | null) ?? [];
  const strokes: Stroke[] = rawStrokes
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => {
      const dir = (s.d as string) === "U" ? "U" : "D";
      const stroke: Stroke = { d: dir };
      if (s.a === true) stroke.a = true;
      if (s.m === true) stroke.m = true;
      if (s.r === true) stroke.r = true;
      return stroke;
    });
  return {
    id: row.id as string,
    position: (row.position as number) ?? 0,
    name: (row.name as string) ?? "Pattern",
    tempo: (row.tempo as number) ?? 100,
    noteLength: ((row.note_length as string) ?? "1/8") as NoteLength,
    strokes,
  };
}

// `applyVariant` moved to ../lib/variants (pure, client-safe); re-exported so
// existing server-side imports keep working.
export { applyVariant } from "../lib/variants";
