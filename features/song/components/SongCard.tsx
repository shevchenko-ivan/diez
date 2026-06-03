"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { HapticLink } from "@/shared/components/HapticLink";
import { TeButton } from "@/shared/components/TeButton";
import { useLiteMode } from "@/shared/components/LiteModeProvider";
import { SongCover } from "@/shared/components/SongCover";
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
  /** Hide the save-heart overlay (e.g. song-page recommendation grids). */
  hideSave?: boolean;
}

export function SongCard({ ...props }: SongCardProps) {
  const lite = useLiteMode();
  const base = props.slug
    ? `/songs/${props.slug}`
    : `/songs/${encodeURIComponent(props.title.toLowerCase().replace(/\s+/g, "-"))}`;
  const href = props.variantId ? `${base}?v=${props.variantId}` : base;

  const fallbackColor = props.coverColor || "#C8D5E8";

  // Vinyl-sleeve style, identical to the homepage "Топ популярних" cards
  // (TopSongCard / .top-song-card* in globals.css): square sharp-edged cover
  // with a drop shadow + theme-aware edge ring, caption below that's muted by
  // default and brightens on hover while the cover scales up. The save-heart is
  // kept as a cover overlay so grids (profile / lists) don't lose the action.
  return (
    <HapticLink
      href={href}
      hapticType="strum"
      className="top-song-card group block focus-visible:outline-none relative"
    >
      <div
        className="top-song-card-cover relative aspect-square overflow-hidden"
        style={{
          borderRadius: 0,
          background: `linear-gradient(145deg, ${fallbackColor}CC, ${fallbackColor}66)`,
          boxShadow: "0 6px 16px rgba(0,0,0,0.35), inset 0 0 0 1px var(--border)",
        }}
      >
        {/* Cover — descriptive alt doubles as Google Image Search input +
            screen-reader label. `priority` skips lazy loading for the first few
            above-the-fold cards. */}
        <SongCover
          src={lite ? null : props.coverImage}
          alt={`Обкладинка пісні «${props.title}» — ${props.artist}`}
          title={`${props.title} — ${props.artist}`}
          fill
          sizes="(max-width: 1024px) 50vw, 360px"
          priority={typeof props.index === "number" && props.index < 4}
          iconSize={40}
        />
      </div>

      {/* Save-heart overlay — sibling of the cover (not inside it) so it doesn't
          scale with the cover on hover. Shown when saved / hover / focus /
          touch, mirroring the previous behaviour. */}
      {props.slug && !props.hideSave && (
        <div
          className={
            "absolute top-1.5 right-1.5 z-10 transition-opacity duration-150 focus-within:opacity-100 [@media(hover:none)]:opacity-100 " +
            (props.isSaved ? "opacity-100" : "opacity-0 group-hover:opacity-100")
          }
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", padding: 4 }}
          >
            <SaveHeartButton slug={props.slug} initialSaved={props.isSaved} variant="bare" size={16} />
          </span>
        </div>
      )}

      <div className="top-song-card-caption text-center mt-2 px-1">
        <p className="font-bold text-sm truncate" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
          {props.title}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
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
  const lite = useLiteMode();
  const [q, setQ] = useState("");
  const [songs, setSongs] = useState<SongSuggestion[]>([]);
  const [lyricsSongs, setLyricsSongs] = useState<SongSuggestion[]>([]);
  const [artists, setArtists] = useState<ArtistSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const moreCtrlRef = useRef<AbortController | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced fetch — initial page (offset 0).
  useEffect(() => {
    const term = q.trim();
    moreCtrlRef.current?.abort();
    if (term.length < 2) {
      setSongs([]); setLyricsSongs([]); setArtists([]);
      setHasMore(false); setLoadingMore(false);
      offsetRef.current = 0;
      setActiveIndex(-1);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        setSongs(data.songs ?? []);
        setLyricsSongs(data.lyricsSongs ?? []);
        setArtists(data.artists ?? []);
        setHasMore(!!data.hasMore);
        offsetRef.current = data.nextOffset ?? 0;
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const loadMore = async () => {
    const term = q.trim();
    if (!term || loadingMore || !hasMore) return;
    setLoadingMore(true);
    moreCtrlRef.current = new AbortController();
    try {
      const res = await fetch(
        `/api/search/suggest?q=${encodeURIComponent(term)}&offset=${offsetRef.current}`,
        { signal: moreCtrlRef.current.signal },
      );
      const data = await res.json();
      const seenSongs = new Set(songs.map((s) => s.slug));
      const seenLyrics = new Set(lyricsSongs.map((s) => s.slug));
      const newSongs: SongSuggestion[] = (data.songs ?? []).filter((s: SongSuggestion) => !seenSongs.has(s.slug));
      const newLyrics: SongSuggestion[] = (data.lyricsSongs ?? []).filter((s: SongSuggestion) => !seenLyrics.has(s.slug));
      if (newSongs.length) setSongs((prev) => [...prev, ...newSongs]);
      if (newLyrics.length) setLyricsSongs((prev) => [...prev, ...newLyrics]);
      setHasMore(!!data.hasMore);
      offsetRef.current = data.nextOffset ?? offsetRef.current;
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  };

  const onListScroll = () => {
    const el = listRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      loadMore();
    }
  };

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

  // Flat list of navigable suggestions (artists, songs, lyrics) — matches render order.
  const items: { key: string; href: string }[] = [
    ...artists.map((a) => ({ key: `a-${a.slug}`, href: `/artists/${a.slug}` })),
    ...songs.map((s) => ({ key: `s-${s.slug}`, href: `/songs/${s.slug}` })),
    ...lyricsSongs.map((s) => ({ key: `l-${s.slug}`, href: `/songs/${s.slug}` })),
  ];
  const artistsOffset = 0;
  const songsOffset = artists.length;
  const lyricsOffset = artists.length + songs.length;

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

  const hasResults = songs.length > 0 || lyricsSongs.length > 0 || artists.length > 0;
  const showDropdown = open && q.trim().length >= 2;
  const activeStyle = { background: "rgba(0,0,0,0.05)" };

  return (
    <div ref={wrapRef} className="relative max-w-lg w-full">
      <form onSubmit={submit} className="flex items-center gap-2 w-full">
        <label htmlFor="hero-search" className="sr-only">Пошук пісень, виконавців або тексту</label>
        <div
          className="te-inset flex-1 flex items-center gap-2 px-3 py-3"
          style={{ borderRadius: "999px" }}
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
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
            placeholder="Пісня, виконавець або текст"
            className="flex-1 bg-transparent outline-none text-sm font-normal"
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
            className="px-5 py-3 text-xs font-medium tracking-widest"
          >
            ЗНАЙТИ
          </TeButton>
        </span>
      </form>

      {showDropdown && (
        <div
          ref={listRef}
          onScroll={onListScroll}
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
              <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
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
                    onFocus={() => setActiveIndex(idx)}
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
                      {a.photo_url && !lite ? (
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
            <SongResultGroup
              label="Пісні"
              songs={songs}
              startIndex={songsOffset}
              activeIndex={activeIndex}
              onActivate={setActiveIndex}
              onSelect={() => setOpen(false)}
              activeStyle={activeStyle}
              lite={lite}
            />
          )}
          {lyricsSongs.length > 0 && (
            <SongResultGroup
              label="У текстах пісень"
              songs={lyricsSongs}
              startIndex={lyricsOffset}
              activeIndex={activeIndex}
              onActivate={setActiveIndex}
              onSelect={() => setOpen(false)}
              activeStyle={activeStyle}
              lite={lite}
            />
          )}
          {loadingMore && (
            <div className="px-4 py-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>Завантаження…</div>
          )}
        </div>
      )}
    </div>
  );
}

interface SongResultGroupProps {
  label: string;
  songs: SongSuggestion[];
  startIndex: number;
  activeIndex: number;
  onActivate: (idx: number) => void;
  onSelect: () => void;
  activeStyle: React.CSSProperties;
  lite: boolean;
}

function SongResultGroup({ label, songs, startIndex, activeIndex, onActivate, onSelect, activeStyle, lite }: SongResultGroupProps) {
  return (
    <div className="py-1 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      {songs.map((s, i) => {
        const fallback = s.cover_color ?? stringToColor(s.artist);
        const idx = startIndex + i;
        const isActive = idx === activeIndex;
        return (
          <Link
            key={s.slug}
            href={`/songs/${s.slug}`}
            onClick={onSelect}
            onMouseEnter={() => onActivate(idx)}
            onFocus={() => onActivate(idx)}
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
              {s.cover_image && !lite ? (
                <Image src={s.cover_image} alt={s.title} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold" style={{ color: `${fallback}` }}>{s.artist.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{s.title}</div>
              <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.artist}</div>
            </div>
          </Link>
        );
      })}
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
