export const dynamic = "force-dynamic";

import { type Metadata } from "next";
import { Navbar } from "@/shared/components/Navbar";
import { getAllSongs } from "@/features/song/services/songs";
import { getArtistBySlug } from "@/features/artist/services/artists";
import { SongCard } from "@/features/song/components/SongCard";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { siteUrl, hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteFooter } from "@/shared/components/SiteFooter";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  const allSongs = await getAllSongs();

  const name = artist?.name ?? slug;
  const songs = allSongs.filter((s) => s.artist.toLowerCase() === name.toLowerCase());

  return {
    title: `${name} — Акорди пісень | Diez`,
    description: `Акорди пісень ${name} на Diez. ${songs.length} пісень у каталозі.`,
    alternates: { canonical: `/artists/${slug}` },
    openGraph: {
      title: `${name} — Акорди пісень`,
      type: "website",
      url: `/artists/${slug}`,
      ...(artist?.photo_url && { images: [{ url: artist.photo_url }] }),
    },
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  const allSongs = await getAllSongs();

  const artistName = artist?.name ?? slug;
  const songs = allSongs.filter(
    (s) => s.artist.toLowerCase() === artistName.toLowerCase()
  );

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
    ...(artist?.photo_url && { image: artist.photo_url }),
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/artists" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Виконавці
        </Link>

        <div className="te-surface p-8 mb-12" style={{ borderRadius: "2rem" }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full overflow-hidden te-inset flex-shrink-0 flex items-center justify-center">
              {artist?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.photo_url}
                  alt={artistName}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span style={{ fontSize: "3.5rem" }}>🎸</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-4xl font-bold mb-2 uppercase tracking-tight">{artistName}</h1>
                {isAdmin && artist?.id && (
                  <Link
                    href={`/admin/artists/edit?id=${artist.id}`}
                    className="te-key inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold shrink-0"
                    style={{ color: "var(--orange)", borderRadius: "0.75rem" }}
                  >
                    <Pencil size={12} />
                    Редагувати
                  </Link>
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

        <h2 className="text-xl font-bold mb-6 uppercase tracking-wider">Пісні виконавця</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {songs.map(({ key: _k, ...s }) => (
            <SongCard key={s.slug} {...s} />
          ))}
          {songs.length === 0 && (
            <p className="col-span-full py-12 text-center te-inset rounded-2xl" style={{ color: "var(--text-muted)" }}>
              Пісень цього виконавця поки немає в базі.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
