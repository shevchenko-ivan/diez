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
    .select("id, slug, name, photo_url")
    .order("name")
    .limit(limit);
  if (error || !data) return [];
  return data as Artist[];
}

export async function getArtistBySlug(slug: string): Promise<Artist | undefined> {
  if (!hasEnvVars) return undefined;
  const { data, error } = await getClient()
    .from("artists")
    .select("id, slug, name, photo_url, bio, genre")
    .eq("slug", slug)
    .single();
  if (error || !data) return undefined;
  return data as Artist;
}
