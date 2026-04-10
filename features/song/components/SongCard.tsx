"use client";

import Link from "next/link";
import Image from "next/image";
import { useHaptics } from "@/shared/hooks/useHaptics";

// ── Song card (grid) ─────────────────────────────────────────────────────────

interface SongCardProps {
  slug?: string;
  title: string;
  artist: string;
  difficulty: "easy" | "medium" | "hard";
  chords: string[];
  views: number;
  index?: number;
  coverColor?: string;
  coverImage?: string;
}

const difficultyDot: Record<string, string> = {
  easy: "#30D158",
  medium: "#FF9F0A",
  hard: "#FF453A",
};

export function SongCard({ slug, title, artist, difficulty, chords, views, index = 0, coverColor = "#C8D5E8", coverImage }: SongCardProps) {
  const { trigger } = useHaptics();
  const href = slug
    ? `/songs/${slug}`
    : `/songs/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}`;

  return (
    <Link
      href={href}
      className="te-surface te-pressable flex flex-col"
      onMouseDown={() => trigger("light")}
      onTouchStart={() => trigger("light")}
      style={{ borderRadius: "1.25rem" }}
    >
      {/* Cover image area */}
      <div
        className="w-full aspect-square relative overflow-hidden"
        style={{ borderRadius: "1.25rem 1.25rem 0 0" }}
      >
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
          />
        ) : (
          <div
            style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(145deg, ${coverColor}CC, ${coverColor}66)`,
            }}
          />
        )}
        {/* Difficulty dot */}
        <div
          className="absolute top-3 right-3"
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: difficultyDot[difficulty],
            boxShadow: `0 0 6px ${difficultyDot[difficulty]}`,
            zIndex: 1,
          }}
        />
        {/* Chord tag */}
        <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap max-w-[85%]" style={{ zIndex: 1 }}>
          {chords.slice(0, 3).map((c) => (
            <span
              key={c}
              className="te-lcd font-mono-te text-xs px-2 py-0.5"
              style={{ fontSize: "0.65rem" }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="p-3">
        <p
          className="font-medium text-xs tracking-wide leading-tight uppercase"
          style={{ color: "var(--text)", letterSpacing: "0.04em" }}
        >
          {title}
        </p>
        <p
          className="text-xs font-medium mt-0.5 uppercase tracking-wide"
          style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.08em" }}
        >
          {artist}
        </p>
      </div>
    </Link>
  );
}

// ── Hero search ───────────────────────────────────────────────────────────────

export function HeroSearch() {
  return (
    <div className="flex items-center gap-3 max-w-lg w-full">
      {/* Main search — inset pill */}
      <div
        className="te-inset flex-1 flex items-center gap-3 px-4 py-3"
        style={{ borderRadius: "999px" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="hero-search"
          type="text"
          placeholder="Пісня або виконавець..."
          className="flex-1 bg-transparent outline-none text-sm font-medium"
          style={{ color: "var(--text)" }}
        />
      </div>

      {/* Search button — raised pill */}
      <button
        id="hero-search-submit"
        className="te-btn-orange px-5 py-3 text-xs font-bold tracking-widest shrink-0"
      >
        ЗНАЙТИ
      </button>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

export function StatsBar() {
  const stats = [
    { value: "2400", label: "SONGS" },
    { value: "450", label: "ARTISTS" },
    { value: "1.2K", label: "ONLINE" },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {stats.map((s) => (
        <div key={s.label} className="te-lcd px-5 py-3 text-center" style={{ minWidth: 100 }}>
          <div className="font-mono-te text-2xl font-bold" style={{ color: "var(--panel-text)", letterSpacing: "-0.02em" }}>
            {s.value}
          </div>
          <div className="font-mono-te text-xs tracking-widest mt-0.5" style={{ color: "#5A7A20", fontSize: "0.6rem" }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
