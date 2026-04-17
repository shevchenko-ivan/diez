"use client";

import { HapticLink } from "@/shared/components/HapticLink";
import { Heart } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";

// ── Song card (grid) ─────────────────────────────────────────────────────────

export interface SongCardProps {
  slug?: string;
  title: string;
  artist: string;
  difficulty: "easy" | "medium" | "hard";
  chords: string[];
  views: number;
  isSaved?: boolean;
  coverColor?: string;
  coverImage?: string;
  index?: number;
}

const difficultyConfig = {
  easy:   { label: "Легка",   color: "text-[#30D158]", bg: "bg-[#30D158]/10" },
  medium: { label: "Середня", color: "text-[#FF9F0A]", bg: "bg-[#FF9F0A]/10" },
  hard:   { label: "Складна", color: "text-[#FF453A]", bg: "bg-[#FF453A]/10" },
};

export function SongCard({ ...props }: SongCardProps) {
  const diff = difficultyConfig[props.difficulty];

  // Функція збереження, що не пускає лінк далі
  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Виклик хука мутації або попапа
  };

  const href = props.slug
    ? `/songs/${props.slug}`
    : `/songs/${encodeURIComponent(props.title.toLowerCase().replace(/\s+/g, "-"))}`;

  return (
    <HapticLink
      href={href}
      hapticType="strum"
      className="te-surface te-pressable flex flex-col group relative overflow-hidden"
      style={{ borderRadius: "1.25rem" }}
    >
      {/* --- MEDIA ZONE --- */}
      <div className="w-full aspect-[4/3] relative overflow-hidden bg-[var(--surface)] border-b border-[rgba(0,0,0,0.05)]">
        {/* Cover */}
        {props.coverImage ? (
          <img 
            src={props.coverImage} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            alt={props.title} 
          />
        ) : (
          <div
            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
            style={{
              background: `linear-gradient(145deg, ${props.coverColor || '#C8D5E8'}CC, ${props.coverColor || '#C8D5E8'}66)`,
            }}
          />
        )}
        

        {/* Save/Favorite Button */}
        <button 
          onClick={handleSave}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white/80 hover:text-white hover:bg-[#f43f5e] transition-colors z-10"
        >
          <Heart size={14} fill={props.isSaved ? "currentColor" : "none"} />
        </button>

        {/* Chords Preview */}
        <div className="absolute bottom-2 left-2 flex gap-1 z-10">
          {props.chords.slice(0, 3).map(chord => (
            <span key={chord} className="bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-black border border-black/10 shadow-sm">
              {chord}
            </span>
          ))}
        </div>
      </div>

      {/* --- META ZONE --- */}
      <div className="flex flex-col p-3.5 gap-1.5 flex-1">
        <h3 className="font-bold text-sm tracking-tight leading-tight line-clamp-1" style={{ color: "var(--text)" }}>
          {props.title}
        </h3>
        <p className="font-medium text-[11px] line-clamp-1 mb-1" style={{ color: "var(--text-muted)", opacity: 0.8 }}>
          {props.artist}
        </p>
        
        {/* Badges / Stats Row */}
        <div className="flex items-center gap-1.5 mt-auto flex-wrap">
          <span className={`px-2 py-[2px] rounded text-[10px] font-bold uppercase tracking-wider ${diff.bg} ${diff.color}`}>
            {diff.label}
          </span>
          {props.chords.length > 0 && (
            <>
              <span className="opacity-30 text-[10px]" style={{ color: "var(--text-muted)" }}>•</span>
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                {props.chords.length} ак.
              </span>
            </>
          )}
        </div>
      </div>
    </HapticLink>
  );
}

// ── Hero search ───────────────────────────────────────────────────────────────

export function HeroSearch() {
  return (
    <form action="/songs" method="GET" className="flex items-center gap-3 max-w-lg w-full">
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
          name="q"
          type="text"
          placeholder="Шукайте: Океан Ельзи, Бумбокс або 'Wonderwall'..."
          className="flex-1 bg-transparent outline-none text-sm font-medium"
          style={{ color: "var(--text)" }}
        />
      </div>

      {/* Search button — raised pill */}
      <TeButton
        shape="pill"
        type="submit"
        className="px-5 py-3 text-xs font-bold tracking-widest shrink-0"
      >
        ЗНАЙТИ
      </TeButton>
    </form>
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
