import { Navbar } from "@/shared/components/Navbar";
import { getAllSongs } from "@/features/song/services/songs";
import { SongCard } from "@/features/song/components/SongCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artistName = decodeURIComponent(slug).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const songs = getAllSongs().filter(s => s.artist.toLowerCase() === artistName.toLowerCase());

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Назад до головної
        </Link>

        <div className="te-surface p-8 mb-12" style={{ borderRadius: "2rem" }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
             <div className="te-knob w-32 h-32 flex-shrink-0 flex items-center justify-center text-4xl">
               🎸
             </div>
             <div>
               <h1 className="text-4xl font-bold mb-2 uppercase tracking-tight">{artistName}</h1>
               <p className="text-[var(--text-muted)] uppercase tracking-widest text-xs">Виконавець · {songs.length} пісень</p>
             </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-6 uppercase tracking-wider">Пісні виконавця</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {songs.map(({ key: _musicalKey, ...s }) => (
            <SongCard key={s.slug} {...s} />
          ))}
          {songs.length === 0 && (
            <p className="col-span-full py-12 text-center text-[var(--text-muted)] te-inset rounded-2xl">
              Пісень цього виконавця поки немає в базі.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
