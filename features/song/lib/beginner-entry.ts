// A song opened from «Для початківців» opens on its easiest variant and, if
// that still has barre chords, with beginner mode on. The topic page drops
// the clicked slug (+ variant) into sessionStorage; the song page reads it
// once and clears it. No URL parameter, so song links and canonicals stay
// clean and the cached pages stay one-per-song.
const KEY = "diez:beginner-entry";

type Entry = { slug: string; variantId?: string };

export function markBeginnerEntry(slug: string, variantId?: string): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ slug, variantId } satisfies Entry)); } catch {}
}

/** The entry for this song, or null. Consumed on read. */
export function takeBeginnerEntry(slug: string): { variantId?: string } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry;
    if (entry.slug !== slug) return null;
    sessionStorage.removeItem(KEY);
    return { variantId: entry.variantId };
  } catch {
    return null;
  }
}
