export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListsSkeleton } from "@/features/playlist/components/PlaylistSkeletons";
import { createClient } from "@/lib/supabase/server";
import { getMyPlaylists } from "@/features/playlist/actions/playlists";
import { PlaylistCard } from "@/features/playlist/components/PlaylistCard";
import { CreatePlaylistButton } from "@/features/playlist/components/CreatePlaylistButton";
import { RandomSavedSongButton } from "@/features/playlist/components/RandomSavedSongButton";

export const metadata = {
  title: "Мої списки — Diez",
};

async function ListsContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) redirect("/auth/login");

  const playlists = await getMyPlaylists();

  return (
    <>
      <PageHeader
        title="Мої списки"
        subtitle="Керуйте збереженими піснями та діліться ними з друзями"
      />
      <div className="-mt-6 mb-10 flex flex-wrap items-center gap-3">
        <CreatePlaylistButton />
        {/* Only worth offering once something is saved. */}
        {playlists.length > 0 && <RandomSavedSongButton />}
      </div>

      {playlists.length === 0 ? (
        <EmptyState
          message="У вас ще немає списків."
          variant="inset"
          action={
            <Link href="/songs" className="font-bold underline" style={{ color: "var(--orange-text)" }}>
              Знайдіть пісню →
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      )}
    </>
  );
}

export default function ListsPage() {
  return (
    <PageShell>
      <Suspense fallback={<ListsSkeleton />}>
        <ListsContent />
      </Suspense>
    </PageShell>
  );
}
