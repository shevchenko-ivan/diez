"use server";

import { getSongsPage } from "../services/songs";
import { type Song } from "../types";

/**
 * Pagination endpoint for the home-page "Топ популярних" song strip's
 * infinite horizontal scroll. Returns the next batch of most-viewed songs,
 * or [] when the list is exhausted. Mirrors loadMoreArtists.
 */
export async function loadMoreTrending(offset: number, limit = 12): Promise<Song[]> {
  if (!Number.isFinite(offset) || offset < 0) return [];
  const safeLimit = Math.min(Math.max(1, limit | 0), 48);
  const { songs } = await getSongsPage({
    sortBy: "source_views",
    offset: offset | 0,
    limit: safeLimit,
  });
  return songs;
}

/**
 * Pagination endpoint for the home-page "Щойно на струнах" strip — newest
 * published songs (matches getFreshSongs' order, so it continues seamlessly).
 */
export async function loadMoreFresh(offset: number, limit = 12): Promise<Song[]> {
  if (!Number.isFinite(offset) || offset < 0) return [];
  const safeLimit = Math.min(Math.max(1, limit | 0), 48);
  const { songs } = await getSongsPage({
    sortBy: "created_at_desc",
    offset: offset | 0,
    limit: safeLimit,
  });
  return songs;
}
