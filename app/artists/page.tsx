import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { EmptyState } from "@/shared/components/EmptyState";
import { getArtistSongCounts, getArtistPopularity } from "@/features/song/services/songs";
import { getAllArtists } from "@/features/artist/services/artists";
import { ArtistsGrid } from "@/features/artist/components/ArtistsGrid";
import { SavedArtistsProvider } from "@/features/artist/components/SavedArtistsProvider";
import { BackButton } from "@/shared/components/BackButton";
import { siteUrl, jsonLdScript } from "@/lib/utils";

// Static + hourly ISR. The page used to read the viewer's saved artists from
// the auth cookie, which made it dynamic: ~565 KB of HTML rendered from
// scratch on every visit (bots included) — one of the heaviest routes behind
// the 17.09.2026 Hobby fair-use block. Personalization (filled hearts, liked
// artists floated to the top) now happens on the client via
// SavedArtistsProvider for signed-in viewers only.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Виконавці — Акорди для гітари | Diez",
  description:
    "Усі виконавці в каталозі Diez. Знаходьте акорди улюблених українських та зарубіжних виконавців.",
  alternates: { canonical: "/artists" },
  openGraph: {
    title: "Виконавці — Diez",
    description: "Усі виконавці в каталозі Diez. Знаходьте акорди улюблених виконавців.",
    type: "website",
    url: "/artists",
  },
};

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).slice(-2);
  }
  return color;
}

export default async function ArtistsPage() {
  const [songCount, popularity, dbArtists] = await Promise.all([
    getArtistSongCounts(),
    getArtistPopularity(),
    getAllArtists(),
  ]);

  // Build from artists table — all artists, not just those with songs
  const artists = dbArtists
    .map((a) => {
      const key = a.name.toLowerCase();
      return {
        name: a.name,
        songsCount: songCount[key] ?? 0,
        avgViews: popularity[key]?.avg ?? 0,
        totalViews: popularity[key]?.total ?? 0,
        genre: a.genre ?? "",
        color: stringToColor(a.name),
        image: a.photo_url ?? undefined,
        slug: a.slug,
      };
    })
    // Total source_views desc (same metric as the home strip), tie-break by
    // name. Artists with a saved song float to the top on the client.
    .sort((a, b) => {
      if (b.totalViews !== a.totalViews) return b.totalViews - a.totalViews;
      return a.name.localeCompare(b.name, "uk");
    });

  // CollectionPage + BreadcrumbList JSON-LD — same rationale as /songs:
  // tells Google this is an index, gives the "Diez › Виконавці" trail.
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Виконавці",
    description: "Усі виконавці в каталозі Diez.",
    url: `${siteUrl}/artists`,
    inLanguage: "uk",
    isPartOf: { "@type": "WebSite", name: "Diez", url: siteUrl },
    numberOfItems: artists.length,
  };
  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Diez", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Виконавці", item: `${siteUrl}/artists` },
    ],
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(collectionLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsLd) }}
      />
      <div className="relative flex items-center mb-6 -mt-2">
        <BackButton fallback="/" />
        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold uppercase tracking-wider">Виконавці</h1>
      </div>

      {artists.length === 0 ? (
        <EmptyState message="Виконавців ще немає в каталозі." />
      ) : (
        <SavedArtistsProvider>
          <ArtistsGrid artists={artists} />
        </SavedArtistsProvider>
      )}
    </PageShell>
  );
}
