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

// 0 = exact title, 1 = title prefix, 2 = title contains, 3 = artist contains,
// 4 = lyrics-only. Lower wins; ties broken by views desc.
function matchTier(row: SongRow, qNorm: string): number {
  const title = foldConfusables(row.title.toLowerCase().trim());
  const artist = foldConfusables(row.artist.toLowerCase());
  if (title === qNorm) return 0;
  if (title.startsWith(qNorm)) return 1;
  if (title.includes(qNorm)) return 2;
  if (artist.includes(qNorm)) return 3;
  return 4;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  if (!hasEnvVars || q.length < 2) {
    return NextResponse.json({ songs: [], lyricsSongs: [], artists: [], hasMore: false });
  }

  const sb = getClient();

  // Build LIKE patterns for both the original query and the confusable-folded
  // variant so a Latin-i title matches a Cyrillic-і query (and vice versa).
  const qFoldedRaw = foldConfusables(q);
  const variants = qFoldedRaw === q ? [q] : [q, qFoldedRaw];
  const fields = q.length >= 3 ? ["title", "artist", "lyrics_text"] : ["title", "artist"];
  const songOr = variants.flatMap((v) => fields.map((f) => `${f}.ilike.%${v}%`)).join(",");
  const artistOr = variants.map((v) => `name.ilike.%${v}%`).join(",");
  // Lowercase + folded form for the in-JS tier comparison (matches the same
  // transform applied to row titles inside matchTier).
  const qNorm = foldConfusables(q.toLowerCase());

  // First page widens the raw window so tier ranking can lift a low-views
  // exact-title match into the visible top-10. Later pages fetch only PAGE_SIZE
  // since they just append below the already-shown results.
  const isFirstPage = offset === 0;
  const rawSize = isFirstPage ? FIRST_PAGE_RAW : PAGE_SIZE;
  const [songsRes, artistsRes] = await Promise.all([
    sb
      .from("songs")
      .select("slug, title, artist, difficulty, cover_image, cover_color, views")
      .eq("status", "published")
      .or(songOr)
      .order("views", { ascending: false })
      .range(offset, offset + rawSize - 1),
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
    .map((r) => ({ row: r, tier: matchTier(r, qNorm) }))
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
