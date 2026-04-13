import { Suspense } from "react";
import { type Metadata } from "next";
import { getAllSongs } from "@/features/song/services/songs";
import { SongCard } from "@/features/song/components/SongCard";
import { PageShell } from "@/shared/components/PageShell";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";

export const metadata: Metadata = {
  title: "Каталог пісень — Акорди для гітари | Diez",
  description:
    "Шукайте акорди для гітари. Тисячі пісень українських та зарубіжних виконавців. Фільтруйте за складністю та жанром.",
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

const DIFFICULTY_FILTERS = [
  { value: "easy",   label: "Легка" },
  { value: "medium", label: "Середня" },
  { value: "hard",   label: "Складна" },
];

async function SongsContent({ searchParams }: SearchProps) {
  const resolvedParams = await searchParams;
  const rawQ = resolvedParams.q;
  const q = typeof rawQ === "string" ? rawQ.toLowerCase() : "";
  const sort = typeof resolvedParams.sort === "string" ? resolvedParams.sort : "";
  const difficulty = typeof resolvedParams.difficulty === "string" ? resolvedParams.difficulty : "";

  let songs = await getAllSongs({ sortBy: sort === "new" ? "created_at" : "views" });

  // Search filter
  if (q) {
    songs = songs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }

  // Difficulty filter
  if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) {
    songs = songs.filter((s) => s.difficulty === difficulty);
  }

  // Build filter URL helper (preserves other params)
  function filterUrl(key: string, value: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", rawQ as string);
    if (sort) params.set("sort", sort);
    if (key === "difficulty") {
      if (value !== difficulty) params.set("difficulty", value);
    } else {
      if (difficulty) params.set("difficulty", difficulty);
    }
    const str = params.toString();
    return "/songs" + (str ? "?" + str : "");
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
        <div className="flex-1 w-full">
          <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
            Каталог пісень
          </h1>

          <form method="GET" action="/songs" className="flex items-center gap-3 w-full">
            {sort && <input type="hidden" name="sort" value={sort} />}
            {difficulty && <input type="hidden" name="difficulty" value={difficulty} />}
            <div className="te-inset flex-1 flex items-center gap-3 px-4 py-3" style={{ borderRadius: "999px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                name="q"
                type="text"
                defaultValue={typeof rawQ === "string" ? rawQ : ""}
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

        {/* Difficulty filter panel */}
        <div className="w-full md:w-56 te-surface p-4 shrink-0" style={{ borderRadius: "1.25rem" }}>
          <h3 className="font-bold mb-3 text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Складність</h3>
          <div className="flex flex-col gap-1">
            {DIFFICULTY_FILTERS.map((f) => {
              const isActive = difficulty === f.value;
              return (
                <a
                  key={f.value}
                  href={filterUrl("difficulty", f.value)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{
                    color: isActive ? "var(--orange)" : "var(--text-mid)",
                    background: isActive ? "rgba(255,69,0,0.08)" : "transparent",
                  }}
                >
                  {f.label}
                </a>
              );
            })}
            {difficulty && (
              <a
                href={filterUrl("difficulty", "")}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{ color: "var(--text-muted)", opacity: 0.6 }}
              >
                × Скинути
              </a>
            )}
          </div>
        </div>
      </div>

      <h2 className="font-semibold mb-4" style={{ fontSize: "1.125rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
        {q ? `Результати для "${rawQ}"` : sort === "new" ? "Нові підбори" : sort === "popular" ? "Топ популярних" : "Всі пісні"}
        {songs.length > 0 && (
          <span className="ml-2 text-sm font-normal opacity-50" style={{ color: "var(--text-muted)" }}>
            {songs.length}
          </span>
        )}
      </h2>

      {songs.length === 0 ? (
        <EmptyState message="На жаль, за вашим запитом нічого не знайдено." />
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
              coverColor={song.coverColor}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function SongsPage({ searchParams }: SearchProps) {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <SongsContent searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
