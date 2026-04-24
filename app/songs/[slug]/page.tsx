import { type Metadata } from "next";
import { notFound } from "next/navigation";

// Song pages are admin-editable — force fresh fetch on every request so
// edits to tempo/strumming/variants appear immediately without fighting
// Next.js's route-level and fetch-level caches.
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSongBySlug, getSongsByArtist, applyVariant } from "@/features/song/services/songs";
import { getSavedSlugs, getSavedVariantId } from "@/features/playlist/actions/playlists";
import { type Song } from "@/features/song/types";
import { SongActions } from "@/features/song/components/SongActions";
import { FocusModeToggle } from "@/features/song/components/FocusModeToggle";
import { SongViewer } from "@/features/song/components/SongViewer";
import { SongCard } from "@/features/song/components/SongCard";
import { Pencil } from "lucide-react";
import { BackButton } from "@/shared/components/BackButton";
import { TeButton } from "@/shared/components/TeButton";
import { siteUrl, hasEnvVars } from "@/lib/utils";
import { slugify } from "@/lib/slugify";
import { getArtistSlugByName } from "@/features/artist/services/artists";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { VariantSwitcher } from "@/features/song/components/VariantSwitcher";
import { Suspense } from "react";
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

  const difficultyLabel =
    metaSong.difficulty === "easy" ? "легка" : metaSong.difficulty === "medium" ? "середня" : "складна";
  const title = `${metaSong.title} — ${metaSong.artist} | Акорди | Diez`;
  const description = `Акорди пісні «${metaSong.title}» виконавця ${metaSong.artist}. Тональність: ${metaSong.key}, складність: ${difficultyLabel}. Акорди: ${metaSong.chords.join(", ")}.`;

  return {
    title,
    description,
    alternates: { canonical: `/songs/${slug}` },
    openGraph: {
      title: `${metaSong.title} — ${metaSong.artist}`,
      description,
      type: "article",
      url: `/songs/${slug}`,
      // Use song cover when available; falls back to app/opengraph-image.png via Next.js inheritance.
      // Relative paths are resolved against metadataBase in app/layout.tsx.
      ...(metaSong.coverImage && {
        images: [{ url: metaSong.coverImage, alt: `${metaSong.title} — ${metaSong.artist}` }],
      }),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { slug } = await params;
  const { v: variantId } = await searchParams;
  const baseSong = await getSongBySlug(slug);
  if (!baseSong) return notFound();

  const [otherSongs, savedSlugs, savedVariantId, realArtistSlug] = await Promise.all([
    getSongsByArtist(baseSong.artist, { excludeSlug: slug, limit: 4 }),
    getSavedSlugs(),
    getSavedVariantId(slug),
    getArtistSlugByName(baseSong.artist),
  ]);
  // Prefer real DB slug; fall back to slugify() when artist row is missing.
  const artistSlug = realArtistSlug ?? slugify(baseSong.artist);

  // ?v= takes priority; then the variant the user previously saved; then primary.
  const effectiveVariantId = variantId ?? savedVariantId ?? undefined;
  const song = applyVariant(baseSong, effectiveVariantId);

  // Check admin — get song ID for edit link
  let songId: string | null = null;
  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles").select("is_admin").eq("id", user.id).single();
        if (profile?.is_admin) {
          const { data } = await admin.from("songs").select("id").eq("slug", slug).single();
          songId = data?.id ?? null;
        }
      }
    } catch { /* not admin or not logged in */ }
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: song.title,
    composer: { "@type": "MusicGroup", name: song.artist },
    musicalKey: song.key,
    genre: song.genre,
    url: `${siteUrl}/songs/${song.slug}`,
    ...(song.album && {
      inAlbum: { "@type": "MusicAlbum", name: song.album },
    }),
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Suspense><SavedToast /></Suspense>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-8 pt-4 pb-20">

        {/* ── Header (single row, centered title, no surface) ─────────── */}
        <div className="mb-4 grid items-center" style={{ padding: "0.4rem 0", gridTemplateColumns: "1fr auto 1fr" }}>
          {/* Left: Back */}
          <BackButton fallback="/songs" />

          {/* Center: Title + meta — stacks on mobile, inline on md+ */}
          <div className="flex flex-col md:flex-row items-center justify-center md:gap-2 px-2 md:px-4 min-w-0">
            <Link
              href={`/artists/${artistSlug}`}
              className="hover:underline truncate max-w-full"
              style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.2 }}
            >
              {song.artist}
            </Link>
            <h1
              className="truncate"
              style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}
            >
              {song.title}
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 justify-end">
            {song.variants && song.variants.length > 0 && (
              <VariantSwitcher
                variants={song.variants}
                activeVariantId={song.activeVariantId}
              />
            )}
            {songId && (
              <span className="hidden lg:inline-flex">
                <TeButton
                  href={`/admin/songs/edit?id=${songId}&from=song`}
                  title="Редагувати"
                  style={{ width: 36, height: 36, color: "var(--orange)" }}
                >
                  <Pencil size={14} />
                </TeButton>
              </span>
            )}
            <span className="hidden lg:inline-flex"><FocusModeToggle /></span>
            <SongActions slug={song.slug} isSaved={savedSlugs.has(song.slug)} variantId={song.activeVariantId} />
          </div>
        </div>

        {/* ── Dynamic Song Viewer (Chords, Lyrics, Controls) ── */}
        <SongViewer song={song} editHref={songId ? `/admin/songs/edit?id=${songId}&from=song` : undefined} />


        {/* ── Other songs by this artist ────────────────────────────────── */}
        {otherSongs.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="uppercase tracking-wider"
                style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.12em" }}
              >
                Ще від {song.artist}
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
                <SongCard key={s.slug} {...s} />
              ))}
            </div>
          </div>
        )}

      </main>
      <SiteFooter />
    </div>
  );
}

