export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { SongCard } from "@/features/song/components/SongCard";
import { MySongCard } from "@/features/song/components/MySongCard";
import { PlaylistCard } from "@/features/playlist/components/PlaylistCard";
import { getMyPlaylists } from "@/features/playlist/actions/playlists";
import { LogOut, Pencil, Heart, Plus, User as UserIcon, ListMusic, Music2 } from "lucide-react";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

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

  // Songs submitted by this user — include id + status so the profile shows the
  // publication state (draft / pending / published / rejected) and owner actions.
  const { data: submittedData } = await supabase
    .from("songs")
    .select("id, slug, title, artist, status, cover_image, cover_color")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const submittedSongs = (submittedData ?? []) as Record<string, unknown>[];
  const otherLists = playlists.filter((p) => !p.isDefault);

  const userName = profile?.username?.trim() || user.email!.split("@")[0];
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <aside className="w-full md:w-80 flex flex-col gap-6 shrink-0">
        <div className="te-surface p-8 text-center flex flex-col items-center" style={{ borderRadius: "2rem" }}>
          <div className="w-24 h-24 mb-4 te-inset flex items-center justify-center rounded-full overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={40} style={{ color: "var(--text-muted)" }} />
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-1" style={{ color: "var(--text)" }}>{userName}</h1>
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

        <div className="te-surface flex flex-col gap-2 p-4" style={{ borderRadius: "1.5rem" }}>
          <TeButton shape="pill" href="/profile/lists" className="flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl">
            <ListMusic size={16} strokeWidth={1.8} />
            Мої списки
          </TeButton>
          <TeButton shape="pill" href="/add" className="flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl">
            <Plus size={16} strokeWidth={1.8} />
            Додати нову пісню
          </TeButton>
          <TeButton shape="pill" href="/profile/edit" className="flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl">
            <Pencil size={16} strokeWidth={1.8} />
            Редагувати профіль
          </TeButton>
          <form action={signOut} className="w-full">
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl hover:bg-red-500/10 text-red-500" style={{ transition: "background 0.2s" }}>
              <LogOut size={16} /> Вийти
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 w-full space-y-12">
        {/* Додані пісні — first, so the author sees their submissions and
            statuses on the first screen. Named by action ("Додані") to avoid
            confusion with saved/favourite songs. */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Music2 size={20} style={{ color: "var(--orange)" }} aria-hidden="true" />
              Додані пісні
            </h2>
            <Link href="/add" className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--orange)" }}>
              Додати
            </Link>
          </div>

          {submittedSongs.length === 0 ? (
            <EmptyState
              message="Ви ще не додавали пісень."
              variant="inset"
              action={<Link href="/add" className="font-bold underline" style={{ color: "var(--orange-text)" }}>Додати першу →</Link>}
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {submittedSongs.map((song) => (
                <MySongCard
                  key={song.id as string}
                  id={song.id as string}
                  slug={song.slug as string}
                  title={song.title as string}
                  artist={song.artist as string}
                  status={song.status as string}
                  coverImage={(song.cover_image as string) ?? undefined}
                  coverColor={(song.cover_color as string) ?? undefined}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Heart size={20} style={{ color: "var(--orange)" }} aria-hidden="true" />
              Збережені
            </h2>
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
              <h2 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2" style={{ color: "var(--text)" }}>
                <ListMusic size={20} style={{ color: "var(--orange)" }} aria-hidden="true" />
                Мої списки
              </h2>
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
