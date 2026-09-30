import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, read-only view of a Diez user: the display name and avatar they set
// in their profile, plus what they contributed. `profiles` is not readable
// under the anon RLS policy (it also holds e-mail), so this goes through the
// service client and returns only the public fields. Admin accounts are never
// exposed as authors: scraped and catalogue variants carry the admin's id.

export type PublicAuthor = { id: string; name: string };

export type PublicProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  songs: { slug: string; title: string; artist: string; cover: string | null }[];
  variants: { slug: string; title: string; artist: string; variantId: string; label: string }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** id → public author, for the ids that belong to regular users with a name. */
export async function getPublicAuthors(ids: string[]): Promise<Record<string, PublicAuthor>> {
  const unique = [...new Set(ids.filter((id) => UUID_RE.test(id)))];
  if (unique.length === 0) return {};
  try {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("id, username, is_admin")
      .in("id", unique);
    const out: Record<string, PublicAuthor> = {};
    for (const p of data ?? []) {
      const name = (p.username as string | null)?.trim();
      if (p.is_admin || !name) continue;
      out[p.id as string] = { id: p.id as string, name };
    }
    return out;
  } catch {
    // Attribution is decoration: a missing service key (local dev) or a
    // hiccup must never take a song page down.
    return {};
  }
}

export const getPublicProfile = unstable_cache(
  async (id: string): Promise<PublicProfile | null> => {
    if (!UUID_RE.test(id)) return null;
    const admin = createAdminClient();
    const { data: p } = await admin
      .from("profiles")
      .select("id, username, avatar_url, is_admin, created_at")
      .eq("id", id)
      .maybeSingle();
    const name = (p?.username as string | null)?.trim();
    if (!p || p.is_admin || !name) return null;

    const [{ data: songRows }, { data: variantRows }] = await Promise.all([
      admin
        .from("songs")
        .select("slug, title, artist, cover_image, created_at")
        .eq("submitted_by", id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("song_variants")
        .select("id, label, created_at, songs!song_variants_song_id_fkey!inner(slug, title, artist, status, submitted_by, primary_variant_id)")
        .eq("author_id", id)
        .eq("songs.status", "published")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const variants: PublicProfile["variants"] = [];
    for (const v of variantRows ?? []) {
      const s = (Array.isArray(v.songs) ? v.songs[0] : v.songs) as
        | { slug: string; title: string; artist: string; submitted_by: string | null; primary_variant_id: string | null }
        | undefined;
      // The primary variant of their own song is the song itself — listed above.
      if (!s || (s.submitted_by === id && s.primary_variant_id === v.id)) continue;
      variants.push({ slug: s.slug, title: s.title, artist: s.artist, variantId: v.id as string, label: v.label as string });
    }

    return {
      id,
      name,
      avatarUrl: (p.avatar_url as string | null) ?? null,
      joinedAt: (p.created_at as string | null) ?? null,
      songs: (songRows ?? []).map((s) => ({
        slug: s.slug as string,
        title: s.title as string,
        artist: s.artist as string,
        cover: (s.cover_image as string | null) ?? null,
      })),
      variants,
    };
  },
  ["public-profile"],
  { revalidate: 86400, tags: ["songs"] },
);
