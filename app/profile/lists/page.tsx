export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState } from "@/shared/components/LoadingState";
import { EmptyState } from "@/shared/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { getMyPlaylists } from "@/features/playlist/actions/playlists";
import { PlaylistCard } from "@/features/playlist/components/PlaylistCard";
import { CreatePlaylistButton } from "@/features/playlist/components/CreatePlaylistButton";

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
        action={<CreatePlaylistButton />}
      />

      {playlists.length === 0 ? (
        <EmptyState
          message="У вас ще немає списків."
          variant="inset"
          action={
            <Link href="/songs" className="font-bold underline" style={{ color: "var(--orange)" }}>
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
      <Suspense fallback={<LoadingState message="Завантаження списків..." />}>
        <ListsContent />
      </Suspense>
    </PageShell>
  );
}
