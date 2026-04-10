import { Navbar } from "@/shared/components/Navbar";
import { getAllSongs } from "@/features/song/services/songs";
import { SongCard } from "@/features/song/components/SongCard";
import { LogOut, Settings, Heart, Plus, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

export const metadata = {
  title: "Мій профіль — Diez",
};

async function ProfileDashboard() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  const mockUser = data?.user?.email ? {
    name: data.user.email.split("@")[0],
    email: data.user.email
  } : {
    name: "Гітарист_123",
    email: "user@example.com"
  };

  const allSongs = getAllSongs();
  const savedSongs = allSongs.slice(0, 3);
  const addedSongs = allSongs.slice(allSongs.length - 2);

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <aside className="w-full md:w-80 flex flex-col gap-6 shrink-0">
        <div className="te-surface p-8 text-center flex flex-col items-center" style={{ borderRadius: "2rem" }}>
          <div className="w-24 h-24 mb-4 te-inset flex items-center justify-center rounded-full overflow-hidden">
            <UserIcon size={40} style={{ color: "var(--text-muted)" }} />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: "var(--text)" }}>{mockUser.name}</h2>
          <p className="text-sm font-medium opacity-60 mb-8" style={{ color: "var(--text-muted)" }}>{mockUser.email}</p>
          
          <div className="flex gap-4 w-full">
            <div className="flex-1 te-inset p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xl font-bold tracking-tighter" style={{ color: "var(--orange)" }}>{savedSongs.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Збережених</span>
            </div>
            <div className="flex-1 te-inset p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xl font-bold tracking-tighter" style={{ color: "var(--orange)" }}>{addedSongs.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Доданих</span>
            </div>
          </div>
        </div>

        <div className="te-surface flex flex-col p-4" style={{ borderRadius: "1.5rem" }}>
          <Link href="/add" className="flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl mb-1 te-btn-orange">
            <Plus size={16} /> Додати нову пісню
          </Link>
          <button disabled className="flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl mb-1 hover:bg-[var(--surface-active)]" style={{ color: "var(--text)", transition: "background 0.2s" }}>
            <Settings size={16} style={{ color: "var(--text-muted)" }} /> Налаштування
          </button>
          <form action="/auth/login" method="GET" className="w-full">
             <button className="w-full flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-xl hover:bg-red-500/10 text-red-500" style={{ transition: "background 0.2s" }}>
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
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {savedSongs.map((song) => (
              <SongCard
                key={song.slug}
                slug={song.slug}
                title={song.title}
                artist={song.artist}
                difficulty={song.difficulty}
                chords={song.chords}
                views={song.views}
                coverImage={song.coverImage}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2" style={{ color: "var(--text)" }}>
              Мої підбори
            </h3>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {addedSongs.map((song) => (
              <SongCard
                key={song.slug}
                slug={song.slug}
                title={song.title}
                artist={song.artist}
                difficulty={song.difficulty}
                chords={song.chords}
                views={song.views}
                coverImage={song.coverImage}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Suspense fallback={
          <div className="p-12 text-center opacity-60 font-medium" style={{ color: "var(--text)" }}>
            Завантаження профілю...
          </div>
        }>
          <ProfileDashboard />
        </Suspense>
      </main>
    </div>
  );
}
