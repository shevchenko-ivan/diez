import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { EmptyState } from "@/shared/components/EmptyState";
import { getArtistSongCounts, getArtistPopularity } from "@/features/song/services/songs";
import { getAllArtists } from "@/features/artist/services/artists";
import { ArtistCard } from "@/features/artist/components/ArtistCard";
import { BackButton } from "@/shared/components/BackButton";

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
        genre: a.genre ?? "",
        color: stringToColor(a.name),
        image: a.photo_url ?? undefined,
        slug: a.slug,
      };
    })
    // Sort by average source_views desc; artists without songs fall to bottom,
    // tie-break by name so the order is stable.
    .sort((a, b) => {
      if (b.avgViews !== a.avgViews) return b.avgViews - a.avgViews;
      return a.name.localeCompare(b.name, "uk");
    });

  return (
    <PageShell>
      <div className="relative flex items-center mb-6 -mt-2">
        <BackButton fallback="/" />
        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold uppercase tracking-wider">Виконавці</h1>
      </div>

      {artists.length === 0 ? (
        <EmptyState message="Виконавців ще немає в каталозі." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {artists.map((artist) => (
            <ArtistCard key={artist.slug} {...artist} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
