import { type Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

// Served from the ISR cache — one render per song per day at most, plus
// on-demand invalidation from every admin/submission action that touches a
// song (revalidatePath(`/songs/${slug}`)), so edits still show up at once.
//
// This route used to be `force-dynamic`: it read the User-Agent (phone-width
// lyric wrapping), `?v=`/`?t=`, the viewer's saved state and the admin flag on
// the server, so every visit — crawler or human — was a full render. Song
// pages were ~90 % of all function invocations after the rest of the site
// went static (measured 19.09.2026: ~730K requests / 30 days) and the reason
// the 17.09 Hobby fair-use block was still not survivable. All four now
// resolve on the client — see SongPageClient.tsx and SongViewer's
// pre-measure dual render.
export const revalidate = 86400;

// On-demand ISR only applies when generateStaticParams exists — a dynamic
// segment without it is rendered per request, `revalidate` or not (verified
// on /artists/[slug]). Empty on purpose: 2.6k songs are built on first visit,
// not on every deploy.
export function generateStaticParams(): { slug: string }[] {
  return [];
}
import Link from "next/link";
import { getSongBySlug, getSongSlugRedirect, getSongsByArtist, getSongsSharingChords } from "@/features/song/services/songs";
import { applyVariant } from "@/features/song/lib/variants";
import { chordPageFor, type ChordPage } from "@/features/song/data/chord-pages";
import {
  SongPageProvider,
  SongHeaderActions,
  MobileVariantRow,
  ActiveSongViewer,
} from "@/features/song/components/SongPageClient";
import { SongCard } from "@/features/song/components/SongCard";
import { BackButton } from "@/shared/components/BackButton";
import { Navbar } from "@/shared/components/Navbar";
import { ReportButton } from "@/features/song/components/ReportButton";
import { TeButton } from "@/shared/components/TeButton";
import { siteUrl, jsonLdScript } from "@/lib/utils";
import { getArtistSeoByName } from "@/features/artist/services/artists";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { Suspense, cache } from "react";
import { SavedToast } from "@/shared/components/SavedToast";

// ─── Request-scoped lookups ──────────────────────────────────────────────────
// `generateMetadata` and the page body need the same two rows, and both used to
// query for them separately — four round trips per request instead of two.
// React's `cache` dedupes them within a single render pass.
//
// This also pays for deleting `loading.tsx`. That file made Next wrap the route
// in an automatic Suspense boundary and flush its skeleton immediately, which
// committed HTTP 200 before the song lookup resolved — so `notFound()` below
// could swap the UI but never the status, and every unknown slug answered 200
// (a soft-404 across all ~2.4k song URLs). The status now waits for the lookup;
// halving the queries keeps that wait short.
const getSong = cache(getSongBySlug);
const getArtistSeo = cache(getArtistSeoByName);

// Zero-cost gate before any database round trip. Every real slug — and every
// legacy slug in slug_redirects — is lowercase [a-z0-9-] (slugify's charset;
// verified against the whole table, longest is 53 chars). Anything else is a
// scraper or a mangled link, and under ISR each unique one would otherwise
// cost two Supabase queries plus a cache entry to answer 404.
const isSlugShaped = (slug: string) => /^[a-z0-9-]{1,80}$/.test(slug);

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlugShaped(slug)) return {};
  const metaSong = await getSong(slug);
  if (!metaSong) return {};

  // Artist alternate spellings (e.g. "оторвальд" for "O.Torvald") so the song
  // page is indexable for Cyrillic queries of a Latin-named artist.
  const { aliases: artistAliases } = await getArtistSeo(metaSong.artist);
  const aliasKeywords = artistAliases.filter((a) => a && a !== metaSong.artist);

  const difficultyLabel =
    metaSong.difficulty === "easy" ? "легка" : metaSong.difficulty === "medium" ? "середня" : "складна";
  // «текст пісні»-queries carry ~40% of impressions (GSC) but converted at
  // half the CTR of «акорди» while the title led with chords — hence the order.
  const title = `${metaSong.title} — ${metaSong.artist}: текст пісні й акорди | Diez`;
  // Description is tuned to ~155 chars (Google desktop snippet cap). Leads
  // with the highest-intent keywords ("текст", "акорди"), then the searchable
  // long-tails ("грати на гітарі", "табулатура") so we cover more query
  // shapes without keyword stuffing.
  const chordList = metaSong.chords.slice(0, 6).join(", ");
  const capoNote = metaSong.capo ? `, капо ${metaSong.capo}` : "";
  const description =
    `Текст пісні й акорди «${metaSong.title}» — ${metaSong.artist}. ` +
    `Тональність ${metaSong.key}${capoNote}, ${difficultyLabel}. ` +
    `Акорди: ${chordList}. Грай на гітарі, укулеле або піаніно на Diez.`;

  return {
    title,
    description,
    keywords: [
      metaSong.title,
      metaSong.artist,
      ...aliasKeywords,
      `${metaSong.title} акорди`,
      `${metaSong.artist} акорди`,
      ...aliasKeywords.map((a) => `${metaSong.title} ${a}`),
      "текст пісні",
      "гітара",
      // Multi-instrument long-tails — every song is playable on guitar,
      // ukulele and piano via the in-page instrument toggle.
      `${metaSong.title} акорди для укулеле`,
      `${metaSong.title} акорди для піаніно`,
      "акорди для укулеле",
      "акорди для піаніно",
    ],
    alternates: { canonical: `/songs/${slug}` },
    openGraph: {
      title: `${metaSong.title} — ${metaSong.artist}`,
      description,
      type: "article",
      url: `/songs/${slug}`,
      // `images` is intentionally omitted — Next.js auto-resolves the
      // co-located `opengraph-image.tsx` (dynamic per-song card with title,
      // artist, key and chord row) when `openGraph.images` is unset. Setting
      // a raw cover URL here would override that and ship a generic square
      // album-art image, which is worse for chat previews.
    },
    twitter: {
      // Without an explicit `twitter` object, Twitter falls back to the
      // root-level `metadataBase` and misses both the per-song title and the
      // dynamic preview image. Mirror the openGraph values so X/Twitter and
      // any platform that prefers twitter:* tags also see the right card.
      card: "summary_large_image",
      title: `${metaSong.title} — ${metaSong.artist}`,
      description,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSlugShaped(slug)) notFound();

  // No `searchParams` here on purpose: reading them would opt the route out
  // of the cache. `?v=` / `?t=` are applied in the browser (SongPageClient).
  const baseSong = await getSong(slug);
  if (!baseSong) {
    // Migration 030 renamed timestamp slugs; keep the old URLs alive with a
    // 308 (bookmarks, GSC, external links). The query string is not carried
    // over — the page can't see it without going dynamic, and `?v=` on a
    // pre-rename URL is a bookmark shape we have never observed.
    const target = await getSongSlugRedirect(slug);
    if (target) permanentRedirect(`/songs/${target}`);
    return notFound();
  }

  // Artist slug + alternate spellings need the song row, so this runs after.
  // artistSlug is null when the artist has no (approved) DB row: guessing with
  // slugify(name) mass-produced internal links to nonexistent /artists/* URLs
  // (slugify ≠ stored slug), which crawled as soft-404s. Better no link at all.
  const artistSeo = await getArtistSeo(baseSong.artist);
  const artistSlug = artistSeo.slug ?? null;
  const artistAliases = artistSeo.aliases.filter((a) => a && a !== baseSong.artist);

  // The cached HTML always carries the primary variant — it is what every
  // crawler and the vast majority of visitors want. A `?v=`, or the variant a
  // signed-in user saved, is applied on the client (SongPageProvider).
  const song = applyVariant(baseSong, undefined);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: song.title,
    composer: {
      "@type": "MusicGroup",
      name: song.artist,
      ...(artistAliases.length > 0 && { alternateName: artistAliases }),
      ...(artistSlug && { url: `${siteUrl}/artists/${artistSlug}` }),
    },
    musicalKey: song.key,
    genre: song.genre,
    url: `${siteUrl}/songs/${song.slug}`,
    ...(song.album && {
      inAlbum: { "@type": "MusicAlbum", name: song.album },
    }),
    ...(song.coverImage && { image: song.coverImage }),
  };

  // Breadcrumbs help Google render "Diez › Пісні › Artist › Title" in SERPs,
  // which significantly boosts CTR on long-tail song-name queries.
  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Diez", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Пісні", item: `${siteUrl}/songs` },
      ...(artistSlug
        ? [{ "@type": "ListItem", position: 3, name: song.artist, item: `${siteUrl}/artists/${artistSlug}` }]
        : []),
      { "@type": "ListItem", position: artistSlug ? 4 : 3, name: song.title, item: `${siteUrl}/songs/${song.slug}` },
    ],
  };

  // ──────────────────────────────────────────────────────────────
  // FAQPage schema — Google may render the questions directly under
  // the SERP result (the "People also ask"-style accordion). On
  // long-tail queries like «акорди обійми океан ельзи» this can boost
  // CTR by 15-30%. Pure JSON-LD, invisible to humans on the page.
  // Answers are derived from real song data so they're substantive.
  // ──────────────────────────────────────────────────────────────
  const uniqueChords = Array.from(new Set(song.chords ?? [])).slice(0, 8);
  const hasBarre = (song.chords ?? []).some((c) =>
    /^([A-G][#b]?m?)/.test(c) && ["F", "B", "Bb", "F#", "C#", "G#", "D#", "Bm", "F#m", "C#m"].includes(c.replace(/^([A-G][#b]?m?).*$/, "$1")),
  );
  const faqItems: { q: string; a: string }[] = [
    {
      q: `Яка тональність пісні «${song.title}»?`,
      a: song.key
        ? `Оригінальна тональність — ${song.key}. На Diez ви можете транспонувати акорди на пів-тону вгору або вниз, щоб підлаштувати під свій голос.`
        : `Тональність вказана над акордами на сторінці пісні. На Diez ви можете транспонувати акорди на будь-яку кількість пів-тонів.`,
    },
    {
      q: `Які акорди потрібні для гри «${song.title}»?`,
      a: uniqueChords.length > 0
        ? `Для пісні потрібні акорди: ${uniqueChords.join(", ")}. Усі акорди розставлені прямо над відповідними словами в тексті.`
        : `Список акордів і їхнє розташування над текстом ви знайдете на сторінці пісні.`,
    },
    {
      q: `Чи потрібно грати баре в пісні «${song.title}»?`,
      a: hasBarre
        ? `Так, у пісні є акорди, які зазвичай грають із баре (наприклад, F або B). Якщо вам важко з баре — спробуйте функцію капо або транспонуйте тональність на сторінці пісні.`
        : `Ні, пісня грається на відкритих акордах без баре — підходить для початківців.`,
    },
    ...(song.capo
      ? [{
          q: `На якому ладі ставити капо для «${song.title}»?`,
          a: `Рекомендоване положення капо — ${song.capo} лад. Це дозволяє грати простіші відкриті акорди в потрібній тональності.`,
        }]
      : []),
    {
      q: `Де знайти текст пісні «${song.title}»?`,
      a: `Повний текст пісні «${song.title}» виконавця ${song.artist} з акордами, розставленими прямо над словами, доступний на сторінці пісні на Diez.`,
    },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  // VideoObject schema for songs with a YouTube player. Google indexes these
  // separately in Video Search and may render a video thumbnail next to the
  // SERP result. Skipped when there's no embed (no value to claim a video).
  //
  // `uploadDate` must be a full ISO 8601 datetime WITH timezone — date-only
  // strings ("2026-05-18") trigger GSC's "Недійсне значення дати/часу" and
  // "Відсутній часовий пояс" warnings. We use the song row's createdAt (the
  // moment this catalog entry — and therefore this video association —
  // first existed on Diez), normalised to a full ISO timestamp.
  // `new Date(...).toISOString()` always emits the UTC `Z` suffix, which
  // satisfies the timezone requirement.
  const uploadIso = (() => {
    const raw = song.createdAt;
    if (!raw) return new Date().toISOString();
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  })();
  const videoLd = song.youtubeId
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `${song.title} — ${song.artist}`,
        description: `Музичний кліп пісні «${song.title}» виконавця ${song.artist}.`,
        thumbnailUrl: [
          `https://i.ytimg.com/vi/${song.youtubeId}/hqdefault.jpg`,
          `https://i.ytimg.com/vi/${song.youtubeId}/maxresdefault.jpg`,
        ],
        // `contentUrl` points to our canonical song page (the actual video
        // host is YouTube, but Google still wants a watch URL on our side
        // for the rich result); `embedUrl` is the iframe target.
        contentUrl: `${siteUrl}/songs/${song.slug}`,
        embedUrl: `https://www.youtube.com/embed/${song.youtubeId}`,
        uploadDate: uploadIso,
      }
    : null;

  return (
    <div className="min-h-screen min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <Suspense><SavedToast /></Suspense>
      {/* JSON-LD is rendered inline (not via next/script afterInteractive)
          so it lands in the initial SSR HTML — Googlebot's render budget is
          unpredictable and we don't want structured data to depend on it. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsLd) }}
      />
      {videoLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLdScript(videoLd) }}
        />
      )}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }}
      />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-8 pt-1 pb-20">
       <SongPageProvider baseSong={baseSong}>

        {/* ── Header (single row, centered title, no surface) ─────────── */}
        <div className="mb-4 grid items-center" style={{ padding: "0.4rem 0", gridTemplateColumns: "1fr auto 1fr" }}>
          {/* Left: Back */}
          <BackButton fallback="/songs" />

          {/* Center: Title + meta — stacks on mobile, inline on md+ */}
          {/* items-baseline on md+: artist (e-Ukraine) and title (e-Ukraine Head)
              have different vertical metrics, so items-center misaligns them. */}
          <div className="flex flex-col md:flex-row items-center md:items-baseline justify-center md:gap-2 px-2 md:px-4 min-w-0">
            {artistSlug ? (
              <Link
                href={`/artists/${artistSlug}`}
                className="hover:underline truncate max-w-full"
                style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.45 }}
              >
                {song.artist}
              </Link>
            ) : (
              <span
                className="truncate max-w-full"
                style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.45 }}
              >
                {song.artist}
              </span>
            )}
            <h1
              className="truncate"
              style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 700, color: "var(--text)", lineHeight: 1.45 }}
            >
              {song.title}
            </h1>
          </div>

          {/* Right: Actions — variant switcher, admin edit, focus, tabs,
              save + share. Client-side: they follow the active variant and
              the viewer's saved state, which the cached page can't know. */}
          <SongHeaderActions />
        </div>

        {/* Mobile-only variant switcher row (avoids overlap with stacked title) */}
        <MobileVariantRow />

        {/* ── Song Viewer (Chords, Lyrics, Controls) ── */}
        <ActiveSongViewer />

        {/* Instrument caption — honest (every song is playable on all three
            instruments via the toggle inside SongViewer) and a real on-page
            signal for "«пісня» акорди для укулеле / піаніно" long-tails. The
            links funnel crawl + equity to the instrument hubs. */}
        <p className="mt-6 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Це повний текст пісні «{song.title}» — {song.artist} з акордами для гітари. Її також
          можна грати на{" "}
          <Link href="/songs/instrument/ukulele" className="hover:underline" style={{ color: "var(--text-mid)" }}>
            укулеле
          </Link>{" "}
          або{" "}
          <Link href="/songs/instrument/piano" className="hover:underline" style={{ color: "var(--text-mid)" }}>
            піаніно
          </Link>{" "}
          — перемкніть інструмент над акордами й транспонуйте тональність у будь-яку зручну.
        </p>

        {/* Chord dictionary links — one line, all viewports. Feeds crawl +
            equity from every song page into /chords/<slug> landings (the
            dictionary pages link songs back, closing the loop). Exact-quality
            matches only: Am7 has no page and silently drops out. */}
        <ChordDictionaryLinks chords={song.chords} />

        {/* Report mechanism (Apple App Review 1.2 — UGC) */}
        <div className="mt-3">
          <ReportButton slug={slug} />
        </div>


        {/* ── Other songs by this artist (deferred — below the fold) ──── */}
        <Suspense>
          <RelatedSongs artist={song.artist} excludeSlug={slug} artistSlug={artistSlug} />
        </Suspense>

        {/* ── Songs that share at least 3 chords with this one ─────────
            Internal linking by harmonic similarity — helps users find
            their next song based on what they already know how to play,
            and feeds Google a strong "topically related" graph between
            song pages (boosts crawl + ranking). */}
        <Suspense>
          <SongsWithSameChords chords={song.chords ?? []} excludeSlug={slug} />
        </Suspense>

       </SongPageProvider>
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── Streamed sections ───────────────────────────────────────────────────────

// Inline chord-dictionary strip under the lyrics: the song's chords that
// have a /chords/<slug> landing page, deduped (flat spellings collapse into
// their sharp-canonical page).
function ChordDictionaryLinks({ chords }: { chords: string[] | null }) {
  const pages = Array.from(new Set(chords ?? []))
    .map(chordPageFor)
    .filter((p): p is ChordPage => !!p)
    .filter((p, i, arr) => arr.findIndex((x) => x.slug === p.slug) === i)
    .slice(0, 10);
  if (pages.length === 0) return null;
  return (
    <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
      Як затискати акорди з пісні:{" "}
      {pages.map((p, i) => (
        <span key={p.slug}>
          {i > 0 && ", "}
          <Link
            href={`/chords/${p.slug}`}
            className="hover:underline"
            style={{ color: "var(--text-mid)" }}
            title={`Акорд ${p.name} (${p.ukr}) — аплікатура`}
          >
            {p.name}
          </Link>
        </span>
      ))}
      .
    </p>
  );
}

async function RelatedSongs({
  artist,
  excludeSlug,
  artistSlug,
}: {
  artist: string;
  excludeSlug: string;
  artistSlug: string | null;
}) {
  const otherSongs = await getSongsByArtist(artist, { excludeSlug, limit: 4 });
  if (otherSongs.length === 0) return null;
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="uppercase tracking-wider"
          style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.12em" }}
        >
          Ще від {artist}
        </h2>
        {artistSlug && (
          <TeButton
            shape="pill"
            href={`/artists/${artistSlug}`}
            className="px-3 py-1.5"
            style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}
          >
            Всі пісні →
          </TeButton>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {otherSongs.map(({ key: _k, ...s }) => (
          <SongCard key={s.slug} {...s} hideSave />
        ))}
      </div>
    </div>
  );
}

/**
 * "Songs you can play with the same chords" — picks 4 songs that share
 * the most chords with the current one. Renders nothing if there aren't
 * at least 4 viable matches (avoid showing a weak relation).
 *
 * Same visual shape as <RelatedSongs /> (4 SongCard tiles) — so it
 * blends into the existing page rhythm and doesn't introduce a new
 * pattern.
 */
async function SongsWithSameChords({
  chords,
  excludeSlug,
}: {
  chords: string[];
  excludeSlug: string;
}) {
  const songs = await getSongsSharingChords(chords, { excludeSlug, limit: 4 });
  if (songs.length < 4) return null;
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="uppercase tracking-wider"
          style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.12em" }}
        >
          Грається тими ж акордами
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {songs.map(({ key: _k, ...s }) => (
          <SongCard key={s.slug} {...s} hideSave />
        ))}
      </div>
    </div>
  );
}

