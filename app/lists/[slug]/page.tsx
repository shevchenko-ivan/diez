export const dynamic = "force-dynamic";

import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Link as LinkIcon, ListMusic } from "lucide-react";
import { PageShell } from "@/shared/components/PageShell";
import { SongCard } from "@/features/song/components/SongCard";
import { getPublicPlaylistBySlug } from "@/features/playlist/services/playlists";
import { getSavedSlugs } from "@/features/playlist/actions/playlists";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const playlist = await getPublicPlaylistBySlug(slug);
  if (!playlist) return {};
  return {
    title: `${playlist.name} — Список | Diez`,
    description: `Добірка з ${playlist.songs.length} пісень на Diez`,
    openGraph: {
      title: playlist.name,
      description: `Добірка з ${playlist.songs.length} пісень`,
      type: "website",
      url: `/lists/${slug}`,
    },
  };
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const playlist = await getPublicPlaylistBySlug(slug);
  if (!playlist) return notFound();

  // Only the owner may view private playlists.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (playlist.visibility === "private" && playlist.ownerId !== user?.id) {
    return notFound();
  }

  const savedSlugs = await getSavedSlugs();
  const ownerLabel = playlist.owner.username || playlist.owner.email?.split("@")[0] || "Diez";
  const VisIcon = LinkIcon;

  return (
    <PageShell>
      <div className="te-surface p-8 mb-8 flex flex-col md:flex-row items-start gap-6" style={{ borderRadius: "1.5rem" }}>
        <div
          className="w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(145deg, rgba(255,136,0,0.2), rgba(255,136,0,0.05))" }}
        >
          <ListMusic size={56} style={{ color: "var(--orange)" }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <VisIcon size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Список за посиланням
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-3" style={{ color: "var(--text)" }}>
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              {playlist.description}
            </p>
          )}
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--text)" }}>{ownerLabel}</span>
            <span className="mx-2 opacity-30">·</span>
            {playlist.songs.length} {pluralSongs(playlist.songs.length)}
          </p>
        </div>
      </div>

      {playlist.songs.length === 0 ? (
        <div className="te-surface p-10 text-center" style={{ borderRadius: "1.5rem" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>У цьому списку поки немає пісень.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlist.songs.map((song) => (
            <SongCard
              key={song.slug}
              slug={song.slug}
              title={song.title}
              artist={song.artist}
              difficulty={song.difficulty}
              chords={song.chords}
              views={song.views}
              coverImage={song.coverImage}
              coverColor={song.coverColor}
              isSaved={savedSlugs.has(song.slug)}
              variantId={song.variantId}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function pluralSongs(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "пісня";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "пісні";
  return "пісень";
}
