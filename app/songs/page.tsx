import { Suspense } from "react";
import { type Metadata } from "next";
import { getAllSongs } from "@/features/song/services/songs";
import { SongCard } from "@/features/song/components/SongCard";
import { Navbar } from "@/shared/components/Navbar";

export const metadata: Metadata = {
  title: "Каталог пісень — Акорди для гітари | Diez",
  description:
    "Шукайте акорди для гітари. Тисячі пісень українських та зарубіжних виконавців. Фільтруйте за складністю та жанром.",
  // Canonical always points to the clean URL, not to filtered/search variants.
  alternates: { canonical: "/songs" },
  openGraph: {
    title: "Каталог пісень — Diez",
    description: "Акорди для гітари. Знаходьте пісні та грайте разом.",
    type: "website",
    url: "/songs",
  },
};

interface SearchProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function SongsContent({ searchParams }: SearchProps) {
  const resolvedParams = await searchParams;
  const rawQ = resolvedParams.q;
  const q = typeof rawQ === 'string' ? rawQ.toLowerCase() : '';

  let songs = await getAllSongs();
  
  // Handle filters from categories
  const filter = resolvedParams.filter;
  if (filter === "recent") {
    // Just mock recent by returning them in current order
  } else if (filter === "love" || filter === "movies" || filter === "camping") {
    // For now showing all, but could filter by genre in future
  }

  // Handle search query
  if (q) {
    songs = songs.filter(
      s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }

  // Handle sorting
  const sort = resolvedParams.sort;
  if (sort === "popular") {
    songs = [...songs].sort((a, b) => b.views - a.views);
  } else if (sort === "new") {
    // Mock new sort
    songs = [...songs].reverse();
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
        <div className="flex-1 w-full">
          <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
            Каталог пісень
          </h1>
          
          <form method="GET" action="/songs" className="flex items-center gap-3 w-full">
            <div className="te-inset flex-1 flex items-center gap-3 px-4 py-3" style={{ borderRadius: "999px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                name="q"
                type="text"
                defaultValue={typeof rawQ === 'string' ? rawQ : ''}
                placeholder="Пісня або виконавець..."
                className="flex-1 bg-transparent outline-none text-sm font-medium"
                style={{ color: "var(--text)" }}
              />
            </div>
            <button type="submit" className="te-btn-orange px-5 py-3 text-xs font-bold tracking-widest shrink-0">
              ЗНАЙТИ
            </button>
          </form>
        </div>
        
        <div className="w-full md:w-64 te-surface p-4 shrink-0" style={{ borderRadius: "1.25rem" }}>
           <h3 className="font-bold mb-3 text-sm tracking-wide" style={{ color: "var(--text-muted)" }}>ФІЛЬТРИ</h3>
           <p className="text-xs text-center py-4 font-medium opacity-60" style={{ color: "var(--text-muted)" }}>Фільтрація за жанром або складністю з'явиться тут найближчим часом.</p>
        </div>
      </div>

      <h2 className="font-semibold mb-4" style={{ fontSize: "1.125rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
        {q ? `Результати для "${rawQ}"` : "Всі пісні"}
      </h2>

      {songs.length === 0 ? (
        <div className="te-surface p-12 text-center flex flex-col items-center justify-center gap-3" style={{ borderRadius: "1.25rem" }}>
           <span className="text-4xl">😢</span>
          <p style={{ color: "var(--text)" }} className="font-medium">На жаль, за вашим запитом нічого не знайдено.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {songs.map((song) => (
            <SongCard
              key={song.slug}
              slug={song.slug}
              title={song.title}
              artist={song.artist}
              difficulty={song.difficulty}
              chords={song.chords}
              views={song.views}
              coverImage={song.coverImage}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function SongsPage({ searchParams }: SearchProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Suspense fallback={<div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Завантаження...</div>}>
          <SongsContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
