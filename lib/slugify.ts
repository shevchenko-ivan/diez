const CYRILLIC_MAP: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"h",ґ:"g",д:"d",е:"e",є:"ye",ж:"zh",з:"z",
  и:"y",і:"i",ї:"yi",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",
  р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",
  щ:"shch",ь:"",ю:"yu",я:"ya",
  ё:"yo",э:"e",ъ:"",ы:"y",
};

export function slugify(title: string): string {
  const raw = title
    .toLowerCase()
    .replace(/[''ʼ]/g, "")
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || "";
}

/**
 * Resolve a unique slug against a taken-check: the base first, then the
 * supplied human-readable variants (e.g. `${base}-${artistSlug}`), then
 * numbered suffixes. A timestamp is the LAST resort only — timestamp slugs
 * (`bez-tebe-1776692326498`) read as machine-generated duplicates to crawlers
 * and correlate with GSC «Проскановано — не проіндексовано».
 */
export async function dedupeSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
  variants: string[] = [],
): Promise<string> {
  // 48 numbered fallbacks, not 8: «ой у лузі червона калина» has 10+ covers
  // in the catalogue, so -2…-9 was exhausted and the Date.now() last resort
  // below minted a fresh crawler-hostile timestamp slug (caught 31.08.2026).
  const numbered = Array.from({ length: 48 }, (_, i) => `${base}-${i + 2}`);
  for (const candidate of [base, ...variants, ...numbered]) {
    if (candidate && !(await isTaken(candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
}
