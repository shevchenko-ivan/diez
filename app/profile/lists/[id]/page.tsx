export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/shared/components/PageShell";
import { BackButton } from "@/shared/components/BackButton";
import { LoadingState } from "@/shared/components/LoadingState";
import { createClient } from "@/lib/supabase/server";
import { getMyPlaylistById } from "@/features/playlist/services/playlists";
import { PlaylistManager } from "@/features/playlist/components/PlaylistManager";

export const metadata = {
  title: "Список — Diez",
};

async function ManageContent({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/auth/login");

  const playlist = await getMyPlaylistById(id);
  if (!playlist) return notFound();

  return (
    <>
      <div className="mb-4">
        <BackButton fallback="/profile/lists" />
      </div>
      <PlaylistManager
        playlist={{
          id: playlist.id,
          slug: playlist.slug,
          name: playlist.name,
          description: playlist.description,
          visibility: playlist.visibility,
          isDefault: playlist.isDefault,
        }}
        initialSongs={playlist.songs.map((s) => ({
          id: s.id,
          slug: s.slug,
          title: s.title,
          artist: s.artist,
          difficulty: s.difficulty,
          chords: s.chords,
          views: s.views,
          coverImage: s.coverImage,
          coverColor: s.coverColor,
        }))}
      />
    </>
  );
}

export default async function ManageListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell>
      <Suspense fallback={<LoadingState message="Завантаження..." />}>
        <ManageContent id={id} />
      </Suspense>
    </PageShell>
  );
}
