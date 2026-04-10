import { Navbar } from "@/shared/components/Navbar";
import { HapticLink } from "@/shared/components/HapticLink";
import { SongCard, HeroSearch } from "@/features/song/components/SongCard";
import { Link } from "lucide-react";

// ─── Mock data ────────────────────────────────────────────────────────────────

const QUICK_FILTERS = [
  { label: "Для новачків", href: "/songs?difficulty=easy", emoji: "🌱", color: "#10b981" },
  { label: "Без баре", href: "/songs?tags=no-barre", emoji: "🎸", color: "#6366f1" },
  { label: "Поп-рок", href: "/songs?genre=pop-rock", emoji: "⚡", color: "#FF4500" },
  { label: "Інді", href: "/songs?genre=indie", emoji: "🌾", color: "#B8956A" },
  { label: "Топ сьогодні", href: "/songs?sort=popular", emoji: "🔥", color: "#f43f5e" },
  { label: "Нові підбори", href: "/songs?sort=new", emoji: "✨", color: "#8b5cf6" },
];

const DAILY_PICK = { slug: "misyats", title: "Місяць", artist: "Кому Вниз", difficulty: "hard" as const, chords: ["Em", "C", "G", "D"], views: 7200, coverImage: "/songs/misyats.png" };

const TRENDING_SONGS = [
  { slug: "obiymy", title: "Обійми", artist: "Океан Ельзи", difficulty: "easy" as const, chords: ["Am", "F", "C", "G"], views: 12400, coverImage: "/songs/obiymy.png" },
  { slug: "strilyaly-ochi", title: "Стріляли очі", artist: "Скрябін", difficulty: "medium" as const, chords: ["Dm", "Am", "G"], views: 8900, coverImage: "/songs/strilyaly-ochi.png" },
  { slug: "lileya", title: "Лілея", artist: "ДахаБраха", difficulty: "medium" as const, chords: ["Am", "G", "F", "E"], views: 5400, coverColor: "#E8D4B8" },
  { slug: "vohon-i-voda", title: "Вогонь і вода", artist: "Антитіла", difficulty: "easy" as const, chords: ["G", "Em", "C", "D"], views: 15600, coverColor: "#FFDDE8" },
];

const FRESH_SONGS = [
  { slug: "malo-meni", title: "Мало мені", artist: "Один в каное", difficulty: "easy" as const, chords: ["C", "G", "Am", "F"], views: 9800, coverColor: "#DDD0F8" },
  { slug: "stari-fotohrafiyi", title: "Старі фотографії", artist: "Скрябін", difficulty: "easy" as const, chords: ["Am", "C", "G", "F"], views: 2300, coverColor: "#C8D5E8" },
  { slug: "tam-de-nas-nema", title: "Там де нас нема", artist: "Океан Ельзи", difficulty: "medium" as const, chords: ["Dm", "Bb", "F", "C"], views: 1100, coverColor: "#FFDDE8" },
  { slug: "tdme", title: "TDME", artist: "Антитіла", difficulty: "hard" as const, chords: ["Em", "C", "G", "D"], views: 850, coverColor: "#E8D4B8" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pb-16">

        {/* ── 1. Hero Section (Search-First) ─────────────────────────────── */}
        <section className="text-center py-16 md:py-24">
          <h1
            className="font-bold mb-4"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.03em",
              color: "var(--text)",
              lineHeight: 1.1,
              maxWidth: 640,
              margin: "0 auto",
              fontWeight: 800,
            }}
          >
            Акорди для душі. Зіграйте свою першу пісню вже зараз.
          </h1>
          <p
            className="font-medium mb-10 mx-auto"
            style={{
              fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
              color: "var(--text-muted)",
              maxWidth: 580,
              lineHeight: 1.4,
              letterSpacing: "-0.01em"
            }}
          >
            Зручний пошук, точні тексти без зайвого сміття. Створено музикантами для музикантів.
          </p>
          <div className="flex justify-center mb-6">
            <HeroSearch />
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider mr-2 my-auto" style={{ color: "var(--text-muted)", opacity: 0.7 }}>Часті пошуки:</span>
            {["Океан Ельзи", "Бумбокс", "Shallow", "Інді"].map(tag => (
              <HapticLink key={tag} href={`/songs?q=${tag}`} className="te-key px-3 py-1 rounded-full text-xs font-semibold" style={{ color: "var(--text)" }}>
                {tag}
              </HapticLink>
            ))}
          </div>
        </section>

        {/* ── 2. Quick Entry: Categories & Filters ────────────────────────── */}
        <section className="mb-16">
          <SectionHeader title="З чого почнемо?" />
          {/* Horizontal scroll on mobile */}
          <div className="flex overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3 hide-scrollbar">
            {QUICK_FILTERS.map((cat) => (
              <HapticLink
                key={cat.label}
                href={cat.href}
                id={`cat-${cat.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="te-surface te-pressable flex flex-col p-4 shrink-0 w-36 sm:w-auto"
                style={{ borderRadius: "1.25rem", minHeight: 110 }}
              >
                <div
                  className="te-knob mb-auto"
                  style={{
                    width: 36, height: 36,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem", flexShrink: 0,
                  }}
                >
                  {cat.emoji}
                </div>
                <p
                  className="font-bold mt-3 leading-tight"
                  style={{ fontSize: "0.75rem", letterSpacing: "0.02em", color: "var(--text)" }}
                >
                  {cat.label}
                </p>
              </HapticLink>
            ))}
          </div>
        </section>
        
        {/* ── 3. Daily Pick ────────────────────────────────────────────────── */}
        <section className="mb-16">
          <SectionHeader title="Пісня дня" />
          <HapticLink href={`/songs/${DAILY_PICK.slug}`} className="block te-surface p-1 relative overflow-hidden group" style={{ borderRadius: "1.5rem" }}>
             <div className="flex flex-col sm:flex-row gap-6 p-4 md:p-6 items-center">
                <div className="w-full sm:w-48 aspect-square relative te-inset rounded-2xl overflow-hidden shrink-0">
                  <img src={DAILY_PICK.coverImage} alt={DAILY_PICK.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="te-knob w-12 h-12 flex items-center justify-center text-white">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1 w-full relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-[#FF453A] bg-[#FF453A]/10">Профі</span>
                    <span className="text-xs font-mono font-bold" style={{ color: "var(--text-muted)" }}>{DAILY_PICK.views} переглядів</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{DAILY_PICK.title}</h3>
                  <p className="text-lg font-medium mb-4" style={{ color: "var(--text-muted)" }}>{DAILY_PICK.artist}</p>
                  <div className="flex gap-2">
                    {DAILY_PICK.chords.map(c => (
                      <span key={c} className="te-lcd font-mono-te px-2 py-1 text-sm">{c}</span>
                    ))}
                  </div>
                </div>
             </div>
          </HapticLink>
        </section>

        {/* ── 4. Trending Songs ────────────────────────────────────────────── */}
        <section className="mb-16">
          <SectionHeader title="Зараз грають найчастіше" href="/songs?sort=popular" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRENDING_SONGS.map((s, i) => (
              <SongCard key={s.title} {...s} index={i} />
            ))}
          </div>
        </section>
        
        {/* ── 5. Fresh Arrivals ────────────────────────────────────────────── */}
        <section className="mb-16">
          <SectionHeader title="Щойно на струнах" href="/songs?sort=new" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FRESH_SONGS.map((s, i) => (
              <SongCard key={s.title} {...s} index={i} />
            ))}
          </div>
        </section>

        {/* ── 6. Community CTA & Social Proof ──────────────────────────────── */}
        <section className="mb-8">
          <div className="te-surface p-8 md:p-12 text-center relative overflow-hidden" style={{ borderRadius: "1.5rem" }}>
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#f43f5e] rounded-full blur-[100px] opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6366f1] rounded-full blur-[100px] opacity-10 pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
                Створюймо українську базу акордів разом.
              </h2>
              <p className="text-lg font-medium mb-8" style={{ color: "var(--text-muted)" }}>
                У нас вже понад <strong>12,450</strong> пісень та <strong>5,000</strong> активних гітаристів. 
                Не знайшли свою улюблену пісню? Додайте її у два кліки та допоможіть спільноті.
              </p>
              <HapticLink href="/add" className="te-btn-orange inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[13px] font-bold tracking-widest uppercase">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Додати пісню
              </HapticLink>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="px-6 pb-8">
        <div
          className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 te-surface"
          style={{ borderRadius: "1.25rem" }}
        >
          <div className="flex items-center gap-1">
            <span style={{ color: "var(--orange)", fontWeight: 900, fontSize: "1rem", letterSpacing: "-0.04em" }}>#</span>
            <span style={{ color: "var(--text)", fontWeight: 900, fontSize: "1rem", letterSpacing: "-0.04em" }}>DIEZ</span>
            <span className="font-mono-te ml-2" style={{ color: "var(--text-muted)", fontSize: "0.6rem" }}>© 2026</span>
          </div>
          <div className="flex items-center gap-2">
            {["Акорди", "Виконавці", "Реєстрація"].map((label, i) => (
              <HapticLink
                key={label}
                href={i === 0 ? "/songs" : i === 1 ? "/artists" : "/auth/sign-up"}
                className="te-key px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </HapticLink>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2
        className="font-bold flex items-center gap-2"
        style={{ fontSize: "1.25rem", letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        {title}
      </h2>
      {href && (
        <HapticLink
          href={href}
          className="text-xs font-bold uppercase tracking-widest hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          Дивитись всі <span style={{ opacity: 0.5 }}>→</span>
        </HapticLink>
      )}
    </div>
  );
}
