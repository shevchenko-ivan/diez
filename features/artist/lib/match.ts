import { normalizeForSearch } from "@/features/song/lib/translit";

/**
 * Alphabet-agnostic artist matching — the single place that decides whether a
 * typed name refers to an existing artist. Comparison happens on
 * `normalizeForSearch` output (lowercased, transliterated, punctuation-free),
 * so «оторвальд», "O.Torvald" and "o torvald" all resolve to the same row.
 * Aliases participate too: «Фіа» finds an artist whose aliases include it.
 *
 * Pure and isomorphic — used by the AddSongForm (client) and the submit
 * server actions (server) so both sides agree on what counts as a duplicate.
 */
export type MatchableArtist = { name: string; aliases?: string[] | null };

export function matchArtist<T extends MatchableArtist>(rows: T[], input: string): T | undefined {
  const q = normalizeForSearch(input);
  if (!q) return undefined;
  return (
    rows.find((r) => normalizeForSearch(r.name) === q) ??
    rows.find((r) => (r.aliases ?? []).some((a) => normalizeForSearch(a) === q))
  );
}

/** Substring-based suggestion filter over names + aliases, same normalization. */
export function filterArtistSuggestions<T extends MatchableArtist>(rows: T[], input: string, limit = 8): T[] {
  const q = normalizeForSearch(input);
  if (!q) return [];
  return rows
    .filter(
      (r) =>
        normalizeForSearch(r.name).includes(q) ||
        (r.aliases ?? []).some((a) => normalizeForSearch(a).includes(q)),
    )
    .sort(
      (a, b) =>
        Number(normalizeForSearch(b.name).startsWith(q)) -
        Number(normalizeForSearch(a.name).startsWith(q)),
    )
    .slice(0, limit);
}
