import { revalidatePath, revalidateTag } from "next/cache";
import { artistSongsTag, SONG_LINKS_TAG } from "./cache-tags";

/** A song as it was BEFORE the change (status included). */
export type SongRef = { slug?: string | null; artist?: string | null; status?: string | null };

// Scoped invalidation after a catalogue change — see lib/cache-tags.ts.
// `songs` are the rows as they were BEFORE the change, `status` the status
// after it. Nothing public changes unless a song was or now is published —
// saving a draft or a pending submission touches no cache at all. Otherwise
// "songs" refreshes the list pages; each touched artist's tag refreshes their
// artist page and their song pages' same-artist block; SONG_LINKS_TAG only
// when a published song went offline, so no song page keeps linking to a
// 404. Plus the changed songs' own pages. Everything else stays cached.
export function revalidateCatalog(songs: SongRef[], status: string | null, extraArtists: string[] = []) {
  for (const s of songs) if (s.slug) revalidatePath(`/songs/${s.slug}`);
  const wasPublished = songs.some((s) => s.status === "published");
  if (!wasPublished && status !== "published") return;
  revalidateTag("songs", "max");
  const artists = new Set([...songs.map((s) => s.artist), ...extraArtists].filter((a): a is string => !!a));
  for (const a of artists) revalidateTag(artistSongsTag(a), "max");
  if (wasPublished && status !== "published") revalidateTag(SONG_LINKS_TAG, "max");
}
