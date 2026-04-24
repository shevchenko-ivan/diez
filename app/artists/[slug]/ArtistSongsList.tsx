"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Volume2 } from "lucide-react";
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
}

interface Props {
  songs: Song[];
  savedSlugs: string[];
  /** Hide the search input for short lists (< 5 songs). */
  showSearch?: boolean;
}

function norm(s: string) {
  return s.toLowerCase().replace(/[`'’ʼ"«»„"]/g, "").trim();
}

export function ArtistSongsList({ songs, savedSlugs, showSearch = true }: Props) {
  const [q, setQ] = useState("");
  const saved = useMemo(() => new Set(savedSlugs), [savedSlugs]);

  const filtered = useMemo(() => {
    const query = norm(q);
    if (!query) return songs;
    return songs.filter((s) => norm(s.title).includes(query));
  }, [songs, q]);

  return (
    <>
      {showSearch && (
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
        />
        <input
          type="search"
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
                style={{ borderRadius: "1rem" }}
              >
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
                  style={{
                    width: 28,
                    height: 28,
                    color: hasPlayer ? "var(--orange)" : "var(--text-muted)",
                    opacity: hasPlayer ? 1 : 0.25,
                  }}
                >
                  <Volume2 size={18} strokeWidth={2} />
                </span>
                <SaveHeartButton
                  slug={song.slug}
                  initialSaved={saved.has(song.slug)}
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
