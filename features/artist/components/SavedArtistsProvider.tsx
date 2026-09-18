"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import { getSavedArtistSets } from "@/features/playlist/actions/artist-playlists";

// Client-side personalization for the (static) artist pages. /artists and
// /artists/[slug] used to read the viewer's saved artists from the auth cookie
// at render time, which made both routes dynamic — every visit, bot or human,
// was a full server render (the /artists HTML alone is ~565 KB). The pages are
// cached now; this provider fetches the two personal sets once per page load
// for signed-in viewers, and the cards / hearts upgrade themselves.
//
// Guests never trigger the request: the Supabase auth cookie is the cheap
// client-side tell for "somebody is logged in" (same gate as SavedSlugsProvider).
export interface SavedArtistSets {
  /** Artist slugs the viewer has "liked" (a playlist holds their whole catalogue). */
  artists: ReadonlySet<string>;
  /** Lowercase artist names with at least one saved song — floated to the top of /artists. */
  withSavedSongs: ReadonlySet<string>;
}

export const SavedArtistsContext = createContext<SavedArtistSets | null>(null);

export function SavedArtistsProvider({ children }: { children: ReactNode }) {
  const [sets, setSets] = useState<SavedArtistSets | null>(null);

  useEffect(() => {
    if (!document.cookie.includes("-auth-token")) return;
    let disposed = false;
    getSavedArtistSets()
      .then((r) => {
        if (disposed) return;
        if (r.savedArtists.length === 0 && r.artistsWithSavedSongs.length === 0) return;
        setSets({
          artists: new Set(r.savedArtists),
          withSavedSongs: new Set(r.artistsWithSavedSongs),
        });
      })
      .catch(() => {
        /* personalization is best-effort */
      });
    return () => {
      disposed = true;
    };
  }, []);

  return <SavedArtistsContext.Provider value={sets}>{children}</SavedArtistsContext.Provider>;
}
