// Cache tags, scoped so one edit doesn't re-render the whole site.
//
// Vercel Hobby allows 200K ISR writes a month, and every page re-render is a
// write. Song pages, artist pages and the footer used to read caches tagged
// "songs", which every admin save revalidates — so one «Зберегти» re-rendered
// all ~3K pages, like a deploy. Now:
//   "songs"            — list pages only (home, catalogue, topics, /artists,
//                        chord dictionary). Revalidated by every catalogue
//                        change, as before.
//   artistSongsTag(a)  — one artist's song list: their artist page and the
//                        «інші пісні виконавця» block on their song pages.
//   SONG_LINKS_TAG     — cross-links between songs («схожі акорди»). Only a
//                        song going OFFLINE invalidates it, so no page keeps a
//                        link to a 404; a new song shows up there after the
//                        next deploy.
// The footer's artist list is on "artists" (artist admin), not "songs".
export const SONG_LINKS_TAG = "song-links";

export function artistSongsTag(artist: string): string {
  return `artist-songs:${artist.trim().toLowerCase()}`.slice(0, 250);
}
