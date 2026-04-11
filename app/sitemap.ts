import { type MetadataRoute } from "next";
import { getAllSongs } from "@/features/song/services/songs";
import { siteUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const songs = getAllSongs();
  const artistSlugs = [
    ...new Set(songs.map((s) => s.artist.toLowerCase().replace(/\s+/g, "-"))),
  ];

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
    ...songs.map((s) => ({
      url: `${siteUrl}/songs/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...artistSlugs.map((slug) => ({
      url: `${siteUrl}/artists/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
