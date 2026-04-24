"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./playlists";
import type { PlaylistSummary, PlaylistVisibility } from "../types";

// Artist → playlist mapping is purely by name match (case-insensitive).
// A playlist is "the artist's collection" when its name equals the artist's
// display name. This avoids a new DB column and keeps the feature reversible:
// rename or delete the playlist and the link breaks naturally.

/**
 * Returns the set of artist slugs the current user has "liked" — meaning at
 * least one of their playlists contains every published song by that artist.
 * Mirrors the popover's toggle semantics: the heart stays on iff at least one
 * list is still fully topped up with the artist's catalog. Remove the songs
 * and the heart goes away on its own.
 */
export async function getSavedArtistSlugs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const [arRes, plRes] = await Promise.all([
    supabase.from("artists").select("slug, name"),
    supabase
      .from("playlists")
      .select("id, playlist_songs!left(song_id)")
      .eq("owner_id", user.id),
  ]);

  if (arRes.error || plRes.error || !arRes.data || !plRes.data) return new Set();

  // Paginate songs — PostgREST caps a single select at 1000 rows.
  const songsByArtist = new Map<string, Set<string>>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("songs")
      .select("id, artist")
      .eq("status", "published")
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    for (const s of data as Array<{ id: string; artist: string }>) {
      const key = (s.artist ?? "").trim().toLowerCase();
      if (!key) continue;
      if (!songsByArtist.has(key)) songsByArtist.set(key, new Set());
      songsByArtist.get(key)!.add(s.id);
    }
    if (data.length < PAGE) break;
  }

  // per-playlist set of song ids
  const playlistSongs: Array<Set<string>> = (plRes.data as Array<{
    id: string;
    playlist_songs: Array<{ song_id: string }> | null;
  }>).map((p) => new Set((p.playlist_songs ?? []).map((r) => r.song_id)));

  const result = new Set<string>();
  for (const a of arRes.data as Array<{ slug: string; name: string }>) {
    const need = songsByArtist.get(a.name.trim().toLowerCase());
    if (!need || need.size === 0) continue;
    const anyFull = playlistSongs.some((pl) => {
      for (const id of need) if (!pl.has(id)) return false;
      return true;
    });
    if (anyFull) result.add(a.slug);
  }
  return result;
}

/**
 * Returns a Set of lowercase artist names for which the current user has
 * saved at least one song in any of their playlists. Used to float
 * "partially-liked" artists to the top of the /artists listing.
 */
export async function getArtistsWithSavedSongs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  // All playlist_songs rows belonging to the user's playlists, with the
  // referenced song's artist. PostgREST inner-join filter syntax.
  const { data, error } = await supabase
    .from("playlist_songs")
    .select("song:songs!inner(artist), playlist:playlists!inner(owner_id)")
    .eq("playlist.owner_id", user.id);

  if (error || !data) return new Set();
  const out = new Set<string>();
  for (const row of data as unknown as Array<{ song: { artist: string } | { artist: string }[] | null }>) {
    const song = Array.isArray(row.song) ? row.song[0] : row.song;
    const name = (song?.artist ?? "").trim().toLowerCase();
    if (name) out.add(name);
  }
  return out;
}

/**
 * Creates a playlist named after the artist and adds every published song by
 * that artist. If a playlist with the same name already exists, we just top it
 * up with any missing songs (idempotent).
 */
export async function saveArtistAsPlaylist(
  artistSlug: string,
): Promise<ActionResult<{ playlistId: string; songsAdded: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: artist, error: aErr } = await supabase
    .from("artists")
    .select("id, name")
    .eq("slug", artistSlug)
    .single();
  if (aErr || !artist) return { ok: false, reason: "not_found" };

  const artistName = (artist.name as string).trim();

  // Fetch all published songs by this artist (by display name).
  const { data: songs } = await supabase
    .from("songs")
    .select("id")
    .eq("status", "published")
    .eq("artist", artistName);

  const songIds = (songs ?? []).map((s) => (s as { id: string }).id);

  // Find or create a playlist with the artist's name.
  const { data: existing } = await supabase
    .from("playlists")
    .select("id")
    .eq("owner_id", user.id)
    .ilike("name", artistName)
    .limit(1)
    .maybeSingle();

  let playlistId: string;
  if (existing) {
    playlistId = (existing as { id: string }).id;
  } else {
    const { data: created, error: cErr } = await supabase
      .from("playlists")
      .insert({
        owner_id: user.id,
        name: artistName,
        visibility: "private",
        description: null,
      })
      .select("id")
      .single();
    if (cErr || !created) return { ok: false, reason: "error", message: cErr?.message };
    playlistId = (created as { id: string }).id;
  }

  // Top up the playlist with any missing songs.
  let songsAdded = 0;
  if (songIds.length > 0) {
    const { data: already } = await supabase
      .from("playlist_songs")
      .select("song_id, position")
      .eq("playlist_id", playlistId);

    const existingIds = new Set(
      (already ?? []).map((r) => (r as { song_id: string }).song_id),
    );
    const maxPos = (already ?? []).reduce(
      (m, r) => Math.max(m, (r as { position: number }).position ?? -1),
      -1,
    );
    const toAdd = songIds.filter((id) => !existingIds.has(id));

    if (toAdd.length > 0) {
      const rows = toAdd.map((song_id, i) => ({
        playlist_id: playlistId,
        song_id,
        position: maxPos + 1 + i,
      }));
      const { error: iErr } = await supabase.from("playlist_songs").insert(rows);
      if (iErr) return { ok: false, reason: "error", message: iErr.message };
      songsAdded = toAdd.length;
    }
  }

  revalidatePath("/profile/lists");
  revalidatePath("/artists");
  revalidatePath(`/artists/${artistSlug}`);
  return { ok: true, data: { playlistId, songsAdded } };
}

/**
 * Adds every published song by the given artist to an *existing* playlist
 * owned by the current user. Idempotent — songs already in the playlist are
 * skipped.
 */
export async function addArtistSongsToPlaylist(
  artistSlug: string,
  playlistId: string,
): Promise<ActionResult<{ songsAdded: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: pl } = await supabase
    .from("playlists")
    .select("owner_id")
    .eq("id", playlistId)
    .single();
  if (!pl) return { ok: false, reason: "not_found" };
  if ((pl as { owner_id: string }).owner_id !== user.id) return { ok: false, reason: "forbidden" };

  const { data: artist, error: aErr } = await supabase
    .from("artists")
    .select("name")
    .eq("slug", artistSlug)
    .single();
  if (aErr || !artist) return { ok: false, reason: "not_found" };

  const { data: songs } = await supabase
    .from("songs")
    .select("id")
    .eq("status", "published")
    .eq("artist", (artist as { name: string }).name.trim());

  const songIds = (songs ?? []).map((s) => (s as { id: string }).id);
  if (songIds.length === 0) {
    return { ok: true, data: { songsAdded: 0 } };
  }

  const { data: already } = await supabase
    .from("playlist_songs")
    .select("song_id, position")
    .eq("playlist_id", playlistId);

  const existingIds = new Set(
    (already ?? []).map((r) => (r as { song_id: string }).song_id),
  );
  const maxPos = (already ?? []).reduce(
    (m, r) => Math.max(m, (r as { position: number }).position ?? -1),
    -1,
  );
  const toAdd = songIds.filter((id) => !existingIds.has(id));
  if (toAdd.length === 0) return { ok: true, data: { songsAdded: 0 } };

  const rows = toAdd.map((song_id, i) => ({
    playlist_id: playlistId,
    song_id,
    position: maxPos + 1 + i,
  }));
  const { error: iErr } = await supabase.from("playlist_songs").insert(rows);
  if (iErr) return { ok: false, reason: "error", message: iErr.message };

  revalidatePath("/profile/lists");
  revalidatePath(`/profile/lists/${playlistId}`);
  return { ok: true, data: { songsAdded: toAdd.length } };
}

/**
 * Per-playlist membership snapshot for an artist: for each of the current
 * user's playlists, `hasSong = true` iff every currently-published song by
 * the artist is in that playlist. Used to seed toggle states in the popover.
 */
export async function getPlaylistsForArtist(artistSlug: string): Promise<PlaylistSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: artist } = await supabase
    .from("artists")
    .select("name")
    .eq("slug", artistSlug)
    .single();
  if (!artist) return [];

  const [songsRes, plRes] = await Promise.all([
    supabase
      .from("songs")
      .select("id")
      .eq("status", "published")
      .eq("artist", (artist as { name: string }).name.trim()),
    supabase
      .from("playlists")
      .select("id, name, is_default, visibility, playlist_songs!left(song_id)")
      .eq("owner_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (plRes.error || !plRes.data) return [];
  const artistSongIds = new Set(
    (songsRes.data ?? []).map((s) => (s as { id: string }).id),
  );
  const total = artistSongIds.size;

  return plRes.data.map((row: Record<string, unknown>) => {
    const rels = (row.playlist_songs ?? []) as Array<{ song_id: string }>;
    const present = rels.filter((r) => artistSongIds.has(r.song_id)).length;
    return {
      id: row.id as string,
      name: row.name as string,
      isDefault: row.is_default as boolean,
      visibility: row.visibility as PlaylistVisibility,
      // "Checked" = every known artist song is already in the list.
      hasSong: total > 0 && present >= total,
      songCount: rels.length,
    };
  });
}

/**
 * Apply toggle deltas for the artist's songs across the user's playlists:
 * top up every playlist in `toAdd` with missing songs; remove every artist
 * song from every playlist in `toRemove`. Mirrors the song-level
 * setSongPlaylists contract, but operates on the artist's entire catalog.
 */
export async function setArtistPlaylists(
  artistSlug: string,
  toAdd: string[],
  toRemove: string[],
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: artist } = await supabase
    .from("artists")
    .select("name")
    .eq("slug", artistSlug)
    .single();
  if (!artist) return { ok: false, reason: "not_found" };

  const { data: songs } = await supabase
    .from("songs")
    .select("id")
    .eq("status", "published")
    .eq("artist", (artist as { name: string }).name.trim());
  const songIds = (songs ?? []).map((s) => (s as { id: string }).id);

  // Scope mutations to user-owned playlists only (RLS also enforces, but this
  // keeps our queries tight and predictable).
  const touchedIds = [...new Set([...toAdd, ...toRemove])];
  if (touchedIds.length > 0) {
    const { data: ownCheck } = await supabase
      .from("playlists")
      .select("id")
      .eq("owner_id", user.id)
      .in("id", touchedIds);
    const owned = new Set((ownCheck ?? []).map((r) => (r as { id: string }).id));
    toAdd = toAdd.filter((id) => owned.has(id));
    toRemove = toRemove.filter((id) => owned.has(id));
  }

  if (toRemove.length > 0 && songIds.length > 0) {
    await supabase
      .from("playlist_songs")
      .delete()
      .in("playlist_id", toRemove)
      .in("song_id", songIds);
  }

  if (toAdd.length > 0 && songIds.length > 0) {
    // Fetch existing rows for the target playlists to skip dupes and derive
    // per-playlist next position.
    const { data: existing } = await supabase
      .from("playlist_songs")
      .select("playlist_id, song_id, position")
      .in("playlist_id", toAdd);

    const bySet = new Map<string, Set<string>>();
    const maxPos = new Map<string, number>();
    for (const row of (existing ?? []) as Array<{
      playlist_id: string;
      song_id: string;
      position: number;
    }>) {
      if (!bySet.has(row.playlist_id)) bySet.set(row.playlist_id, new Set());
      bySet.get(row.playlist_id)!.add(row.song_id);
      const cur = maxPos.get(row.playlist_id) ?? -1;
      if (row.position > cur) maxPos.set(row.playlist_id, row.position);
    }

    const rows: Array<{ playlist_id: string; song_id: string; position: number }> = [];
    for (const pid of toAdd) {
      const present = bySet.get(pid) ?? new Set();
      let pos = (maxPos.get(pid) ?? -1) + 1;
      for (const sid of songIds) {
        if (present.has(sid)) continue;
        rows.push({ playlist_id: pid, song_id: sid, position: pos });
        pos++;
      }
    }
    if (rows.length > 0) {
      const { error } = await supabase.from("playlist_songs").insert(rows);
      if (error) return { ok: false, reason: "error", message: error.message };
    }
  }

  revalidatePath("/profile/lists");
  revalidatePath(`/artists/${artistSlug}`);
  return { ok: true, data: { saved: toAdd.length > 0 || toRemove.length === 0 } };
}
