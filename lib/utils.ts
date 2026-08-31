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
/**
 * srcset for build-time snapshot images (tools/prefetch-covers.ts): every
 * `/_covers/<base>.webp` (500px) ships with a `<base>.300.webp` twin under
 * the same hash, so the browser can pick by slot size and DPR — a 150px card
 * slot at DPR ≤2 (and Lighthouse's emulated 1.75) takes the 300px cut, DPR-3
 * screens keep the 500px. CDN URLs have no twin → undefined, single-candidate
 * `src` only. Keep in sync with the twin-naming convention in the prefetch
 * script; a candidate pointing at a missing file would 404 into the
 * component's onError fallback.
 */
export function snapshotSrcSet(url: string | null | undefined): string | undefined {
  if (!url || !url.startsWith("/_covers/") || !url.endsWith(".webp")) return undefined;
  return `${url.replace(/\.webp$/, ".300.webp")} 300w, ${url} 500w`;
}

export function coverThumb(url: string | null | undefined, px = 500): string | null {
  if (!url) return null;
  // Wikimedia originals → thumbnail path. Full-size Commons photos reach
  // 11 MB; the thumb endpoint serves the same image in tens of KB. Anonymous
  // traffic reliably gets only the pre-generated bucket widths (arbitrary ones
  // 400), so map px to the nearest bucket ≥ px. SVG/TIFF are skipped — their
  // thumbs get an extra .png suffix this rewrite doesn't produce.
  const wm = url.match(
    /^https:\/\/upload\.wikimedia\.org\/wikipedia\/([^/]+)\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+\.(?:jpe?g|png|webp))$/i,
  );
  if (wm) {
    const bucket = px <= 120 ? 120 : px <= 250 ? 250 : px <= 330 ? 330 : 500;
    return `https://upload.wikimedia.org/wikipedia/${wm[1]}/thumb/${wm[2]}/${wm[3]}/${wm[4]}/${bucket}px-${wm[4]}`;
  }
  // Supabase storage → image-transform endpoint: resizes and, via Accept
  // negotiation, re-encodes to webp (a 5 MB original PNG comes back ~45 KB).
  // Covers files that have no size in the URL at all (artist photos, avatars,
  // uploaded covers). width alone does NOT keep the aspect ratio (a 640×640
  // original came back 250×640) — resize=contain with a square box scales
  // proportionally and leaves any cropping to the CSS object-cover, exactly
  // like the untransformed original behaved.
  const sb = url.match(/^(https:\/\/[a-z0-9]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+)$/);
  if (sb) return `${sb[1]}/storage/v1/render/image/public/${sb[2]}?width=${px}&height=${px}&resize=contain&quality=75`;
  // YouTube video thumbs used as fallback covers: maxresdefault reaches
  // 210 KB. mq (320×180) / hq720 (1280×720) are the 16:9 variants without the
  // letterbox bars that hqdefault/sddefault bake in (bars would show through
  // a square object-cover crop).
  const yt = url.match(/^(https:\/\/i\.ytimg\.com\/vi\/[^/]+\/)(?:maxres|sd|hq)?default\.jpg$/);
  if (yt) return `${yt[1]}${px <= 320 ? "mqdefault" : "hq720"}.jpg`;
  return url
    .replace(/\/\d+x\d+(-\d)/, `/${px}x${px}$1`) // Deezer: 1000x1000-000000-…
    .replace(/\/\d+x\d+bb\.(jpg|png)/i, `/${px}x${px}bb.$1`) // iTunes
    .replace(/=s\d+(-|$)/, `=s${px}$1`); // YouTube avatar
}
