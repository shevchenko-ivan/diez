import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { hasEnvVars } from "@/lib/utils";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export interface Artist {
  id: string;
  slug: string;
  name: string;
  photo_url?: string;
  bio?: string;
  genre?: string;
  aliases?: string[];
}

export async function getAllArtists(): Promise<Artist[]> {
  if (!hasEnvVars) return [];
  const { data, error } = await getClient()
    .from("artists")
    .select("id, slug, name, photo_url, bio, genre")
    .order("name");
  if (error || !data) return [];
  return data as Artist[];
}

/**
 * All artists (with at least one published song) ranked by total source_views.
 * Cached for 30 min — the horizontal strip on the home page paginates through
 * this list, so we compute it once and slice client-side.
 */
export const getRankedArtists = unstable_cache(
  async (): Promise<Artist[]> => {
    if (!hasEnvVars) return [];
    const client = getClient();

    const totalsByArtist = new Map<string, { sum: number; count: number }>();
    let from = 0;
    const PAGE = 1000;
    for (let page = 0; page < 10; page++) {
      const { data, error } = await client
        .from("songs")
        .select("artist, source_views, views")
        .eq("status", "published")
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const row of data as { artist: string; source_views: number | null; views: number | null }[]) {
        // source_views (the eye-icon column in admin) — local `views`
        // is currently always 0. Fall back to local views if ever populated.
        const score = row.source_views ?? row.views ?? 0;
        const cur = totalsByArtist.get(row.artist) ?? { sum: 0, count: 0 };
        cur.sum += score;
        cur.count += 1;
        totalsByArtist.set(row.artist, cur);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const { data: artists, error: aErr } = await client
      .from("artists")
      .select("id, slug, name, photo_url, genre")
      .is("archived_at", null);
    if (aErr || !artists) return [];

    return (artists as Artist[])
      .map((a) => {
        const agg = totalsByArtist.get(a.name);
        return { artist: a, total: agg?.sum ?? 0, count: agg?.count ?? 0 };
      })
      .filter((x) => x.count > 0)
      .sort((a, b) => b.total - a.total)
      .map((x) => x.artist);
  },
  ["ranked-artists"],
  { revalidate: 1800, tags: ["songs", "artists"] },
);

export async function getArtists(limit = 12, offset = 0): Promise<Artist[]> {
  const ranked = await getRankedArtists();
  return ranked.slice(offset, offset + limit);
}

export async function getArtistBySlug(slug: string): Promise<Artist | undefined> {
  if (!hasEnvVars) return undefined;
  const { data, error } = await getClient()
    .from("artists")
    .select("id, slug, name, photo_url, bio, genre, aliases")
    .eq("slug", slug)
    .single();
  if (error || !data) return undefined;
  return data as Artist;
}

/**
 * Lookup artist by exact name (case-insensitive). Used to resolve the real
 * stored slug, since `slugify(name)` doesn't always match `artists.slug`
 * (some slugs were generated with a different transliterator or edited).
 */
export async function getArtistSlugByName(name: string): Promise<string | undefined> {
  if (!hasEnvVars || !name) return undefined;
  const client = getClient();
  // First try exact (case-insensitive) name match
  const { data: byName } = await client
    .from("artists")
    .select("slug")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (byName) return byName.slug as string;
  // Fallback: match against aliases array
  const { data: byAlias } = await client
    .from("artists")
    .select("slug")
    .contains("aliases", [name])
    .limit(1)
    .maybeSingle();
  return (byAlias?.slug as string | undefined) ?? undefined;
}
