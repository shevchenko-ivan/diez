"use server";

import { getArtists, type Artist } from "../services/artists";

/**
 * Pagination endpoint for the home-page artist strip's infinite scroll.
 * Returns the next batch of ranked artists, or [] when the list is exhausted.
 */
export async function loadMoreArtists(offset: number, limit = 12): Promise<Artist[]> {
  if (!Number.isFinite(offset) || offset < 0) return [];
  const safeLimit = Math.min(Math.max(1, limit | 0), 48);
  return getArtists(safeLimit, offset | 0);
}
