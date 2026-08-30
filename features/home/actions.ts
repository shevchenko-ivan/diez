"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyPlaylists, getSavedSlugs } from "@/features/playlist/actions/playlists";
import type { Playlist } from "@/features/playlist/types";

// The home page is force-static (see app/page.tsx), so everything personal
// moved behind these actions: client islands call them after mount, and only
// for visitors that actually carry a Supabase auth cookie.

export interface MySongRow {
  id: string;
  slug: string;
  title: string;
  artist: string;
  status: string;
  cover_image: string | null;
  cover_color: string | null;
}

/** Saved-song slugs as an array — Set doesn't cross the action boundary. */
export async function getSavedSlugsList(): Promise<string[]> {
  return Array.from(await getSavedSlugs());
}

/** The two personal home-page sections in one round trip. */
export async function getPersonalHomeData(): Promise<{
  mySongs: MySongRow[];
  myPlaylists: Playlist[];
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { mySongs: [], myPlaylists: [] };

  const [songsRes, myPlaylists] = await Promise.all([
    supabase
      .from("songs")
      .select("id, slug, title, artist, status, cover_image, cover_color")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    getMyPlaylists(),
  ]);

  return { mySongs: (songsRes.data ?? []) as MySongRow[], myPlaylists };
}
