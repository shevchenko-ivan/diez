import { Suspense } from "react";
import { type Metadata } from "next";
import { getSongsPage, type SongsPageArgs } from "@/features/song/services/songs";
import { getSavedSlugs } from "@/features/playlist/actions/playlists";
import { PageShell } from "@/shared/components/PageShell";
import { LoadingState } from "@/shared/components/LoadingState";
import { TeButton } from "@/shared/components/TeButton";
import { SortSelect } from "./SortSelect";
import { DifficultySelect } from "./DifficultySelect";
import { SongsInfiniteList } from "./SongsInfiniteList";

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

async function SongsContent({ searchParams }: SearchProps) {
  const resolvedParams = await searchParams;
  const rawQ = resolvedParams.q;
  const q = typeof rawQ === "string" ? rawQ.toLowerCase() : "";
  const sort = typeof resolvedParams.sort === "string" ? resolvedParams.sort : "";
  const difficulty = typeof resolvedParams.difficulty === "string" ? resolvedParams.difficulty : "";

  const sortMap: Record<string, "views" | "created_at_desc" | "created_at_asc" | "source_views" | "title_asc"> = {
    new: "created_at_desc",
    old: "created_at_asc",
    popular: "source_views",
    az: "title_asc",
    views: "views",
  };
  const diff = difficulty && ["easy", "medium", "hard"].includes(difficulty)
    ? (difficulty as "easy" | "medium" | "hard")
    : undefined;
  const queryArgs: Omit<SongsPageArgs, "offset" | "limit"> = {
    q: q || undefined,
    difficulty: diff,
    sortBy: sortMap[sort] ?? "source_views",
  };
  const [{ songs, total }, savedSet] = await Promise.all([
    getSongsPage({ ...queryArgs, offset: 0, limit: 50 }),
    getSavedSlugs(),
  ]);
  const savedSlugs = Array.from(savedSet);

  return (
    <>
      <div className="mb-8">
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
          <TeButton shape="pill" type="submit" className="px-5 py-3 text-xs font-bold tracking-widest shrink-0">
            ЗНАЙТИ
          </TeButton>
        </form>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-semibold" style={{ fontSize: "1.125rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
          {q ? `Результати для "${rawQ}"` : sort === "new" ? "Нові підбори" : sort === "popular" ? "Топ популярних" : "Всі пісні"}
          {total > 0 && (
            <span className="ml-2 text-sm font-normal opacity-50" style={{ color: "var(--text-muted)" }}>
              {total}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <DifficultySelect value={difficulty} />
          <SortSelect value={sort} />
        </div>
      </div>

      <SongsInfiniteList
        initialSongs={songs}
        initialTotal={total}
        savedSlugs={savedSlugs}
        query={queryArgs}
      />
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
