export const dynamic = "force-dynamic";

import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { getSongsByArtist } from "@/features/song/services/songs";
import { getArtistBySlug } from "@/features/artist/services/artists";
import { getSavedSlugs } from "@/features/playlist/actions/playlists";
import { getSavedArtistSlugs } from "@/features/playlist/actions/artist-playlists";
import { SaveArtistButton } from "@/features/artist/components/SaveArtistButton";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { ArtistSongsList } from "./ArtistSongsList";
import { TeButton } from "@/shared/components/TeButton";
import { BackButton } from "@/shared/components/BackButton";
import { siteUrl, hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  const name = artist?.name ?? slug;
  const songs = await getSongsByArtist(name);
  const aliases = (artist?.aliases ?? []).filter(a => a && a !== name);
  const aliasPhrase = aliases.length > 0 ? ` (також: ${aliases.join(", ")})` : "";

  return {
    title: `${name}${aliasPhrase} — Акорди пісень | Diez`,
    description: `Акорди пісень ${name}${aliasPhrase} на Diez. ${songs.length} пісень у каталозі.`,
    ...(aliases.length > 0 && { keywords: [name, ...aliases, "акорди", "гітара"] }),
    alternates: { canonical: `/artists/${slug}` },
    openGraph: {
      title: `${name} — Акорди пісень`,
      type: "website",
      url: `/artists/${slug}`,
      ...(artist?.photo_url && { images: [{ url: artist.photo_url }] }),
    },
  };
}

export default async function ArtistPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort = "" } = await searchParams;
  const artist = await getArtistBySlug(slug);
  const artistName = artist?.name ?? slug;
  const sortMap: Record<string, "views" | "created_at_desc" | "created_at_asc" | "source_views" | "title_asc"> = {
    new: "created_at_desc",
    old: "created_at_asc",
    popular: "source_views",
    az: "title_asc",
    views: "views",
  };
  const songs = await getSongsByArtist(artistName, { sortBy: sortMap[sort] ?? "source_views" });
  const savedSlugs = await getSavedSlugs();
  const savedArtistSlugs = await getSavedArtistSlugs();
  const artistSaved = savedArtistSlugs.has(slug);

  // Admin check for edit button
  let isAdmin = false;
  if (hasEnvVars && artist?.id) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles").select("is_admin").eq("id", user.id).single();
        isAdmin = profile?.is_admin ?? false;
      }
    } catch { /* not logged in */ }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artistName,
    url: `${siteUrl}/artists/${slug}`,
    ...(artist?.aliases && artist.aliases.length > 0 && {
      alternateName: artist.aliases,
    }),
    ...(artist?.photo_url && { image: artist.photo_url }),
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-6 flex items-center justify-between gap-3">
        <BackButton fallback="/artists" label="Виконавці" />
        {isAdmin && artist?.id && (
          <TeButton
            shape="pill"
            href={`/admin/artists/edit?id=${artist.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
            style={{ color: "var(--orange)", borderRadius: "0.75rem" }}
          >
            <Pencil size={12} />
            Редагувати
          </TeButton>
        )}
      </div>

        <div className="te-surface p-4 md:p-5 mb-8 relative" style={{ borderRadius: "1.5rem" }}>
          <div className="absolute top-3 right-3 md:top-4 md:right-4">
            <SaveArtistButton
              artistSlug={slug}
              artistName={artistName}
              songsCount={songs.length}
              initialSaved={artistSaved}
              variant="bare"
              size={16}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden te-inset flex-shrink-0 flex items-center justify-center">
              {artist?.photo_url ? (
                <Image
                  src={artist.photo_url}
                  alt={artistName}
                  width={96}
                  height={96}
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
          sort={songs.length >= 5 ? sort : undefined}
          sortBasePath={`/artists/${slug}`}
          songs={songs.map(s => ({
            slug: s.slug,
            title: s.title,
            artist: s.artist,
            difficulty: s.difficulty,
            coverImage: s.coverImage,
            coverColor: s.coverColor,
            youtubeId: s.youtubeId,
          }))}
          savedSlugs={Array.from(savedSlugs)}
        />
    </PageShell>
  );
}
