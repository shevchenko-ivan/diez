// ── IndexNow ping ────────────────────────────────────────────────────────────
//
// IndexNow is the push-notification protocol behind Bing, DuckDuckGo, Seznam
// and (indirectly) several AI search crawlers: instead of waiting for a
// sitemap recrawl, we POST changed URLs and they get fetched within minutes.
// Bing had indexed only 61 of our ~2600 pages as of 31.08.2026 — its crawler
// simply never budgeted a deep crawl for a young domain; IndexNow fixes that
// without waiting. Google ignores the protocol (sitemap covers it).
//
// Ownership proof: the key below is ALSO served as /<key>.txt from public/
// (the endpoint fetches it once per host). The key is public by design —
// possession only lets someone submit OUR urls, which the endpoint validates
// against the host anyway.
const INDEXNOW_KEY = "5c648217d037db28534e7bc915548f86";

/**
 * Best-effort ping — call via `after()` from a server action so it runs
 * outside the response path. Silently no-ops on previews/local (no
 * NEXT_PUBLIC_SITE_URL) and swallows every network error: search engines
 * still pick changes up from the sitemap, just slower.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || paths.length === 0) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(site).host,
        key: INDEXNOW_KEY,
        keyLocation: `${site}/${INDEXNOW_KEY}.txt`,
        urlList: paths.map((p) => `${site}${p}`),
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* best-effort */
  }
}
