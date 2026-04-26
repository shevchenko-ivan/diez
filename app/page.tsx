import { type Metadata } from "next";
import { Navbar } from "@/shared/components/Navbar";
import { HapticLink } from "@/shared/components/HapticLink";
import { SongCard, HeroSearch } from "@/features/song/components/SongCard";
import { getSongsPage, getFreshSongs } from "@/features/song/services/songs";
import { TOPICS } from "@/features/song/data/topics";
import { getArtists } from "@/features/artist/services/artists";
import { ArtistStrip } from "@/features/artist/components/ArtistStrip";
import { getSavedSlugs, getMyPlaylists } from "@/features/playlist/actions/playlists";
import { PlaylistCard } from "@/features/playlist/components/PlaylistCard";
import { SiteFooter } from "@/shared/components/SiteFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Diez — Акорди для гітари",
  description:
    "Зручний пошук акордів для тисяч пісень. Українські та зарубіжні виконавці. Створено музикантами для музикантів.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Diez — Акорди для гітари",
    description:
      "Зручний пошук акордів для тисяч пісень. Українські та зарубіжні виконавці.",
    type: "website",
    url: "/",
  },
};

export default async function HomePage() {
  const [trendingPage, freshSongs, artists, savedSlugs, myPlaylists] = await Promise.all([
    getSongsPage({ sortBy: "source_views", limit: 4 }),
    getFreshSongs(4),
    getArtists(12),
    getSavedSlugs(),
    getMyPlaylists(),
  ]);

  const trending = trendingPage.songs;

  return (
    <div className="min-h-screen min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl mx-auto w-full px-6 pb-16">

        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <section className="text-center py-8 md:py-12">
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
            className="font-medium mb-6 mx-auto"
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
          <div className="flex justify-center mb-4">
            <HeroSearch />
          </div>
        </section>

        {/* ── 2. Популярні пісні ───────────────────────────────────────────── */}
        {trending.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Топ популярних" href="/songs?sort=popular" />
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
                  isSaved={savedSlugs.has(s.slug)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 3. Виконавці (infinite-scroll horizontal strip) ─────────────── */}
        {artists.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Виконавці" href="/artists" />
            <ArtistStrip initial={artists} initialExhausted={artists.length < 12} />
          </section>
        )}

        {/* ── 4. Тематики ────────────────────────────────────────────────── */}
        <section className="mb-16">
          <SectionHeader title="Підбірки за тематикою" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TOPICS.map((t) => (
              <HapticLink
                key={t.slug}
                href={`/songs?topic=${t.slug}`}
                className="te-surface te-pressable p-5 flex flex-col justify-between"
                style={{ borderRadius: "1.25rem", minHeight: 100 }}
              >
                <span style={{ fontSize: "1.5rem" }}>{t.emoji}</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
                    {t.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {t.subtitle}
                  </p>
                </div>
              </HapticLink>
            ))}
          </div>
        </section>

        {/* ── 5. Останні додані ────────────────────────────────────────────── */}
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
                  isSaved={savedSlugs.has(s.slug)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 6. Мої списки ────────────────────────────────────────────────── */}
        {myPlaylists.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Мої списки" href="/profile/lists" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {myPlaylists.slice(0, 4).map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
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
