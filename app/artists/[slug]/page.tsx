export const dynamic = "force-dynamic";

import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { getSongsByArtist } from "@/features/song/services/songs";
import { getArtistBySlug } from "@/features/artist/services/artists";
import { getSavedSlugs } from "@/features/playlist/actions/playlists";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { ArtistSongsList } from "./ArtistSongsList";
import { TeButton } from "@/shared/components/TeButton";
import { BackButton } from "@/shared/components/BackButton";
import { siteUrl, hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SortSelect } from "@/app/songs/SortSelect";
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
      <div className="mb-8">
        <BackButton fallback="/artists" label="Виконавці" />
      </div>

        <div className="te-surface p-8 mb-12" style={{ borderRadius: "2rem" }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full overflow-hidden te-inset flex-shrink-0 flex items-center justify-center">
              {artist?.photo_url ? (
                <Image
                  src={artist.photo_url}
                  alt={artistName}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span style={{ fontSize: "3.5rem" }}>🎸</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2 uppercase tracking-tight">{artistName}</h1>
                  {artist?.aliases && artist.aliases.length > 0 && (
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                      Також відомий як: {artist.aliases.join(", ")}
                    </p>
                  )}
                </div>
                {isAdmin && artist?.id && (
                  <TeButton
                    shape="pill"
                    href={`/admin/artists/edit?id=${artist.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold shrink-0"
                    style={{ color: "var(--orange)", borderRadius: "0.75rem" }}
                  >
                    <Pencil size={12} />
                    Редагувати
                  </TeButton>
                )}
              </div>
              {artist?.genre && (
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--orange)" }}>
                  {artist.genre}
                </p>
              )}
              {artist?.bio && (
                <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-muted)" }}>
                  {artist.bio}
                </p>
              )}
              <p className="text-xs uppercase tracking-widest mt-2" style={{ color: "var(--text-muted)" }}>
                {songs.length} пісень
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h2 className="text-xl font-bold uppercase tracking-wider">Пісні виконавця</h2>
          <SortSelect value={sort} basePath={`/artists/${slug}`} />
        </div>
        <ArtistSongsList
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
