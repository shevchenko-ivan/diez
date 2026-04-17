"use server";

import { createClient } from "@/lib/supabase/server";

export type SaveResult =
  | { ok: true; saved: boolean }
  | { ok: false; reason: "auth" | "not_found" | "error" };

/**
 * Toggle a song in the user's "вибране" list.
 * Returns `{ ok: false, reason: "auth" }` if user is not signed in —
 * the client can show a sign-up modal.
 */
export async function toggleSavedSong(slug: string): Promise<SaveResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  // Resolve slug → song id
  const { data: song, error: songErr } = await supabase
    .from("songs")
    .select("id")
    .eq("slug", slug)
    .single();
  if (songErr || !song) return { ok: false, reason: "not_found" };

  // Is it already saved?
  const { data: existing } = await supabase
    .from("saved_songs")
    .select("song_id")
    .eq("user_id", user.id)
    .eq("song_id", song.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_songs")
      .delete()
      .eq("user_id", user.id)
      .eq("song_id", song.id);
    if (error) return { ok: false, reason: "error" };
    return { ok: true, saved: false };
  }

  const { error } = await supabase
    .from("saved_songs")
    .insert({ user_id: user.id, song_id: song.id });
  if (error) return { ok: false, reason: "error" };
  return { ok: true, saved: true };
}

/** Returns a Set of slugs the current user has saved. Empty for guests. */
export async function getSavedSlugs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("saved_songs")
    .select("songs!inner(slug)")
    .eq("user_id", user.id);

  if (error || !data) return new Set();
  // Supabase returns joined rows — shape: [{ songs: { slug: "..." } }]
  return new Set(
    (data as Array<{ songs: { slug: string } | { slug: string }[] }>)
      .flatMap((r) => (Array.isArray(r.songs) ? r.songs : [r.songs]))
      .map((s) => s.slug),
  );
}
