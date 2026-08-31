"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Music } from "lucide-react";
import { SongCover } from "@/shared/components/SongCover";
import { type Song } from "@/features/song/types";
import { SaveHeartButton } from "@/features/song/components/SaveHeartButton";
import { EmptyState } from "@/shared/components/EmptyState";
import { useLiteMode } from "@/shared/components/LiteModeProvider";
import { fetchSongsPage } from "./actions";
import { type SongsPageArgs } from "@/features/song/services/songs";

const PAGE_SIZE = 50;

// Loaded pages, keyed by the serialized query, surviving soft navigations.
// Without this, coming BACK to the catalogue remounts the list with only the
// first 50 rows: the browser restores the old (deep) scroll offset, clamps it
// to the now-short page, and the user lands at the bottom with the sentinel
// ~1000px ABOVE the viewport — outside the observer's margin, so loading
// never resumes (stuck list), and when they scroll up past the sentinel,
// 50 rows (~4400px) insert above the fold and shove the whole screen down —
// the 0.9–1.1 field CLS bursts on /songs and topic pages traced to exactly
// this bounce pattern. Session-lifetime staleness is acceptable here.
const listCache = new Map<string, { songs: Song[]; total: number }>();
const LIST_CACHE_MAX = 8;

export function SongsInfiniteList({
  initialSongs,
  initialTotal,
  savedSlugs,
  query,
}: {
  initialSongs: Song[];
  initialTotal: number;
  savedSlugs: string[];
  query: Omit<SongsPageArgs, "offset" | "limit">;
}) {
  const cacheKey = useMemo(() => JSON.stringify(query), [query]);
  const [songs, setSongs] = useState<Song[]>(() => {
    const cached = listCache.get(cacheKey);
    return cached && cached.songs.length > initialSongs.length ? cached.songs : initialSongs;
  });
  const [total, setTotal] = useState(() => listCache.get(cacheKey)?.total ?? initialTotal);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Sentinel's viewport-relative top right before an append commits; non-null
  // only when the insert point sits above the viewport (user below the list
  // end), which is when the new rows would shove everything they're looking
  // at downward.
  const anchorRef = useRef<number | null>(null);
  const saved = new Set(savedSlugs);
  const lite = useLiteMode();

  const hasMore = songs.length < total;

  useEffect(() => {
    if (songs.length > PAGE_SIZE) {
      listCache.set(cacheKey, { songs, total });
      // Refresh insertion order so the oldest query is the one evicted.
      const entry = listCache.get(cacheKey)!;
      listCache.delete(cacheKey);
      listCache.set(cacheKey, entry);
      while (listCache.size > LIST_CACHE_MAX) {
        listCache.delete(listCache.keys().next().value!);
      }
    }
  }, [songs, total, cacheKey]);

  // Manual scroll anchoring: when rows were inserted above the viewport,
  // shift scroll by the same delta before paint. Screen-space positions stay
  // put, so the user keeps their place and no layout-shift entry is recorded.
  useLayoutEffect(() => {
    if (anchorRef.current === null || !sentinelRef.current) return;
    const delta = sentinelRef.current.getBoundingClientRect().top - anchorRef.current;
    anchorRef.current = null;
    if (delta > 0) window.scrollBy(0, delta);
  }, [songs.length]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || isPending) return;
        startTransition(async () => {
          const res = await fetchSongsPage({ ...query, offset: songs.length, limit: PAGE_SIZE });
          const top = sentinelRef.current?.getBoundingClientRect().top;
          anchorRef.current = top !== undefined && top < 0 ? top : null;
          setSongs((prev) => [...prev, ...res.songs]);
          setTotal(res.total);
        });
      },
      { rootMargin: "600px" },
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore, isPending, songs.length, query]);

  if (songs.length === 0) {
    return <EmptyState message="На жаль, за вашим запитом нічого не знайдено." />;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {songs.map((song) => {
          const hasPlayer = Boolean(song.youtubeId);
          return (
            <li
              key={song.slug}
              className="te-surface flex items-center gap-3 p-3"
              style={{
                borderRadius: "1rem",
                // Skip layout/paint for rows outside the viewport. Each row
                // is ~80px (h-14 cover + p-3 padding); the placeholder size
                // prevents scroll-jump when content unboxes. Baseline since
                // 2025-09; older browsers just ignore these properties.
                contentVisibility: "auto",
                containIntrinsicSize: "auto 80px",
              }}
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                <SongCover
                  src={lite ? null : song.coverImage}
                  alt={`Обкладинка пісні «${song.title}» — ${song.artist}`}
                  title={`${song.title} — ${song.artist}`}
                  width={56}
                  height={56}
                  iconSize={22}
                />
              </div>
              <Link href={`/songs/${song.slug}`} className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate" style={{ color: "var(--text)" }}>{song.title}</div>
                <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{song.artist}</div>
              </Link>
              <span
                role="img"
                title={hasPlayer ? "Є плеєр з музикою" : "Без плеєра"}
                aria-label={hasPlayer ? "Є плеєр з музикою" : "Без плеєра"}
                className="inline-flex items-center justify-center"
                style={{ width: 28, height: 28, color: hasPlayer ? "var(--orange)" : "var(--text-muted)", opacity: hasPlayer ? 1 : 0.25 }}
              >
                <Music size={18} strokeWidth={2} />
              </span>
              <SaveHeartButton slug={song.slug} initialSaved={saved.has(song.slug)} variant="bare" size={14} />
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <div ref={sentinelRef} className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          {isPending ? "Завантаження…" : ""}
        </div>
      )}
    </>
  );
}
