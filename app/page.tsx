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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pb-16">

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
            Грай більше,<br />шукай менше.
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
            <div className="flex overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 gap-3 scrollbar-none">
              {artists.map((artist) => {
                const initial = artist.name.charAt(0).toUpperCase();
                const hue = artist.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
                const placeholderBg = `hsl(${hue}, 40%, 68%)`;
                return (
                  <HapticLink
                    key={artist.slug}
                    href={`/artists/${artist.slug}`}
                    className="te-surface te-pressable flex-shrink-0 overflow-hidden"
                    style={{ width: 160, borderRadius: "1.25rem" }}
                  >
                    {/* Photo */}
                    <div style={{ width: 160, height: 160, position: "relative", overflow: "hidden" }}>
                      {artist.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artist.photo_url}
                          alt={artist.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: placeholderBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ fontSize: "3rem", fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>
                            {initial}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="px-3 py-2.5">
                      <p
                        className="truncate uppercase font-bold"
                        style={{ fontSize: "0.72rem", letterSpacing: "0.04em", color: "var(--text)" }}
                      >
                        {artist.name}
                      </p>
                      {artist.genre && (
                        <p
                          className="truncate uppercase"
                          style={{ fontSize: "0.6rem", letterSpacing: "0.06em", color: "var(--text-muted)", marginTop: 2 }}
                        >
                          {artist.genre}
                        </p>
                      )}
                    </div>
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
