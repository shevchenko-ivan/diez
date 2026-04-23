"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { HapticLink } from "@/shared/components/HapticLink";
import { TeButton } from "@/shared/components/TeButton";
import { DifficultyBadge } from "@/shared/components/DifficultyBadge";
import { SaveHeartButton } from "./SaveHeartButton";

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
  variantId?: string | null;
}

export function SongCard({ ...props }: SongCardProps) {
  const base = props.slug
    ? `/songs/${props.slug}`
    : `/songs/${encodeURIComponent(props.title.toLowerCase().replace(/\s+/g, "-"))}`;
  const href = props.variantId ? `${base}?v=${props.variantId}` : base;

  return (
    <HapticLink
      href={href}
      hapticType="strum"
      className="te-card-thick te-pressable flex flex-col group relative"
      style={{ borderRadius: "1.5rem", padding: "10px" }}
    >
      {/* --- MEDIA ZONE (recessed "well") --- */}
      <div
        className="te-card-well w-full aspect-[4/3] relative overflow-hidden"
        style={{ borderRadius: "1rem" }}
      >
        {/* Cover */}
        {props.coverImage ? (
          <Image
            src={props.coverImage}
            className="object-cover"
            alt={props.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(145deg, ${props.coverColor || '#C8D5E8'}CC, ${props.coverColor || '#C8D5E8'}66)`,
            }}
          />
        )}
        

        {/* Save to favorites (вибране) */}
        {props.slug && (
          <SaveHeartButton slug={props.slug} initialSaved={props.isSaved} />
        )}

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
      <div className="flex flex-col px-2 pt-2.5 pb-1 gap-1.5 flex-1">
        <h3 className="font-bold text-sm tracking-tight leading-tight line-clamp-1 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
          <span className="line-clamp-1">{props.title}</span>
          <DifficultyBadge difficulty={props.difficulty} />
        </h3>
        <p className="font-medium text-[11px] line-clamp-1" style={{ color: "var(--text-muted)", opacity: 0.8 }}>
          {props.artist}
        </p>
      </div>
    </HapticLink>
  );
}

// ── Hero search ───────────────────────────────────────────────────────────────

type SongSuggestion = { slug: string; title: string; artist: string; difficulty: "easy" | "medium" | "hard"; cover_image?: string | null; cover_color?: string | null };
type ArtistSuggestion = { slug: string; name: string; photo_url?: string | null };

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).slice(-2);
  }
  return color;
}

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [songs, setSongs] = useState<SongSuggestion[]>([]);
  const [artists, setArtists] = useState<ArtistSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced fetch
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setSongs([]); setArtists([]); setActiveIndex(-1); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        setSongs(data.songs ?? []);
        setArtists(data.artists ?? []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/songs?q=${encodeURIComponent(term)}`);
  };

  // Flat list of navigable suggestions (artists first, then songs) — matches render order.
  const items: { key: string; href: string }[] = [
    ...artists.map((a) => ({ key: `a-${a.slug}`, href: `/artists/${a.slug}` })),
    ...songs.map((s) => ({ key: `s-${s.slug}`, href: `/songs/${s.slug}` })),
  ];
  const artistsOffset = 0;
  const songsOffset = artists.length;

  // Reset active item when results change.
  useEffect(() => { setActiveIndex(-1); }, [q]);

  // Scroll active item into view.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && open) {
      e.preventDefault();
      setOpen(false);
      router.push(items[activeIndex].href);
    }
  };

  const hasResults = songs.length > 0 || artists.length > 0;
  const showDropdown = open && q.trim().length >= 2;
  const activeStyle = { background: "rgba(0,0,0,0.05)" };

  return (
    <div ref={wrapRef} className="relative max-w-lg w-full">
      <form onSubmit={submit} className="flex items-center gap-2 w-full">
        <div
          className="te-inset flex-1 flex items-center gap-2 px-3 py-3"
          style={{ borderRadius: "999px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="hero-search"
            name="q"
            type="text"
            autoComplete="off"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="hero-search-listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `hero-search-item-${activeIndex}` : undefined}
            placeholder="Шукайте: Океан Ельзи, Бумбокс або 'Wonderwall'..."
            className="flex-1 bg-transparent outline-none text-sm font-medium"
            style={{ color: "var(--text)" }}
          />
        </div>

        {/* Mobile: icon-only */}
        <span className="md:hidden shrink-0">
          <TeButton
            shape="pill"
            type="submit"
            icon={Search}
            aria-label="Знайти"
            title="Знайти"
          />
        </span>
        {/* Desktop: text label */}
        <span className="hidden md:inline-flex shrink-0">
          <TeButton
            shape="pill"
            type="submit"
            aria-label="Знайти"
            className="px-5 py-3 text-xs font-bold tracking-widest"
          >
            ЗНАЙТИ
          </TeButton>
        </span>
      </form>

      {showDropdown && (
        <div
          ref={listRef}
          id="hero-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 mt-2 te-surface overflow-hidden text-left z-50 max-h-[70vh] overflow-y-auto"
          style={{ borderRadius: "1.25rem", boxShadow: "0 12px 36px rgba(0,0,0,0.18)" }}
        >
          {loading && !hasResults && (
            <div className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>Пошук…</div>
          )}
          {!loading && !hasResults && (
            <div className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>Нічого не знайдено</div>
          )}
          {artists.length > 0 && (
            <div className="py-1">
              <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                Виконавці
              </div>
              {artists.map((a, i) => {
                const color = stringToColor(a.name);
                const idx = artistsOffset + i;
                const isActive = idx === activeIndex;
                return (
                  <Link
                    key={a.slug}
                    href={`/artists/${a.slug}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    data-idx={idx}
                    id={`hero-search-item-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    style={isActive ? activeStyle : undefined}
                    className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                  >
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{
                        background: a.photo_url ? undefined : `radial-gradient(circle at 40% 35%, ${color}55, ${color}22)`,
                        color: `${color}`,
                      }}
                    >
                      {a.photo_url ? (
                        <Image src={a.photo_url} alt={a.name} width={36} height={36} className="w-full h-full object-cover" />
                      ) : (
                        a.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{a.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {songs.length > 0 && (
            <div className="py-1 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                Пісні
              </div>
              {songs.map((s, i) => {
                const fallback = s.cover_color ?? stringToColor(s.artist);
                const idx = songsOffset + i;
                const isActive = idx === activeIndex;
                return (
                  <Link
                    key={s.slug}
                    href={`/songs/${s.slug}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    data-idx={idx}
                    id={`hero-search-item-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    style={isActive ? activeStyle : undefined}
                    className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                  >
                    <div
                      className="w-9 h-9 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{
                        background: s.cover_image ? undefined : `linear-gradient(135deg, ${fallback}aa, ${fallback}55)`,
                      }}
                    >
                      {s.cover_image ? (
                        <Image src={s.cover_image} alt={s.title} width={36} height={36} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: `${fallback}` }}>{s.artist.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{s.title}</div>
                      <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.artist}</div>
                    </div>
                    <DifficultyBadge difficulty={s.difficulty} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
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
