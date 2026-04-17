export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { SongCard } from "@/features/song/components/SongCard";
import { LogOut, Settings, Heart, Plus, User as UserIcon } from "lucide-react";
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

  // Saved songs — join saved_songs with songs via FK
  const { data: savedData } = await supabase
    .from("saved_songs")
    .select("songs(slug, title, artist, difficulty, chords, views, cover_image, cover_color)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const savedSongs = (savedData ?? [])
    .map((row: Record<string, unknown>) => row.songs as Record<string, unknown> | null)
    .filter(Boolean) as Record<string, unknown>[];

  // Songs submitted by this user
  const { data: submittedData } = await supabase
    .from("songs")
    .select("slug, title, artist, difficulty, chords, views, cover_image, cover_color")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const submittedSongs = (submittedData ?? []) as Record<string, unknown>[];

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
              <span className="text-xl font-bold tracking-tighter" style={{ color: "var(--orange)" }}>{savedSongs.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Збережених</span>
            </div>
            <div className="flex-1 te-inset p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xl font-bold tracking-tighter" style={{ color: "var(--orange)" }}>{submittedSongs.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Доданих</span>
            </div>
          </div>
        </div>

        <div className="te-surface flex flex-col p-4" style={{ borderRadius: "1.5rem" }}>
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
              Улюблені пісні
            </h3>
            <Link href="/songs" className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--orange)" }}>
              Всі
            </Link>
          </div>

          {savedSongs.length === 0 ? (
            <EmptyState message="Збережених пісень ще немає. Знайдіть щось до душі!" variant="inset" />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {savedSongs.map((song) => (
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
