export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { SongCard } from "@/features/song/components/SongCard";
import { PlaylistCard } from "@/features/playlist/components/PlaylistCard";
import { getMyPlaylists } from "@/features/playlist/actions/playlists";
import { LogOut, Settings, Heart, Plus, User as UserIcon, ListMusic } from "lucide-react";
import Link from "next/link";
import { TeButton } from "@/shared/components/TeButton";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export const metadata = {
  title: "Мій профіль — Diez",
};

async function ProfileDashboard() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/auth/login");
  }

  const user = data.user;

  const playlists = await getMyPlaylists();
  const defaultList = playlists.find((p) => p.isDefault) ?? null;
  const totalSaved = playlists.reduce((acc, p) => acc + (p.songCount ?? 0), 0);

  // Preview songs from default list
  let defaultPreview: Record<string, unknown>[] = [];
  if (defaultList) {
    const { data: preview } = await supabase
      .from("playlist_songs")
      .select("position, songs(slug, title, artist, difficulty, chords, views, cover_image, cover_color)")
      .eq("playlist_id", defaultList.id)
      .order("position", { ascending: true })
      .limit(6);
    defaultPreview = (preview ?? [])
      .map((row: Record<string, unknown>) => row.songs as Record<string, unknown> | null)
      .filter(Boolean) as Record<string, unknown>[];
  }

  // Songs submitted by this user
  const { data: submittedData } = await supabase
    .from("songs")
    .select("slug, title, artist, difficulty, chords, views, cover_image, cover_color")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const submittedSongs = (submittedData ?? []) as Record<string, unknown>[];
  const otherLists = playlists.filter((p) => !p.isDefault);

  const userName = user.email!.split("@")[0];

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <aside className="w-full md:w-80 flex flex-col gap-6 shrink-0">
        <div className="te-surface p-8 text-center flex flex-col items-center" style={{ borderRadius: "2rem" }}>
          <div className="w-24 h-24 mb-4 te-inset flex items-center justify-center rounded-full overflow-hidden">
            <UserIcon size={40} style={{ color: "var(--text-muted)" }} />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: "var(--text)" }}>{userName}</h2>
          <p className="text-sm font-medium opacity-60 mb-8" style={{ color: "var(--text-muted)" }}>{user.email}</p>

          <div className="flex gap-4 w-full">
            <div className="flex-1 te-inset p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xl font-bold tracking-tighter" style={{ color: "var(--orange)" }}>{totalSaved}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Збережених</span>
            </div>
            <div className="flex-1 te-inset p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xl font-bold tracking-tighter" style={{ color: "var(--orange)" }}>{submittedSongs.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Доданих</span>
            </div>
          </div>
        </div>

        <div className="te-surface flex flex-col p-4" style={{ borderRadius: "1.5rem" }}>
          <TeButton shape="pill" href="/profile/lists" className="flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl mb-1">
            <ListMusic size={16} strokeWidth={1.8} />
            Мої списки
          </TeButton>
          <TeButton shape="pill" href="/add" className="flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl mb-1">
            <Plus size={16} strokeWidth={1.8} />
            Додати нову пісню
          </TeButton>
          <button disabled className="flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl mb-1 hover:bg-[var(--surface-active)]" style={{ color: "var(--text)", transition: "background 0.2s" }}>
            <Settings size={16} style={{ color: "var(--text-muted)" }} /> Налаштування
          </button>
          <form action={signOut} className="w-full">
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl hover:bg-red-500/10 text-red-500" style={{ transition: "background 0.2s" }}>
              <LogOut size={16} /> Вийти
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 w-full space-y-12">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Heart size={20} style={{ color: "var(--orange)" }} />
              Збережені
            </h3>
            {defaultList && (
              <Link
                href={`/profile/lists/${defaultList.id}`}
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--orange)" }}
              >
                Всі
              </Link>
            )}
          </div>

          {defaultPreview.length === 0 ? (
            <EmptyState message="Збережених пісень ще немає. Знайдіть щось до душі!" variant="inset" />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultPreview.map((song) => (
                <SongCard
                  key={song.slug as string}
                  slug={song.slug as string}
                  title={song.title as string}
                  artist={song.artist as string}
                  difficulty={song.difficulty as "easy" | "medium" | "hard"}
                  chords={song.chords as string[]}
                  views={song.views as number}
                  coverImage={(song.cover_image as string) ?? undefined}
                  coverColor={(song.cover_color as string) ?? undefined}
                  isSaved
                />
              ))}
            </div>
          )}
        </div>

        {otherLists.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2" style={{ color: "var(--text)" }}>
                <ListMusic size={20} style={{ color: "var(--orange)" }} />
                Мої списки
              </h3>
              <Link
                href="/profile/lists"
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--orange)" }}
              >
                Всі
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {otherLists.slice(0, 6).map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2" style={{ color: "var(--text)" }}>
              Мої підбори
            </h3>
          </div>

          {submittedSongs.length === 0 ? (
            <EmptyState
              message="Ви ще не додавали пісень."
              variant="inset"
              action={<Link href="/add" className="font-bold underline" style={{ color: "var(--orange)" }}>Додати зараз →</Link>}
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {submittedSongs.map((song) => (
                <SongCard
                  key={song.slug as string}
                  slug={song.slug as string}
                  title={song.title as string}
                  artist={song.artist as string}
                  difficulty={song.difficulty as "easy" | "medium" | "hard"}
                  chords={song.chords as string[]}
                  views={song.views as number}
                  coverImage={(song.cover_image as string) ?? undefined}
                  coverColor={(song.cover_color as string) ?? undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <PageShell footer={false}>
      <Suspense fallback={<LoadingState message="Завантаження профілю..." />}>
        <ProfileDashboard />
      </Suspense>
    </PageShell>
  );
}
