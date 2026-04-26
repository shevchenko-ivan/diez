"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Volume2 } from "lucide-react";
import { type Song } from "@/features/song/types";
import { SaveHeartButton } from "@/features/song/components/SaveHeartButton";
import { EmptyState } from "@/shared/components/EmptyState";
import { fetchSongsPage } from "./actions";
import { type SongsPageArgs } from "@/features/song/services/songs";

const PAGE_SIZE = 50;

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
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const saved = new Set(savedSlugs);

  const hasMore = songs.length < total;

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || isPending) return;
        startTransition(async () => {
          const res = await fetchSongsPage({ ...query, offset: songs.length, limit: PAGE_SIZE });
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
            <li key={song.slug} className="te-surface flex items-center gap-3 p-3" style={{ borderRadius: "1rem" }}>
              <div
                className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  background: song.coverImage
                    ? undefined
                    : `linear-gradient(135deg, ${song.coverColor ?? "#C8D5E8"}CC, ${song.coverColor ?? "#C8D5E8"}66)`,
                }}
              >
                {song.coverImage && (
                  <Image src={song.coverImage} alt={song.title} width={56} height={56} className="w-full h-full object-cover" />
                )}
              </div>
              <Link href={`/songs/${song.slug}`} className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{song.title}</div>
                <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{song.artist}</div>
              </Link>
              <span
                title={hasPlayer ? "Є плеєр з музикою" : "Без плеєра"}
                aria-label={hasPlayer ? "Є плеєр з музикою" : "Без плеєра"}
                className="inline-flex items-center justify-center"
                style={{ width: 28, height: 28, color: hasPlayer ? "var(--orange)" : "var(--text-muted)", opacity: hasPlayer ? 1 : 0.25 }}
              >
                <Volume2 size={18} strokeWidth={2} />
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
