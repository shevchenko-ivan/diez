import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Canonical site URL. Set NEXT_PUBLIC_SITE_URL in production to avoid
// Vercel preview URLs appearing in sitemaps and JSON-LD.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Serialize an object for embedding in an inline `<script type="application/ld+json">`.
 *
 * `JSON.stringify` does NOT escape `<` characters, so a string containing the
 * literal sequence `</script>` would prematurely close the script tag and let
 * an attacker inject markup. All Diez JSON-LD data is admin-controlled today
 * (RLS blocks non-admin writes) so the risk is theoretical, but the fix is
 * five characters and removes a foot-gun if RLS is ever relaxed or a future
 * field starts mirroring user-submitted text.
 *
 * Replacing `<` with its `<` unicode escape is the OWASP-recommended
 * mitigation — parses identically in any JSON consumer but can never break
 * out of the surrounding `</script>` boundary.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Downscale a source-CDN cover/photo URL to a sensible thumbnail size.
 *
 * We serve covers with `unoptimized` (Vercel Image Optimization quota is
 * finite and we hotlink thousands of remote covers), so the browser downloads
 * the source bytes directly. Stored URLs are full-size (1000×1000 Deezer,
 * 600×600 iTunes, s900 YouTube) — rewriting the size token in the URL keeps
 * the payload light without going through the optimizer.
 *
 *   • Deezer  (dzcdn.net):        /1000x1000-…  → /{px}x{px}-…
 *   • iTunes  (mzstatic.com):     /600x600bb.jpg → /{px}x{px}bb.jpg
 *   • YouTube (googleusercontent): =s900-…       → =s{px}-…
 *
 * Unknown hosts are returned unchanged.
 */
export function coverThumb(url: string | null | undefined, px = 500): string | null {
  if (!url) return null;
  return url
    .replace(/\/\d+x\d+(-\d)/, `/${px}x${px}$1`) // Deezer: 1000x1000-000000-…
    .replace(/\/\d+x\d+bb\.(jpg|png)/i, `/${px}x${px}bb.$1`) // iTunes
    .replace(/=s\d+(-|$)/, `=s${px}$1`); // YouTube avatar
}
