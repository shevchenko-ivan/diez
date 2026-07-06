import { type Metadata } from "next";
import { Navbar } from "@/shared/components/Navbar";
import { HapticLink } from "@/shared/components/HapticLink";
import { HeroSearch } from "@/features/song/components/SongCard";
import { SongStrip } from "@/features/song/components/SongStrip";
import { loadMoreTrending, loadMoreFresh } from "@/features/song/actions/strip";
import { getSongsPage, getFreshSongs } from "@/features/song/services/songs";
import { TOPICS } from "@/features/song/data/topics";
import { getArtists } from "@/features/artist/services/artists";
import { ArtistStrip } from "@/features/artist/components/ArtistStrip";
import { getSavedSlugs, getMyPlaylists } from "@/features/playlist/actions/playlists";
import { PlaylistCard } from "@/features/playlist/components/PlaylistCard";
import { MySongCard } from "@/features/song/components/MySongCard";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Diez — Акорди для гітари",
  description:
    "Зручний пошук акордів для тисяч пісень — гітара, укулеле, піаніно. Українські та зарубіжні виконавці. Створено музикантами для музикантів.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Diez — Акорди для гітари",
    description:
      "Зручний пошук акордів для тисяч пісень — гітара, укулеле, піаніно. Українські та зарубіжні виконавці.",
    type: "website",
    url: "/",
  },
};

export default async function HomePage() {
  const [trendingPage, freshSongs, artists, savedSlugs, myPlaylists] = await Promise.all([
    getSongsPage({ sortBy: "source_views", limit: 12 }),
    getFreshSongs(12),
    getArtists(12),
    getSavedSlugs(),
    getMyPlaylists(),
  ]);

  const trending = trendingPage.songs;

  // Songs the signed-in user submitted — shown with their publication status so
  // authors can track them right from the home page. Empty (and the section
  // hidden) for guests or users who haven't added anything.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let mySongs: Record<string, unknown>[] = [];
  if (user) {
    const { data } = await supabase
      .from("songs")
      .select("id, slug, title, artist, status, cover_image, cover_color")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    mySongs = (data ?? []) as Record<string, unknown>[];
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl mx-auto w-full px-6">

        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <section className="text-center py-6 md:py-10">
          <h1
            className="font-bold mb-4"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.03em",
              color: "var(--text)",
              lineHeight: 1.1,
              maxWidth: 640,
              // bottom value is what actually spaces the subtitle — the inline
              // `margin` overrides the `mb-4` class, which is why it read as 0.
              margin: "0 auto 1.5rem",
              fontWeight: 800,
              // text-wrap: balance — браузер сам ділить два рядки рівно
              // замість hardcoded <br />. Baseline since 2025-09; старі
              // браузери просто роблять standard wrap (graceful no-op).
              textWrap: "balance",
            }}
          >
            Грай більше, шукай менше.
          </h1>
          <p
            className="font-normal mb-6 mx-auto"
            style={{
              fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
              color: "var(--text-muted)",
              maxWidth: 580,
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
            }}
          >
            Зручний пошук, точні тексти без зайвого сміття.
          </p>
          <div className="flex justify-center mb-4">
            <HeroSearch />
          </div>
        </section>

        {/* ── 2. Популярні пісні ───────────────────────────────────────────── */}
        {trending.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Топ популярних" href="/songs?sort=popular" />
            <SongStrip
              variant="featured"
              initial={trending}
              savedSlugs={Array.from(savedSlugs)}
              loadMore={loadMoreTrending}
              initialExhausted={trending.length < 12}
            />
          </section>
        )}

        {/* ── 3. Виконавці (infinite-scroll horizontal strip) ─────────────── */}
        {artists.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Виконавці" href="/artists" />
            <ArtistStrip initial={artists} initialExhausted={artists.length < 12} />
          </section>
        )}

        {/* ── 3.5 Додані пісні (author's submissions + status) ────────────── */}
        {mySongs.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Додані пісні" href="/profile" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 sm:gap-3">
              {mySongs.slice(0, 4).map((song) => (
                <MySongCard
                  key={song.id as string}
                  id={song.id as string}
                  slug={song.slug as string}
                  title={song.title as string}
                  artist={song.artist as string}
                  status={song.status as string}
                  coverImage={(song.cover_image as string) ?? undefined}
                  coverColor={(song.cover_color as string) ?? undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 4. Тематики ────────────────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader title="Підбірки за тематикою" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TOPICS.map((t) => (
              <HapticLink
                key={t.slug}
                href={`/songs/topic/${t.slug}`}
                className="te-surface te-pressable p-5 flex flex-col justify-between"
                style={{ borderRadius: "1.25rem", minHeight: 100 }}
              >
                <span style={{ fontSize: "1.5rem" }}>{t.emoji}</span>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
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
          <section className="mb-10">
            <SectionHeader title="Щойно на струнах" href="/songs?sort=new" />
            <SongStrip
              variant="featured"
              initial={freshSongs}
              savedSlugs={Array.from(savedSlugs)}
              loadMore={loadMoreFresh}
              initialExhausted={freshSongs.length < 12}
            />
          </section>
        )}

        {/* ── 6. Мої списки ────────────────────────────────────────────────── */}
        {myPlaylists.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Мої списки" href="/profile/lists" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 sm:gap-3">
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
        style={{ fontSize: "1.0625rem", letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        {title}
      </h2>
      {href && (
        <HapticLink
          href={href}
          className="text-[11px] font-medium uppercase tracking-wide hover:underline shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          Дивитись всі <span style={{ opacity: 0.5 }}>→</span>
        </HapticLink>
      )}
    </div>
  );
}
