import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasEnvVars } from "@/lib/utils";

export const runtime = "edge";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ─── Rate limiting ───────────────────────────────────────────────────────────
// Token bucket per client IP. The route already has CDN caching (60s s-maxage
// + 300s stale-while-revalidate), so repeated queries don't hit the function
// at all — but a hostile script could send unique `q` values to bypass that
// and burn through Supabase egress.
//
// 60 req/min/IP is roughly 1 req/sec, which is 10× what a real typing user
// produces (the client-side debounce caps it at ~3 req/sec maximum during
// rapid typing, then most hit the CDN). Anything sustained above that is a
// bot.
//
// Edge runtime spreads across instances, so this is best-effort — but
// abusers usually hit one instance at a time and even partial throttling
// disincentivizes scripted scraping.
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic cleanup so the Map doesn't grow unbounded over the
    // instance's lifetime. Cap at 1000 entries — far more than concurrent
    // search users we'll ever realistically see on free tier.
    if (buckets.size > 1000) {
      for (const [k, v] of buckets) {
        if (v.resetAt < now) buckets.delete(k);
      }
    }
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count++;
  return true;
}

type SongRow = {
  slug: string;
  title: string;
  artist: string;
  difficulty: string;
  cover_image: string | null;
  cover_color: string | null;
  views: number | null;
};

const PAGE_SIZE = 10;
// Wider window on the first page so a low-views exact-title match still
// reaches the top after tier ranking, instead of being pushed to page 2.
const FIRST_PAGE_RAW = 40;

// Cyrillic/Latin look-alike letters get conflated in catalog data
// (e.g. title saved as "На небi" with Latin i). Map both sides to a single
// alphabet so search treats "небі" and "небi" as the same string.
const CYR_TO_LAT: Record<string, string> = {
  а: "a", е: "e", і: "i", о: "o", р: "p", с: "c", х: "x", у: "y", к: "k", м: "m",
  А: "A", Е: "E", І: "I", О: "O", Р: "P", С: "C", Х: "X", У: "Y", К: "K", М: "M",
};
const CONFUSABLES_RE = /[аеіорсхукмАЕІОРСХУКМ]/g;
function foldConfusables(s: string): string {
  return s.replace(CONFUSABLES_RE, (ch) => CYR_TO_LAT[ch] ?? ch);
}

// 0 = exact title, 1 = title prefix, 2 = title contains all tokens (or
// title+artist mix), 3 = artist contains all tokens, 4 = lyrics-only.
// Lower wins; ties broken by views desc. `tokens` are already lowercased+folded.
function matchTier(row: SongRow, qNorm: string, tokens: string[]): number {
  const title = foldConfusables(row.title.toLowerCase().trim());
  const artist = foldConfusables(row.artist.toLowerCase());
  // Single-token shortcut preserves the original tight ranking (exact > prefix > contains).
  if (tokens.length <= 1) {
    if (title === qNorm) return 0;
    if (title.startsWith(qNorm)) return 1;
    if (title.includes(qNorm)) return 2;
    if (artist.includes(qNorm)) return 3;
    return 4;
  }
  const inTitle = tokens.every((t) => title.includes(t));
  const inArtist = tokens.every((t) => artist.includes(t));
  if (inTitle) return 2;
  if (inArtist) return 3;
  if (tokens.every((t) => title.includes(t) || artist.includes(t))) return 2;
  return 4;
}

export async function GET(req: Request) {
  // Rate limit by client IP — x-forwarded-for is set by Vercel's edge.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { songs: [], lyricsSongs: [], artists: [], hasMore: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const url = new URL(req.url);
  // Bound q at 200 chars — Supabase ILIKE doesn't care about length, but a
  // bot sending 1 MB strings would burn parse time and edge memory.
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
  // Bound offset — paginating to offset=999999 is always abuse; the real
  // dropdown caps at a few pages.
  const rawOffset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;
  const offset = Math.max(0, Math.min(rawOffset, 500));
  if (!hasEnvVars || q.length < 2) {
    return NextResponse.json({ songs: [], lyricsSongs: [], artists: [], hasMore: false });
  }

  const sb = getClient();

  // Split query into tokens (≥2 chars) for token-AND matching across
  // title/artist/lyrics. Lets "Скрябін Мам" match a row with artist "Скрябін"
  // and title "Мам" — neither column contains the whole phrase.
  const rawTokens = q.trim().split(/\s+/).filter((t) => t.length >= 2);
  const tokens = rawTokens.length ? rawTokens : [q];
  // Confusable-folded variants per token so Latin-i ⇄ Cyrillic-і still matches.
  const tokenFilters = tokens.map((token) => {
    const tFolded = foldConfusables(token);
    const tVariants = tFolded === token ? [token] : [token, tFolded];
    const tFields = token.length >= 3 ? ["title", "artist", "lyrics_text"] : ["title", "artist"];
    return tVariants.flatMap((v) => tFields.map((f) => `${f}.ilike.%${v}%`)).join(",");
  });
  const qFoldedRaw = foldConfusables(q);
  const artistVariants = qFoldedRaw === q ? [q] : [q, qFoldedRaw];
  const artistOr = artistVariants.map((v) => `name.ilike.%${v}%`).join(",");
  // Lowercased + folded forms for the in-JS tier comparison.
  const qNorm = foldConfusables(q.toLowerCase());
  const tokensNorm = tokens.map((t) => foldConfusables(t.toLowerCase()));

  // First page widens the raw window so tier ranking can lift a low-views
  // exact-title match into the visible top-10. Later pages fetch only PAGE_SIZE
  // since they just append below the already-shown results.
  const isFirstPage = offset === 0;
  const rawSize = isFirstPage ? FIRST_PAGE_RAW : PAGE_SIZE;
  // Chain .or() per token so PostgREST ANDs the token groups together.
  let songsQuery = sb
    .from("songs")
    .select("slug, title, artist, difficulty, cover_image, cover_color, views")
    .eq("status", "published");
  for (const tf of tokenFilters) songsQuery = songsQuery.or(tf);
  songsQuery = songsQuery.order("views", { ascending: false }).range(offset, offset + rawSize - 1);
  const [songsRes, artistsRes] = await Promise.all([
    songsQuery,
    // Artists list is short and only useful at the top of the dropdown — load
    // it once on the first page and skip it on subsequent infinite-scroll fetches.
    offset === 0
      ? sb
          .from("artists")
          .select("slug, name, photo_url")
          .or(artistOr)
          .order("name")
          .limit(3)
      : Promise.resolve({ data: [] as { slug: string; name: string; photo_url: string | null }[] }),
  ]);

  const rows = (songsRes.data ?? []) as SongRow[];
  const ranked = rows
    .map((r) => ({ row: r, tier: matchTier(r, qNorm, tokensNorm) }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return (b.row.views ?? 0) - (a.row.views ?? 0);
    });

  // Take top PAGE_SIZE after tier ranking, then split into title/lyrics groups.
  const pageRows = ranked.slice(0, PAGE_SIZE);
  const titleMatches = pageRows.filter((r) => r.tier <= 3).map((r) => r.row);
  const lyricsMatches = pageRows.filter((r) => r.tier === 4).map((r) => r.row);
  // The raw window was filled OR ranking dropped some rows for later pages —
  // in both cases another fetch may yield more results.
  const hasMore = rows.length === rawSize || ranked.length > PAGE_SIZE;
  const nextOffset = offset + rawSize;

  return NextResponse.json(
    {
      songs: titleMatches,
      lyricsSongs: lyricsMatches,
      artists: artistsRes.data ?? [],
      hasMore,
      nextOffset,
    },
    {
      headers: {
        // CDN caches 60s; stale-while-revalidate lets the next request hit instantly
        // while the edge refreshes in the background.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
