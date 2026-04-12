import { type Metadata } from "next";
import { Navbar } from "@/shared/components/Navbar";
import { HapticLink } from "@/shared/components/HapticLink";
import { SongCard, HeroSearch } from "@/features/song/components/SongCard";
import { getAllSongs, getFreshSongs } from "@/features/song/services/songs";
import { getArtists } from "@/features/artist/services/artists";
import { SiteFooter } from "@/shared/components/SiteFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [trendingSongs, freshSongs, artists] = await Promise.all([
    getAllSongs(),
    getFreshSongs(4),
    getArtists(12),
  ]);

  const trending = trendingSongs.slice(0, 4);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pb-16">

        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
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
              letterSpacing: "-0.01em",
            }}
          >
            Зручний пошук, точні тексти без зайвого сміття. Створено музикантами для музикантів.
          </p>
          <div className="flex justify-center mb-6">
            <HeroSearch />
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider mr-2 my-auto" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
              Часті пошуки:
            </span>
            {["Океан Ельзи", "Бумбокс", "Shallow", "Інді"].map((tag) => (
              <HapticLink
                key={tag}
                href={`/songs?q=${tag}`}
                className="te-key px-3 py-1 rounded-full text-xs font-semibold"
                style={{ color: "var(--text)" }}
              >
                {tag}
              </HapticLink>
            ))}
          </div>
        </section>

        {/* ── 2. Популярні пісні ───────────────────────────────────────────── */}
        {trending.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Зараз грають найчастіше" href="/songs?sort=popular" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {trending.map((s, i) => (
                <SongCard
                  key={s.slug}
                  slug={s.slug}
                  title={s.title}
                  artist={s.artist}
                  difficulty={s.difficulty}
                  chords={s.chords}
                  views={s.views}
                  coverImage={s.coverImage}
                  coverColor={s.coverColor}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 3. Виконавці ─────────────────────────────────────────────────── */}
        {artists.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Виконавці" href="/artists" />
            <div className="flex overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 gap-4 scrollbar-none">
              {artists.map((artist) => {
                const initial = artist.name.charAt(0).toUpperCase();
                const hue = artist.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
                const placeholderBg = `hsl(${hue}, 45%, 72%)`;
                return (
                  <HapticLink
                    key={artist.slug}
                    href={`/artists/${artist.slug}`}
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                    style={{ width: 80 }}
                  >
                    <div
                      className="te-surface overflow-hidden flex-shrink-0"
                      style={{ width: 72, height: 72, borderRadius: "50%" }}
                    >
                      {artist.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artist.photo_url}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: placeholderBg }}
                        >
                          <span
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: 800,
                              color: "rgba(255,255,255,0.9)",
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {initial}
                          </span>
                        </div>
                      )}
                    </div>
                    <p
                      className="text-center leading-tight w-full truncate"
                      style={{ fontSize: "0.68rem", fontWeight: 500, color: "var(--text-mid)" }}
                    >
                      {artist.name}
                    </p>
                  </HapticLink>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 4. Останні додані ────────────────────────────────────────────── */}
        {freshSongs.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Щойно на струнах" href="/songs?sort=new" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {freshSongs.map((s, i) => (
                <SongCard
                  key={s.slug}
                  slug={s.slug}
                  title={s.title}
                  artist={s.artist}
                  difficulty={s.difficulty}
                  chords={s.chords}
                  views={s.views}
                  coverImage={s.coverImage}
                  coverColor={s.coverColor}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 5. CTA ───────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div
            className="te-surface p-8 md:p-12 text-center relative overflow-hidden"
            style={{ borderRadius: "1.5rem" }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#f43f5e] rounded-full blur-[100px] opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6366f1] rounded-full blur-[100px] opacity-10 pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: "var(--text)", letterSpacing: "-0.03em" }}
              >
                Створюймо українську базу акордів разом.
              </h2>
              <p className="text-lg font-medium mb-8" style={{ color: "var(--text-muted)" }}>
                Не знайшли свою улюблену пісню? Допоможіть спільноті — підберіть акорди та поділіться з іншими гітаристами.
              </p>
              <HapticLink
                href="/add"
                className="te-btn-orange inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[13px] font-bold tracking-widest uppercase"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Додати пісню
              </HapticLink>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2
        className="font-bold"
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
