// Cyrillic → Latin transliteration for search matching.
//
// Lets a Cyrillic query find a Latin-named entity and vice versa, e.g. typing
// "оторвальд" matches the artist "O.Torvald". Used only for fuzzy search
// comparison — never for display or slugs.

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
  ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
  ю: "iu", я: "ia",
  // Russian letters that show up in mixed catalog data.
  ы: "y", э: "e", ъ: "", ё: "e",
};

/** Transliterate any Cyrillic letters in a (lowercased) string to Latin. */
export function translitToLat(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase()) {
    out += ch in CYR_TO_LAT ? CYR_TO_LAT[ch] : ch;
  }
  return out;
}

/**
 * Normalize a name for fuzzy, alphabet-agnostic search: transliterate to Latin,
 * lowercase, and drop everything that isn't a letter or digit. So both
 * "оторвальд" and "O.Torvald" collapse to "otorvald".
 */
export function normalizeForSearch(s: string): string {
  return translitToLat(s).replace(/[^a-z0-9]/g, "");
}
