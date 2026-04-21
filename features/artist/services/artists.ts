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

export async function getArtists(limit = 12): Promise<Artist[]> {
  if (!hasEnvVars) return [];
  const { data, error } = await getClient()
    .from("artists")
    .select("id, slug, name, photo_url, genre")
    .order("name")
    .limit(limit);
  if (error || !data) return [];
  return data as Artist[];
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
