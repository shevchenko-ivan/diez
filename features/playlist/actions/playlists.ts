"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Playlist, PlaylistSummary, PlaylistVisibility } from "../types";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; reason: "auth" | "not_found" | "forbidden" | "error"; message?: string };

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Lists + per-playlist membership for a given song (by slug). Guests get []. */
export async function getPlaylistsForSong(slug: string): Promise<PlaylistSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const songId = await resolveSongBySlug(slug);
  if (!songId) return [];

  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, is_default, visibility, playlist_songs!left(song_id)")
    .eq("owner_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const rels = (row.playlist_songs ?? []) as Array<{ song_id: string }>;
    return {
      id: row.id as string,
      name: row.name as string,
      isDefault: row.is_default as boolean,
      visibility: row.visibility as PlaylistVisibility,
      hasSong: rels.some((r) => r.song_id === songId),
    };
  });
}

/** Slugs of all songs the current user has in ANY playlist. Empty for guests. */
export async function getSavedSlugs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("playlist_songs")
    .select("songs!inner(slug), playlists!inner(owner_id)")
    .eq("playlists.owner_id", user.id);

  if (error || !data) return new Set();

  return new Set(
    (data as Array<{ songs: { slug: string } | { slug: string }[] }>)
      .flatMap((r) => (Array.isArray(r.songs) ? r.songs : [r.songs]))
      .map((s) => s.slug),
  );
}

/** Current user's playlists with song count + up to 3 cover previews. */
export async function getMyPlaylists(): Promise<Playlist[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("playlists")
    .select(`
      id, slug, name, description, visibility, is_default, owner_id, created_at, updated_at,
      playlist_songs(song_id, position, songs(cover_image, cover_color))
    `)
    .eq("owner_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const items = (row.playlist_songs ?? []) as Array<{
      position: number;
      songs: { cover_image: string | null; cover_color: string | null } | null;
    }>;
    const sorted = [...items].sort((a, b) => a.position - b.position);
    const coverImages = sorted
      .map((it) => it.songs?.cover_image ?? it.songs?.cover_color ?? null)
      .filter((x): x is string => !!x)
      .slice(0, 3);
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      visibility: row.visibility as PlaylistVisibility,
      isDefault: row.is_default as boolean,
      ownerId: row.owner_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      songCount: items.length,
      coverImages,
    };
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createPlaylist(input: {
  name: string;
  visibility?: PlaylistVisibility;
  description?: string;
}): Promise<ActionResult<{ id: string; name: string; visibility: PlaylistVisibility; isDefault: false }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const name = input.name.trim();
  if (!name) return { ok: false, reason: "error", message: "Назва не може бути порожньою" };

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      owner_id: user.id,
      name,
      visibility: input.visibility ?? "private",
      description: input.description?.trim() || null,
    })
    .select("id, name, visibility")
    .single();

  if (error || !data) return { ok: false, reason: "error", message: error?.message };

  revalidatePath("/profile/lists");
  return {
    ok: true,
    data: {
      id: data.id as string,
      name: data.name as string,
      visibility: data.visibility as PlaylistVisibility,
      isDefault: false,
    },
  };
}

export async function updatePlaylist(
  id: string,
  patch: { name?: string; description?: string | null; visibility?: PlaylistVisibility },
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  // Prevent renaming the default list.
  if (patch.name !== undefined) {
    const { data: pl } = await supabase
      .from("playlists")
      .select("is_default, owner_id")
      .eq("id", id)
      .single();
    if (!pl) return { ok: false, reason: "not_found" };
    if (pl.owner_id !== user.id) return { ok: false, reason: "forbidden" };
    if (pl.is_default) return { ok: false, reason: "forbidden", message: "Дефолтний список не можна перейменовувати" };
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.description !== undefined) update.description = patch.description?.trim() || null;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;

  const { error } = await supabase
    .from("playlists")
    .update(update)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { ok: false, reason: "error", message: error.message };

  revalidatePath("/profile/lists");
  revalidatePath(`/profile/lists/${id}`);
  return { ok: true, data: undefined };
}

export async function deletePlaylist(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("is_default", false);

  if (error) return { ok: false, reason: "error", message: error.message };

  revalidatePath("/profile/lists");
  return { ok: true, data: undefined };
}

// ─── Song ↔ Playlist ─────────────────────────────────────────────────────────

async function resolveSongBySlug(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("songs").select("id").eq("slug", slug).single();
  return data?.id ?? null;
}

/**
 * Set which playlists contain the song. `selectedIds` is the full desired set
 * of playlist IDs for this song. Anything missing is removed.
 * If the set ends up empty, the song is simply unsaved from everywhere.
 */
export async function setSongPlaylists(
  slug: string,
  selectedIds: string[],
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const songId = await resolveSongBySlug(slug);
  if (!songId) return { ok: false, reason: "not_found" };

  // Existing memberships for this song within user's playlists.
  const { data: existing } = await supabase
    .from("playlist_songs")
    .select("playlist_id, playlists!inner(owner_id)")
    .eq("song_id", songId)
    .eq("playlists.owner_id", user.id);

  const existingIds = new Set(
    (existing ?? []).map((r) => (r as { playlist_id: string }).playlist_id),
  );
  const desired = new Set(selectedIds);

  const toAdd = [...desired].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !desired.has(id));

  if (toRemove.length > 0) {
    await supabase
      .from("playlist_songs")
      .delete()
      .eq("song_id", songId)
      .in("playlist_id", toRemove);
  }

  if (toAdd.length > 0) {
    // Compute next position per target playlist.
    const rows: Array<{ playlist_id: string; song_id: string; position: number }> = [];
    for (const pid of toAdd) {
      const { data: maxRow } = await supabase
        .from("playlist_songs")
        .select("position")
        .eq("playlist_id", pid)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPos = (maxRow?.position ?? -1) + 1;
      rows.push({ playlist_id: pid, song_id: songId, position: nextPos });
    }
    const { error } = await supabase.from("playlist_songs").insert(rows);
    if (error) return { ok: false, reason: "error", message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/lists");
  return { ok: true, data: { saved: desired.size > 0 } };
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  // RLS enforces ownership, but scope explicitly to catch silent failures.
  const { data: pl } = await supabase
    .from("playlists")
    .select("owner_id")
    .eq("id", playlistId)
    .single();
  if (!pl) return { ok: false, reason: "not_found" };
  if (pl.owner_id !== user.id) return { ok: false, reason: "forbidden" };

  const { error } = await supabase
    .from("playlist_songs")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("song_id", songId);

  if (error) return { ok: false, reason: "error", message: error.message };

  revalidatePath(`/profile/lists/${playlistId}`);
  return { ok: true, data: undefined };
}

export async function reorderPlaylistSongs(
  playlistId: string,
  orderedSongIds: string[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: pl } = await supabase
    .from("playlists")
    .select("owner_id")
    .eq("id", playlistId)
    .single();
  if (!pl) return { ok: false, reason: "not_found" };
  if (pl.owner_id !== user.id) return { ok: false, reason: "forbidden" };

  // Update positions one by one — small lists, no batch needed.
  for (let i = 0; i < orderedSongIds.length; i++) {
    await supabase
      .from("playlist_songs")
      .update({ position: i })
      .eq("playlist_id", playlistId)
      .eq("song_id", orderedSongIds[i]);
  }

  revalidatePath(`/profile/lists/${playlistId}`);
  return { ok: true, data: undefined };
}
