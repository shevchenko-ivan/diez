import { type Metadata } from "next";
import { notFound } from "next/navigation";

// Song pages are admin-editable — force fresh fetch on every request so
// edits to tempo/strumming/variants appear immediately without fighting
// Next.js's route-level and fetch-level caches.
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSongBySlug, getSongsByArtist, getSongsSharingChords, applyVariant } from "@/features/song/services/songs";
import { getSongSaveStateForSlug } from "@/features/playlist/actions/playlists";
import { SongActions } from "@/features/song/components/SongActions";
import { FocusModeToggle } from "@/features/song/components/FocusModeToggle";
import { TabsToggleButton } from "@/features/song/components/TabsToggleButton";
import { SongViewer } from "@/features/song/components/SongViewer";
import { SongCard } from "@/features/song/components/SongCard";
import { Pencil } from "lucide-react";
import { BackButton } from "@/shared/components/BackButton";
import { TeButton } from "@/shared/components/TeButton";
import { siteUrl, hasEnvVars, jsonLdScript } from "@/lib/utils";
import { slugify } from "@/lib/slugify";
import { getArtistSeoByName } from "@/features/artist/services/artists";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { userAgent } from "next/server";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { VariantSwitcher } from "@/features/song/components/VariantSwitcher";
import { Suspense, cache } from "react";
import { SavedToast } from "@/shared/components/SavedToast";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const metaSong = await getSongBySlug(slug);
  if (!metaSong) return {};

  // Artist alternate spellings (e.g. "оторвальд" for "O.Torvald") so the song
  // page is indexable for Cyrillic queries of a Latin-named artist.
  const { aliases: artistAliases } = await getArtistSeoByName(metaSong.artist);
  const aliasKeywords = artistAliases.filter((a) => a && a !== metaSong.artist);

  const difficultyLabel =
    metaSong.difficulty === "easy" ? "легка" : metaSong.difficulty === "medium" ? "середня" : "складна";
  const title = `${metaSong.title} — ${metaSong.artist}: акорди, текст, тональність | Diez`;
  // Description is tuned to ~155 chars (Google desktop snippet cap). Leads
  // with the highest-intent keywords ("акорди", "текст"), then the searchable
  // long-tails ("грати на гітарі", "табулатура") so we cover more query
  // shapes without keyword stuffing.
  const chordList = metaSong.chords.slice(0, 6).join(", ");
  const capoNote = metaSong.capo ? `, капо ${metaSong.capo}` : "";
  const description =
    `Акорди й текст пісні «${metaSong.title}» — ${metaSong.artist}. ` +
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { v: variantId, t: transposeParam } = await searchParams;

  // UA-detect mobile so SongViewer can wrap lyrics to a phone-width estimate in
  // the SSR/first paint (prevents the post-measure re-wrap CLS on phones).
  const { device } = userAgent({ headers: await headers() });
  const isMobile = device.type === "mobile";

  // Run song fetch + save-state in parallel — they only need `slug`.
  // (Previously song was awaited first, then a 2-call parallel batch ran;
  // this collapses one round-trip on mobile networks.)
  const [baseSong, saveState] = await Promise.all([
    getSongBySlug(slug),
    getSongSaveStateForSlug(slug),
  ]);
  if (!baseSong) return notFound();

  // Artist slug + alternate spellings need the song row, so this runs after.
  const artistSeo = await getArtistSeoByName(baseSong.artist);
  const artistSlug = artistSeo.slug ?? slugify(baseSong.artist);
  const artistAliases = artistSeo.aliases.filter((a) => a && a !== baseSong.artist);

  // ?v= takes priority; then the variant the user previously saved; then primary.
  const effectiveVariantId = variantId ?? saveState.variantId ?? undefined;
  const song = applyVariant(baseSong, effectiveVariantId);

  // Saved key: ?t= URL param (playlist links, sharing) wins over the value
  // stored with the user's own playlist save. Clamped to ±11 semitones.
  const parsedT = transposeParam !== undefined ? parseInt(transposeParam, 10) : NaN;
  const initialTranspose = Math.max(
    -11,
    Math.min(11, Number.isFinite(parsedT) ? parsedT : saveState.transpose),
  );

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: song.title,
    composer: {
      "@type": "MusicGroup",
      name: song.artist,
      ...(artistAliases.length > 0 && { alternateName: artistAliases }),
      url: `${siteUrl}/artists/${artistSlug}`,
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
      { "@type": "ListItem", position: 3, name: song.artist, item: `${siteUrl}/artists/${artistSlug}` },
      { "@type": "ListItem", position: 4, name: song.title, item: `${siteUrl}/songs/${song.slug}` },
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
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-8 pt-4 pb-20">

        {/* ── Header (single row, centered title, no surface) ─────────── */}
        <div className="mb-4 grid items-center" style={{ padding: "0.4rem 0", gridTemplateColumns: "1fr auto 1fr" }}>
          {/* Left: Back */}
          <BackButton fallback="/songs" />

          {/* Center: Title + meta — stacks on mobile, inline on md+ */}
          {/* items-baseline on md+: artist (e-Ukraine) and title (e-Ukraine Head)
              have different vertical metrics, so items-center misaligns them. */}
          <div className="flex flex-col md:flex-row items-center md:items-baseline justify-center md:gap-2 px-2 md:px-4 min-w-0">
            <Link
              href={`/artists/${artistSlug}`}
              className="hover:underline truncate max-w-full"
              style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.45 }}
            >
              {song.artist}
            </Link>
            <h1
              className="truncate"
              style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 700, color: "var(--text)", lineHeight: 1.45 }}
            >
              {song.title}
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 justify-end">
            {song.variants && song.variants.length > 0 && (
              <span className="hidden md:inline-flex">
                <VariantSwitcher
                  variants={song.variants}
                  activeVariantId={song.activeVariantId}
                />
              </span>
            )}
            <Suspense>
              <AdminEditButton slug={slug} variantId={song.activeVariantId} />
            </Suspense>
            <span className="hidden lg:inline-flex"><FocusModeToggle /></span>
            {song.sections.some((s) => s.tab) && <TabsToggleButton />}
            <SongActions slug={song.slug} isSaved={saveState.isSaved} variantId={song.activeVariantId} />
          </div>
        </div>

        {/* Mobile-only variant switcher row (avoids overlap with stacked title) */}
        {song.variants && song.variants.length > 0 && (
          <div className="md:hidden flex justify-center mb-4">
            <VariantSwitcher
              variants={song.variants}
              activeVariantId={song.activeVariantId}
            />
          </div>
        )}

        {/* ── Dynamic Song Viewer (Chords, Lyrics, Controls) ── */}
        <SongViewer
          song={song}
          initialMobile={isMobile}
          initialTranspose={initialTranspose}
          editSlot={
            <Suspense fallback={null}>
              <AdminEditSheetButton slug={slug} variantId={song.activeVariantId} />
            </Suspense>
          }
        />

        {/* Instrument caption — honest (every song is playable on all three
            instruments via the toggle inside SongViewer) and a real on-page
            signal for "«пісня» акорди для укулеле / піаніно" long-tails. The
            links funnel crawl + equity to the instrument hubs. */}
        <p className="mt-6 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          «{song.title}» можна грати на гітарі,{" "}
          <Link href="/songs/instrument/ukulele" className="hover:underline" style={{ color: "var(--text-mid)" }}>
            укулеле
          </Link>{" "}
          або{" "}
          <Link href="/songs/instrument/piano" className="hover:underline" style={{ color: "var(--text-mid)" }}>
            піаніно
          </Link>{" "}
          — перемкніть інструмент над акордами й транспонуйте тональність у будь-яку зручну.
        </p>


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

      </main>
      <SiteFooter />
    </div>
  );
}

// ─── Streamed sections ───────────────────────────────────────────────────────

// React.cache dedupes per-request — admin check + ID lookup runs once even
// when both <AdminEditButton /> and <SongViewerWithEditHref /> consume it.
const lookupAdminSongId = cache(async (slug: string): Promise<string | null> => {
  if (!hasEnvVars) return null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return null;
    const { data } = await admin.from("songs").select("id").eq("slug", slug).single();
    return data?.id ?? null;
  } catch {
    return null;
  }
});

async function AdminEditButton({ slug, variantId }: { slug: string; variantId?: string }) {
  const songId = await lookupAdminSongId(slug);
  if (!songId) return null;
  const href = `/admin/songs/edit?id=${songId}&from=song${variantId ? `&variant=${variantId}` : ""}`;
  return (
    <span className="hidden lg:inline-flex">
      <TeButton
        href={href}
        title="Редагувати"
        style={{ width: 36, height: 36, color: "var(--orange)" }}
      >
        <Pencil size={14} />
      </TeButton>
    </span>
  );
}

// Mobile/tablet: full-width edit button at the bottom of the tools sheet.
// `lookupAdminSongId` is React.cache'd so this shares the same DB roundtrip
// as the desktop <AdminEditButton/> in the header.
async function AdminEditSheetButton({ slug, variantId }: { slug: string; variantId?: string }) {
  const songId = await lookupAdminSongId(slug);
  if (!songId) return null;
  const href = `/admin/songs/edit?id=${songId}&from=song${variantId ? `&variant=${variantId}` : ""}`;
  // Server → Client: can't pass `icon={Pencil}` (function reference) across
  // the boundary — render the icon inline as children instead.
  return (
    <TeButton
      shape="pill"
      href={href}
      className="w-full py-2 text-xs font-bold justify-center gap-2"
      style={{ borderRadius: "1rem", color: "var(--orange)" }}
    >
      <Pencil size={14} />
      Редагувати
    </TeButton>
  );
}

async function RelatedSongs({
  artist,
  excludeSlug,
  artistSlug,
}: {
  artist: string;
  excludeSlug: string;
  artistSlug: string;
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
        <TeButton
          shape="pill"
          href={`/artists/${artistSlug}`}
          className="px-3 py-1.5"
          style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}
        >
          Всі пісні →
        </TeButton>
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

