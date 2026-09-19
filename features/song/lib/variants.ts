import type { Song } from "../types";

// Pure: no Supabase, no next/cache. Lives here (not in services/songs.ts) so
// the song page's client shell can apply `?v=` / the user's saved variant in
// the browser — services/songs.ts pulls `unstable_cache`, which cannot be
// bundled for the client.

// Apply an active variant on top of the base song fields — swaps sections,
// chords, key, capo. (Tempo/strumming live in song_strumming_patterns, which
// are per-song; the viewer hides them for chord-less variants.)
export function applyVariant(song: Song, variantId: string | undefined): Song {
  if (!song.variants || song.variants.length === 0) return song;
  const target =
    (variantId && song.variants.find((v) => v.id === variantId)) ||
    song.variants.find((v) => v.isPrimary) ||
    song.variants[0];
  if (!target) return song;
  return {
    ...song,
    sections: target.sections,
    // The variant's own chords, even when empty — a fingerstyle/tab variant
    // has none, and borrowing the strummed variant's list would render a
    // misleading chord sidebar next to a tab-only arrangement.
    chords: target.chords,
    key: target.key,
    capo: target.capo ?? song.capo,
    activeVariantId: target.id,
    chordVoicings: target.chordVoicings ?? song.chordVoicings,
    customVoicings: target.customVoicings ?? song.customVoicings,
  };
}
