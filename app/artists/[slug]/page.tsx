// Static + 30-day ISR backstop; edits invalidate it on demand (artistSongsTag,
// "artists", revalidatePath) — see features/song/lib/cache-tags.ts.
// This used to be force-dynamic because the page read the viewer's saved
// state, the admin flag and a `?sort=` query on the server — so every visit,
// bot or human, was a full render (a big contributor to the Fluid CPU that
// tripped the 17.09.2026 Hobby fair-use block). Those three now live on the
// client: SavedArtistsProvider, <AdminOnly>, and ArtistSongsList's own sort.
export const revalidate = 2592000;

// On-demand ISR only works when generateStaticParams exists — a dynamic
// segment without it is rendered per request, `revalidate` or not (verified
// locally: the route stayed `private, no-cache` until this was added). Empty
// on purpose: prerendering ~150 artist pages on every deploy would just move
// the render cost into builds; each page is built on its first visit instead
// and served from the cache for an hour after that.
export function generateStaticParams(): { slug: string }[] {
  return [];
}

import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { getSongsByArtist } from "@/features/song/services/songs";
import { getArtistBySlug } from "@/features/artist/services/artists";
import { LEGACY_ARTIST_SLUGS } from "@/features/artist/lib/legacy-slugs";
import { permanentRedirect, notFound } from "next/navigation";
import { SaveArtistButton } from "@/features/artist/components/SaveArtistButton";
import { SavedArtistsProvider } from "@/features/artist/components/SavedArtistsProvider";
import { AdminOnly } from "@/shared/components/AdminOnly";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { ArtistSongsList } from "./ArtistSongsList";
import { TeButton } from "@/shared/components/TeButton";
import { BackButton } from "@/shared/components/BackButton";
import { siteUrl, jsonLdScript, coverThumb } from "@/lib/utils";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  // Unknown slug → the page 404s (see below); don't emit slug-derived metadata.
  if (!artist) return {};
  const name = artist.name;
  const songs = await getSongsByArtist(name);
  const aliases = (artist?.aliases ?? []).filter(a => a && a !== name);
  const aliasPhrase = aliases.length > 0 ? ` (також: ${aliases.join(", ")})` : "";

  // Sample the artist's three most-viewed song titles into the description.
  // Their titles are real long-tail keywords users actually type into Google
  // — pulling them into the meta tag is the single biggest organic boost a
  // catalog artist page can get for free.
  const topTitles = songs.slice(0, 3).map((s) => `«${s.title}»`).join(", ");
  const titlesPart = topTitles ? ` Серед популярних: ${topTitles}.` : "";

  return {
    title: `${name}${aliasPhrase} — акорди, тексти пісень | Diez`,
    description:
      `${songs.length} пісень ${name} з акордами та текстами для гітари на Diez.` +
      `${titlesPart}`,
    ...(aliases.length > 0 && { keywords: [name, ...aliases, "акорди", "текст пісні", "гітара"] }),
    alternates: { canonical: `/artists/${slug}` },
    openGraph: {
      title: `${name} — Акорди й тексти пісень`,
      description: `${songs.length} пісень ${name} з акордами на Diez.`,
      type: "website",
      url: `/artists/${slug}`,
      // No explicit `images` — Next.js auto-resolves the co-located
      // `opengraph-image.tsx` which renders a dark themed card with the
      // artist name and top song titles. Passing `photo_url` here would
      // override that with a raw square portrait, which previews poorly.
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — Акорди й тексти пісень`,
      description: `${songs.length} пісень ${name} з акордами на Diez.`,
    },
  };
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  // Renamed slug: the DB lookup missed but we know the successor — send
  // bookmarks and external links to the new address permanently.
  if (!artist && LEGACY_ARTIST_SLUGS[slug]) {
    permanentRedirect(`/artists/${LEGACY_ARTIST_SLUGS[slug]}`);
  }
  // Unknown slug → real 404. Previously this fell through and rendered a
  // 200 page with the raw slug as the artist name and «0 пісень» — a
  // self-canonicalized soft-404 that Google crawls forever but refuses to
  // index (a prime feeder of «Проскановано — наразі не проіндексовано»).
  if (!artist) notFound();
  const artistName = artist.name;
  // Default order only — the list re-sorts on the client (ArtistSongsList),
  // so a `?sort=` query no longer needs a per-request render.
  const songs = await getSongsByArtist(artistName, { sortBy: "source_views" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artistName,
    url: `${siteUrl}/artists/${slug}`,
    ...(artist?.aliases && artist.aliases.length > 0 && {
      alternateName: artist.aliases,
    }),
    ...(artist?.photo_url && { image: artist.photo_url }),
    ...(artist?.genre && { genre: artist.genre }),
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Diez", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Виконавці", item: `${siteUrl}/artists` },
      { "@type": "ListItem", position: 3, name: artistName, item: `${siteUrl}/artists/${slug}` },
    ],
  };

  return (
    <PageShell>
      {/* Inline JSON-LD in SSR HTML — Googlebot reads it before JS execution. */}
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <BackButton fallback="/artists" label="Виконавці" />
        {artist?.id && (
          <AdminOnly>
            <TeButton
              shape="pill"
              href={`/admin/artists/edit?id=${artist.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
              style={{ color: "var(--orange)", borderRadius: "0.75rem" }}
            >
              <Pencil size={12} />
              Редагувати
            </TeButton>
          </AdminOnly>
        )}
      </div>

        <div className="te-surface p-4 md:p-5 mb-8 relative" style={{ borderRadius: "1.5rem" }}>
          <div className="absolute top-3 right-3 md:top-4 md:right-4">
            <SavedArtistsProvider>
              <SaveArtistButton
                artistSlug={slug}
                artistName={artistName}
                songsCount={songs.length}
                variant="bare"
                size={16}
              />
            </SavedArtistsProvider>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden te-inset flex-shrink-0 flex items-center justify-center">
              {artist?.photo_url ? (
                <Image
                  src={coverThumb(artist.photo_url, 240) as string}
                  alt={artistName}
                  width={96}
                  height={96}
                  // Артист hero photo — LCP-кандидат на цій сторінці.
                  // Без `priority` Next lazy-loads → 200-400ms LCP delay.
                  priority
                  unoptimized
                  className="object-cover w-full h-full"
                />
              ) : (
                <span style={{ fontSize: "2.25rem" }}>🎸</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pr-10">
              <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight break-words mb-1">
                {artistName}
              </h1>
              {artist?.genre && (
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--orange-text)" }}>
                  {artist.genre}
                </p>
              )}
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {songs.length} пісень
              </p>
              {artist?.aliases && artist.aliases.length > 0 && (
                <p className="text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                  Також: {artist.aliases.join(", ")}
                </p>
              )}
            </div>
          </div>
          {artist?.bio && (
            <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>
              {artist.bio}
            </p>
          )}
        </div>

        <ArtistSongsList
          showSearch={songs.length >= 5}
          sortable={songs.length >= 5}
          songs={songs.map(s => ({
            slug: s.slug,
            title: s.title,
            artist: s.artist,
            difficulty: s.difficulty,
            coverImage: s.coverImage,
            coverColor: s.coverColor,
            youtubeId: s.youtubeId,
            views: s.views,
            sourceViews: s.sourceViews,
            createdAt: s.createdAt,
          }))}
        />
    </PageShell>
  );
}
