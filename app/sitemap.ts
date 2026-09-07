import { type MetadataRoute } from "next";
import { getAllSongCovers } from "@/features/song/services/songs";
import { getRankedArtists } from "@/features/artist/services/artists";
import { TOPICS } from "@/features/song/data/topics";
import { INSTRUMENTS } from "@/features/song/data/instruments";
import { CHORD_PAGES } from "@/features/song/data/chord-pages";
import { ARTICLES } from "@/features/learn/articles";
import { siteUrl } from "@/lib/utils";

// Mirror the robots.ts guard: no sitemap on non-production deployments.
const isProduction = !!process.env.NEXT_PUBLIC_SITE_URL;

// Rebuild the sitemap every hour. Without this, Next.js generates it once at
// build time — new songs published via /admin would not appear in the sitemap
// until the next deploy, which is rare on an admin-driven content site.
export const revalidate = 3600;

// ── lastmod policy ───────────────────────────────────────────────────────────
// Google only trusts <lastmod> when it moves for a reason. The old sitemap
// stamped `new Date()` on every non-song URL, i.e. "everything changed an hour
// ago" on each regeneration — a signal Google learns to ignore, and one that
// slowed discovery of the batch of new hub pages (GSC 7.09.2026: 78 URLs in
// «Discovered — currently not indexed»). Now:
//   • song pages          — the row's real updated_at (unchanged);
//   • catalogue listings  — the newest song update (moves when the catalogue
//     does), per-page for the alphabetical pagination, per-artist for artists;
//   • static hubs/copy    — STATIC_LASTMOD, a hand-bumped date of the last
//     content edit to topics, instrument hubs, chord dictionary, learn
//     articles and legal pages. Bump it when you change their copy.
const STATIC_LASTMOD = new Date("2026-09-07T00:00:00Z");
// Must match PER_PAGE in app/songs/page/[n]/page.tsx.
const PER_PAGE = 100;

function maxDate(dates: (string | null | undefined)[], fallback: Date): Date {
  let best = 0;
  for (const d of dates) {
    const t = d ? Date.parse(d) : NaN;
    if (!Number.isNaN(t) && t > best) best = t;
  }
  return best > 0 ? new Date(best) : fallback;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isProduction) return [];
  // Run both queries in parallel — sitemap rebuilds on `revalidate` and we
  // don't want it to become the slowest route.
  const [songs, artists] = await Promise.all([
    getAllSongCovers(),
    getRankedArtists(),
  ]);
  // Note: artist slugs come from the `artists` table — `slugify(name)` does
  // NOT match `/artists/[slug]` (Cyrillic names get transliterated, aliases
  // get canonicalized). The previous dumb fallback dumped Cyrillic-slugged
  // URLs that 404'd on every search-engine crawl.

  const catalogueLastMod = maxDate(songs.map((s) => s.updated_at), STATIC_LASTMOD);

  // Newest song update per artist name — the artist page changes exactly
  // when one of its songs does.
  const artistLastMod = new Map<string, string>();
  for (const s of songs) {
    const prev = artistLastMod.get(s.artist);
    if (s.updated_at && (!prev || s.updated_at > prev)) artistLastMod.set(s.artist, s.updated_at);
  }

  // Alphabetical chunks approximating /songs/page/[n] (that route sorts by
  // the title_sort column; a plain locale sort lands the same songs on the
  // same pages for all practical purposes, and lastmod only needs to move
  // when a page's contents changed).
  const alphabetical = [...songs].sort((a, b) => a.title.localeCompare(b.title, "uk"));
  const pageCount = Math.ceil(songs.length / PER_PAGE);

  return [
    {
      url: siteUrl,
      lastModified: catalogueLastMod,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/songs`,
      lastModified: catalogueLastMod,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/artists`,
      lastModified: catalogueLastMod,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Crawlable catalogue pagination (see app/songs/page/[n]/page.tsx).
    // Alphabetical and distinct from /songs (popularity-sorted), so page 1 is
    // a real page of its own.
    ...Array.from({ length: pageCount }, (_, i) => ({
      url: `${siteUrl}/songs/page/${i + 1}`,
      lastModified: maxDate(
        alphabetical.slice(i * PER_PAGE, (i + 1) * PER_PAGE).map((s) => s.updated_at),
        STATIC_LASTMOD,
      ),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    {
      url: `${siteUrl}/chords`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Chord dictionary landings (`/chords/<slug>`) — «акорд am на гітарі»
    // class queries; 29 evergreen pages generated from the voicing data.
    ...CHORD_PAGES.map((c) => ({
      url: `${siteUrl}/chords/${c.slug}`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // Songs with their cover image attached — Google's image-sitemap
    // extension feeds Google Images search. Each cover-bearing song becomes
    // a candidate for queries like «обкладинка <song>», which a chord-site
    // wouldn't naturally rank for otherwise.
    ...songs.map((s) => ({
      url: `${siteUrl}/songs/${s.slug}`,
      // Real per-row `updated_at` (set by the songs upsert trigger). A
      // moving lastmod tells Googlebot to re-crawl just the rows that
      // actually changed, instead of skipping the whole sitemap when
      // every URL shares the same global timestamp.
      lastModified: s.updated_at ? new Date(s.updated_at) : STATIC_LASTMOD,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(s.cover_image ? { images: [s.cover_image] } : {}),
    })),
    ...artists.map((a) => ({
      url: `${siteUrl}/artists/${a.slug}`,
      lastModified: maxDate([artistLastMod.get(a.name)], STATIC_LASTMOD),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      ...(a.photo_url ? { images: [a.photo_url] } : {}),
    })),
    // Topic landing pages — path-based URLs (`/songs/topic/<slug>`)
    // target broad evergreen queries ("акорди для початківців", "пісні
    // біля вогнища") which a single-song page can't rank for. Old
    // `/songs?topic=<slug>` URLs 301 → here via next.config redirects.
    ...TOPICS.map((t) => ({
      url: `${siteUrl}/songs/topic/${t.slug}`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Instrument landing hubs (`/songs/instrument/<slug>`) — target
    // "акорди для укулеле" / "акорди для піаніно" over the same catalogue.
    ...INSTRUMENTS.map((i) => ({
      url: `${siteUrl}/songs/instrument/${i.slug}`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: `${siteUrl}/tuner`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    // Learn hub + articles — evergreen informational content targeting broad
    // beginner queries ("що таке баре", "як читати акорди") that build topical
    // authority for the whole domain.
    {
      url: `${siteUrl}/learn`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...ARTICLES.map((a) => ({
      url: `${siteUrl}/learn/${a.meta.slug}`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${siteUrl}/about`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/copyright`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
