// Static files can be served from a pull CDN in front of the site instead of
// Vercel (`NEXT_PUBLIC_ASSET_PREFIX`, e.g. https://cdn.diez.net.ua). Vercel
// Hobby caps CDN requests at 1M/month and every first visit costs ~40 of
// them, most of it immutable JS/CSS, fonts and cover snapshots — the CDN
// fetches each file from us once and serves the rest itself.
//
// Unset (local dev, previews) → empty prefix, everything stays same-origin.
// Next's own /_next/static goes through `assetPrefix` in next.config.ts; this
// helper covers the files we reference by hand (/fonts, /_covers). Fonts in
// globals.css need nothing: `url(/fonts/…)` resolves against the stylesheet,
// which itself is served from the CDN.
export const ASSET_PREFIX = (process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "").replace(/\/+$/, "");

export function assetUrl(path: string): string {
  return ASSET_PREFIX + path;
}
