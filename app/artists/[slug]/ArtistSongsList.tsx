"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Music, ArrowUpDown } from "lucide-react";
import { SongCover } from "@/shared/components/SongCover";
import { SaveHeartButton } from "@/features/song/components/SaveHeartButton";
import { EmptyState } from "@/shared/components/EmptyState";

interface Song {
  slug: string;
  title: string;
  artist: string;
  difficulty: string;
  coverImage?: string | null;
  coverColor?: string | null;
  youtubeId?: string | null;
  views?: number;
  sourceViews?: number;
  createdAt?: string;
}

interface Props {
  /** In the server's default order (source popularity, desc). */
  songs: Song[];
  /** Hide the search input for short lists (< 5 songs). */
  showSearch?: boolean;
  /** Show the sort control (the list re-sorts on the client). */
  sortable?: boolean;
}

// Same two options the shared SortSelect offers; the extra keys below are
// accepted from a `?sort=` deep link for backward compatibility.
const SORT_OPTIONS = [
  { value: "", label: "За популярністю" },
  { value: "az", label: "За алфавітом" },
];
type SortKey = "" | "az" | "new" | "old" | "views" | "popular";
const SORT_KEYS: SortKey[] = ["", "az", "new", "old", "views", "popular"];

function norm(s: string) {
  return s.toLowerCase().replace(/[`'’ʼ"«»„"]/g, "").trim();
}

function sortSongs(songs: Song[], sort: SortKey): Song[] {
  switch (sort) {
    case "az":
      return [...songs].sort((a, b) => a.title.localeCompare(b.title, "uk"));
    case "new":
      return [...songs].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    case "old":
      return [...songs].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    case "views":
      return [...songs].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    default:
      // "" / "popular" — the server's own order (source_views desc).
      return songs;
  }
}

// Sorting lives on the client on purpose. The artist page is static (cached at
// the edge), so a `?sort=` query can no longer change what the server renders;
// reading it through `useSearchParams` here would also force this whole list —
// the page's SEO content — to render client-side only. Instead: the HTML
// always carries the default order, the control re-sorts in place, and the
// URL is kept in sync with history.replaceState so links stay shareable. A
// visitor arriving on a `?sort=` deep link sees the default order for one
// frame before the effect below applies the requested sort.
export function ArtistSongsList({ songs, showSearch = true, sortable = false }: Props) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("sort") ?? "";
    if (requested && SORT_KEYS.includes(requested as SortKey)) setSort(requested as SortKey);
  }, []);

  const changeSort = (next: string) => {
    const key = (SORT_KEYS.includes(next as SortKey) ? next : "") as SortKey;
    setSort(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set("sort", key);
    else url.searchParams.delete("sort");
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const sorted = useMemo(() => sortSongs(songs, sort), [songs, sort]);

  const filtered = useMemo(() => {
    const query = norm(q);
    if (!query) return sorted;
    return sorted.filter((s) => norm(s.title).includes(query));
  }, [sorted, q]);

  return (
    <>
      {showSearch && (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <label htmlFor="artist-songs-search" className="sr-only">Пошук пісень виконавця</label>
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
          />
          <input
            id="artist-songs-search"
            type="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук пісні…"
            className="te-inset w-full pl-10 pr-10 py-3 text-sm rounded-xl outline-none"
            style={{ color: "var(--text)" }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100"
              aria-label="Очистити"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {sortable && (
          <div className="flex items-center">
            <ArrowUpDown size={14} aria-hidden="true" style={{ color: "var(--text-muted)", marginRight: 8, flexShrink: 0 }} />
            <select
              value={SORT_OPTIONS.some((o) => o.value === sort) ? sort : ""}
              onChange={(e) => changeSort(e.target.value)}
              aria-label="Сортування пісень"
              className="te-inset pl-3 py-2 text-xs font-bold outline-none bg-transparent appearance-none"
              style={{
                borderRadius: "0.75rem",
                color: "var(--text)",
                paddingRight: "2rem",
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem center",
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          message={q ? `Нічого не знайдено за запитом «${q}»` : "Пісень цього виконавця поки немає в базі."}
          variant="inset"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((song) => {
            const hasPlayer = Boolean(song.youtubeId);
            return (
              <li
                key={song.slug}
                className="te-surface flex items-center gap-3 p-3"
                style={{
                  borderRadius: "1rem",
                  // Skip layout/paint for rows outside the viewport. Each row
                  // is ~80px; placeholder size prevents scroll-jump. Baseline
                  // since 2025-09; ignored by older browsers.
                  contentVisibility: "auto",
                  containIntrinsicSize: "auto 80px",
                }}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <SongCover
                    src={song.coverImage}
                    alt={`Обкладинка пісні «${song.title}» — ${song.artist}`}
                    title={`${song.title} — ${song.artist}`}
                    width={56}
                    height={56}
                    iconSize={22}
                  />
                </div>
                <Link prefetch={false} href={`/songs/${song.slug}`} className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: "var(--text)" }}>{song.title}</div>
                  <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{song.artist}</div>
                </Link>
                <span
                  role="img"
                  title={hasPlayer ? "Є плеєр з музикою" : "Без плеєра"}
                  aria-label={hasPlayer ? "Є плеєр з музикою" : "Без плеєра"}
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    color: hasPlayer ? "var(--orange)" : "var(--text-muted)",
                    opacity: hasPlayer ? 1 : 0.25,
                  }}
                >
                  <Music size={18} strokeWidth={2} />
                </span>
                {/* Saved state arrives from SavedSlugsProvider (root layout)
                    for signed-in viewers — the static HTML can't know it. */}
                <SaveHeartButton
                  slug={song.slug}
                  variant="bare"
                  size={14}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
