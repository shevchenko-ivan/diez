import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Playlist, PlaylistVisibility } from "../types";

interface PlaylistWithSongs extends Playlist {
  songs: Array<{
    id: string;
    slug: string;
    title: string;
    artist: string;
    difficulty: "easy" | "medium" | "hard";
    chords: string[];
    views: number;
    coverImage?: string;
    coverColor?: string;
    position: number;
  }>;
  owner: { email: string | null; username: string | null };
}

/** Fetch a playlist by id for the owner — 404 otherwise. Includes songs. */
export async function getMyPlaylistById(id: string): Promise<PlaylistWithSongs | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("playlists")
    .select(`
      id, slug, name, description, visibility, is_default, owner_id, created_at, updated_at,
      profiles:owner_id(email, username),
      playlist_songs(position, songs(id, slug, title, artist, difficulty, chords, views, cover_image, cover_color))
    `)
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return mapPlaylist(data);
}

/** Public lookup by slug — respects RLS, so private lists return null to non-owners. */
export async function getPublicPlaylistBySlug(slug: string): Promise<PlaylistWithSongs | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .select(`
      id, slug, name, description, visibility, is_default, owner_id, created_at, updated_at,
      profiles:owner_id(email, username),
      playlist_songs(position, songs(id, slug, title, artist, difficulty, chords, views, cover_image, cover_color))
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapPlaylist(data);
}

function mapPlaylist(row: Record<string, unknown>): PlaylistWithSongs {
  const items = (row.playlist_songs ?? []) as Array<{
    position: number;
    songs: {
      id: string;
      slug: string;
      title: string;
      artist: string;
      difficulty: "easy" | "medium" | "hard";
      chords: string[];
      views: number;
      cover_image: string | null;
      cover_color: string | null;
    } | null;
  }>;
  const songs = items
    .filter((it) => it.songs)
    .map((it) => ({
      id: it.songs!.id,
      slug: it.songs!.slug,
      title: it.songs!.title,
      artist: it.songs!.artist,
      difficulty: it.songs!.difficulty,
      chords: it.songs!.chords,
      views: it.songs!.views,
      coverImage: it.songs!.cover_image ?? undefined,
      coverColor: it.songs!.cover_color ?? undefined,
      position: it.position,
    }))
    .sort((a, b) => a.position - b.position);

  const profile = (row.profiles ?? null) as { email: string | null; username: string | null } | null;

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
    songs,
    owner: {
      email: profile?.email ?? null,
      username: profile?.username ?? null,
    },
  };
}
