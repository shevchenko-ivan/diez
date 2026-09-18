"use client";

import { useContext, useMemo } from "react";
import { ArtistCard } from "./ArtistCard";
import { SavedArtistsContext } from "./SavedArtistsProvider";

export interface ArtistGridItem {
  name: string;
  songsCount: number;
  avgViews: number;
  totalViews: number;
  genre: string;
  color: string;
  image?: string;
  slug: string;
}

// The /artists grid. The server renders it in popularity order — the cached,
// identical-for-everyone HTML. Once the viewer's personal sets arrive (signed-in
// visitors only), artists with a saved song float to the top and liked ones get
// a filled heart: the same two personal touches the page used to compute on the
// server, minus the per-request render that cost.
export function ArtistsGrid({ artists }: { artists: ArtistGridItem[] }) {
  const sets = useContext(SavedArtistsContext);

  const ordered = useMemo(() => {
    if (!sets || sets.withSavedSongs.size === 0) return artists;
    const hasSaved = (a: ArtistGridItem) => sets.withSavedSongs.has(a.name.toLowerCase());
    return [...artists.filter(hasSaved), ...artists.filter((a) => !hasSaved(a))];
  }, [artists, sets]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      {ordered.map((artist) => (
        <ArtistCard key={artist.slug} {...artist} saved={sets?.artists.has(artist.slug) ?? false} />
      ))}
    </div>
  );
}
