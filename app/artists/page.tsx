import { Navbar } from "@/shared/components/Navbar";
import { getAllSongs } from "@/features/song/services/songs";
import { ArtistCard } from "@/features/artist/components/ArtistCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ArtistsPage() {
  const songs = getAllSongs();
  
  // Group by artist and calculate stats
  const artistMap = new Map();
  songs.forEach(s => {
    if (!artistMap.has(s.artist)) {
      artistMap.set(s.artist, {
        name: s.artist,
        songsCount: 0,
        genre: s.genre, // Just pick first genre for now
        color: "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') // Randomish stable color would be better but this works for mock
      });
    }
    artistMap.get(s.artist).songsCount++;
  });

  const artists = Array.from(artistMap.values());

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Назад
        </Link>

        <div className="te-surface p-12 mb-12 text-center" style={{ borderRadius: "2.5rem" }}>
          <h1 className="text-5xl font-bold mb-4 uppercase tracking-tighter">Виконавці</h1>
          <p className="text-[var(--text-muted)] uppercase tracking-[0.2em] text-sm">Усі гітарні майстри в одному списку</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {artists.map((artist) => (
            <ArtistCard 
              key={artist.name}
              {...artist}
              color={artist.name === "Океан Ельзи" ? "#31572C" : artist.name === "Charysmatic" ? "#4A1D1D" : artist.color}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
