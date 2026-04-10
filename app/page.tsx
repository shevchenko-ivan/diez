import { Navbar } from "@/shared/components/Navbar";
import { HapticLink } from "@/shared/components/HapticLink";
import { SongCard, HeroSearch } from "@/features/song/components/SongCard";
import { ArtistCard } from "@/features/artist/components/ArtistCard";

// ─── Mock data ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Останні переглянуті", href: "/songs?filter=recent", emoji: "🕐", color: "#6366f1" },
  { label: "Топ популярних", href: "/top", emoji: "🔥", color: "#FF4500" },
  { label: "Нові релізи", href: "/new", emoji: "✨", color: "#10b981" },
  { label: "Про кохання", href: "/songs?filter=love", emoji: "❤️", color: "#f43f5e" },
  { label: "Кемпінг", href: "/songs?filter=camping", emoji: "🏕️", color: "#B8956A" },
  { label: "Пісні із фільмів", href: "/songs?filter=movies", emoji: "🎬", color: "#8b5cf6" },
];

const ARTISTS = [
  { name: "Океан Ельзи", genre: "Рок", songsCount: 48, color: "#6366f1", image: "/artists/okean-elzy.jpg" },
  { name: "Скрябін", genre: "Поп-рок", songsCount: 35, color: "#FF4500", image: "/artists/skryabin.jpg" },
  { name: "Антитіла", genre: "Рок", songsCount: 29, color: "#10b981", image: "/artists/antytila.jpg" },
  { name: "ДахаБраха", genre: "Фольк", songsCount: 22, color: "#B8956A", image: "/artists/dakhabrakha.jpg" },
  { name: "Кому Вниз", genre: "Альтернатива", songsCount: 18, color: "#1A1F3A", image: "/artists/komu-vnyzu.png" },
  { name: "Один в каное", genre: "Інді", songsCount: 31, color: "#D63B2F", image: "/artists/odyn-v-kanoe.png" },
];

const SONGS = [
  { slug: "obiymy", title: "Обійми", artist: "Океан Ельзи", difficulty: "easy" as const, chords: ["Am", "F", "C", "G"], views: 12400, coverImage: "/songs/obiymy.png" },
  { slug: "strilyaly-ochi", title: "Стріляли очі", artist: "Скрябін", difficulty: "medium" as const, chords: ["Dm", "Am", "G"], views: 8900, coverImage: "/songs/strilyaly-ochi.png" },
  { slug: "misyats", title: "Місяць", artist: "Кому Вниз", difficulty: "hard" as const, chords: ["Em", "C", "G", "D"], views: 7200, coverImage: "/songs/misyats.png" },
  { slug: "vohon-i-voda", title: "Вогонь і вода", artist: "Антитіла", difficulty: "easy" as const, chords: ["G", "Em", "C", "D"], views: 15600, coverColor: "#FFDDE8" },
  { slug: "lileya", title: "Лілея", artist: "ДахаБраха", difficulty: "medium" as const, chords: ["Am", "G", "F", "E"], views: 5400, coverColor: "#E8D4B8" },
  { slug: "malo-meni", title: "Мало мені", artist: "Один в каное", difficulty: "easy" as const, chords: ["C", "G", "Am", "F"], views: 9800, coverColor: "#DDD0F8" },
];

const VIDEOS = [
  { title: "Океан Ельзи — Обійми (урок)", duration: "12:34", color: "#C4CAFF" },
  { title: "Скрябін — Мовчати (акорди)", duration: "8:12", color: "#FFD4C2" },
  { title: "ДахаБраха — Лілея", duration: "15:20", color: "#B8E8CE" },
  { title: "Антитіла — Воїни Світла", duration: "10:05", color: "#FFDDE8" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pb-16">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="text-center py-12">
          <h1
            className="font-bold mb-6"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              letterSpacing: "-0.03em",
              color: "var(--text)",
              lineHeight: 1.15,
              maxWidth: 560,
              margin: "0 auto 1.5rem",
              fontWeight: 700,
            }}
          >
            Український сервіс для пошуку акордів пісень
          </h1>
          <div className="flex justify-center">
            <HeroSearch />
          </div>
        </section>

        {/* ── Categories ─────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <HapticLink
                key={cat.label}
                href={cat.href}
                id={`cat-${cat.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="te-surface te-pressable flex flex-col p-4"
                style={{ borderRadius: "1.25rem", minHeight: 120 }}
              >
                {/* Emoji in a small knob-style circle */}
                <div
                  className="te-knob mb-auto"
                  style={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    flexShrink: 0,
                  }}
                >
                  {cat.emoji}
                </div>
                <p
                  className="font-medium uppercase mt-3 leading-tight"
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.06em",
                    color: "var(--text)",
                  }}
                >
                  {cat.label}
                </p>
              </HapticLink>
            ))}
          </div>
        </section>

        {/* ── Popular artists ─────────────────────────────────────────────── */}
        <section className="mb-12">
          <SectionHeader title="Популярні виконавці" href="/artists" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ARTISTS.map((a) => (
              <ArtistCard key={a.name} {...a} />
            ))}
          </div>
        </section>

        {/* ── Popular songs ────────────────────────────────────────────────── */}
        <section className="mb-12">
          <SectionHeader title="Популярні пісні" href="/songs" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SONGS.map((s, i) => (
              <SongCard key={s.title} {...s} index={i} />
            ))}
          </div>
        </section>

        {/* ── Recommended videos ───────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Рекомендовані відео" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {VIDEOS.map((v) => (
              <HapticLink
                key={v.title}
                href="#"
                className="te-surface te-pressable block"
                style={{ borderRadius: "1.25rem" }}
              >
                {/* Video thumbnail */}
                <div
                  className="w-full relative overflow-hidden"
                  style={{
                    borderRadius: "1.25rem 1.25rem 0 0",
                    aspectRatio: "16/9",
                    background: `linear-gradient(145deg, ${v.color}99, ${v.color}44)`,
                  }}
                >
                  {/* Play knob */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="te-knob"
                      style={{
                        width: 40,
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--orange)", marginLeft: 2 }}>
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    </div>
                  </div>
                  {/* Duration */}
                  <div
                    className="te-lcd absolute bottom-2 right-2 font-mono-te px-2 py-0.5"
                    style={{ fontSize: "0.6rem" }}
                  >
                    {v.duration}
                  </div>
                </div>
                <div className="p-3">
                  <p
                    className="font-bold text-xs leading-tight"
                    style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
                  >
                    {v.title}
                  </p>
                </div>
              </HapticLink>
            ))}
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
            <span className="font-mono-te ml-2" style={{ color: "var(--text-muted)", fontSize: "0.6rem" }}>© 2025</span>
          </div>
          <div className="flex items-center gap-2">
            {["Акорди", "Виконавці", "Реєстрація"].map((label, i) => (
              <Link
                key={label}
                href={i === 0 ? "/songs" : i === 1 ? "/artists" : "/auth/sign-up"}
                className="te-key px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </Link>
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
    <div className="flex items-center justify-between mb-4">
      <h2
        className="font-semibold"
        style={{ fontSize: "1.125rem", letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="te-key px-3 py-1.5 text-xs font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          Переглянути всі
        </Link>
      )}
    </div>
  );
}
