import { type MetadataRoute } from "next";
import { getAllSongCovers } from "@/features/song/services/songs";
import { getRankedArtists } from "@/features/artist/services/artists";
import { TOPICS } from "@/features/song/data/topics";
import { siteUrl } from "@/lib/utils";

// Mirror the robots.ts guard: no sitemap on non-production deployments.
const isProduction = !!process.env.NEXT_PUBLIC_SITE_URL;

// Rebuild the sitemap every hour. Without this, Next.js generates it once at
// build time — new songs published via /admin would not appear in the sitemap
// until the next deploy, which is rare on an admin-driven content site.
export const revalidate = 3600;

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

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/songs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/artists`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/chords`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
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
      lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(s.cover_image ? { images: [s.cover_image] } : {}),
    })),
    ...artists.map((a) => ({
      url: `${siteUrl}/artists/${a.slug}`,
      lastModified: new Date(),
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
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: `${siteUrl}/tuner`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/copyright`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
