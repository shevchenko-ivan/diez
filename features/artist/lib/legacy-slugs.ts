/**
 * Old artist slugs → current ones. When a slug is renamed in the DB (broken
 * transliteration, editorial cleanup), add the old value here so bookmarks and
 * external links 308-redirect instead of 404-ing. The artist page consults
 * this map only AFTER the DB lookup misses, so an entry is inert until the
 * corresponding DB rename actually happens.
 */
export const LEGACY_ARTIST_SLUGS: Record<string, string> = {
  // «Океан Ельзи» — mangled by an early transliterator (апостроф → код символа).
  "okyean-el697zy": "okean-elzy",
};
