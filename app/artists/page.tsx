import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { EmptyState } from "@/shared/components/EmptyState";
import { getAllSongs } from "@/features/song/services/songs";
import { getAllArtists } from "@/features/artist/services/artists";
import { ArtistCard } from "@/features/artist/components/ArtistCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  const [songs, dbArtists] = await Promise.all([getAllSongs(), getAllArtists()]);

  // Count songs per artist name (published only)
  const songCount = new Map<string, number>();
  songs.forEach((s) => {
    const key = s.artist.toLowerCase();
    songCount.set(key, (songCount.get(key) ?? 0) + 1);
  });

  // Build from artists table — all artists, not just those with songs
  const artists = dbArtists.map((a) => ({
    name: a.name,
    songsCount: songCount.get(a.name.toLowerCase()) ?? 0,
    genre: a.genre ?? "",
    color: stringToColor(a.name),
    image: a.photo_url ?? undefined,
    slug: a.slug,
  }));

  return (
    <PageShell>
      <Link href="/" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
        <ArrowLeft size={14} /> Назад
      </Link>

      <div className="te-surface p-12 mb-12 text-center" style={{ borderRadius: "2.5rem" }}>
        <h1 className="text-5xl font-bold mb-4 uppercase tracking-tighter">Виконавці</h1>
        <p className="uppercase tracking-[0.2em] text-sm" style={{ color: "var(--text-muted)" }}>
          Усі гітарні майстри в одному списку
        </p>
      </div>

      {artists.length === 0 ? (
        <EmptyState message="Виконавців ще немає в каталозі." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {artists.map((artist) => (
            <ArtistCard key={artist.name} {...artist} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
