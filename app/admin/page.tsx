import { Navbar } from "@/shared/components/Navbar";
import { ArrowLeft, Plus, Music, Eye, EyeOff, Trash2, Archive, Users } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateSongStatus, deleteSong } from "@/features/song/actions/admin";
import { hasEnvVars } from "@/lib/utils";

export const metadata = {
  title: "Адмін-панель — Diez",
};

interface AdminSong {
  id: string;
  slug: string;
  title: string;
  artist: string;
  views: number;
  status: string;
  created_at: string;
}

async function getAdminData() {
  if (!hasEnvVars) return { songs: [] as AdminSong[], isAdmin: false };

  // Verify admin status
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { songs: [] as AdminSong[], isAdmin: false };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { songs: [] as AdminSong[], isAdmin: false };

  // Fetch all songs (all statuses) via service role
  const { data: songs } = await admin
    .from("songs")
    .select("id, slug, title, artist, views, status, created_at")
    .order("created_at", { ascending: false });

  return { songs: (songs ?? []) as AdminSong[], isAdmin: true };
}

export default async function AdminPage() {
  const { songs, isAdmin } = await getAdminData();

  if (!isAdmin) {
    redirect("/");
  }

  const published = songs.filter((s) => s.status === "published");
  const drafts = songs.filter((s) => s.status === "draft");
  const archived = songs.filter((s) => s.status === "archived");

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/profile" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Мій профіль
        </Link>

        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-3 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Адмін-панель</h1>
            <p className="text-sm font-medium tracking-wide border-l-2 pl-3 opacity-60" style={{ color: "var(--text-muted)", borderColor: "var(--orange)" }}>Керування контентом платформи</p>
          </div>
          <Link
            href="/add"
            className="te-btn-orange px-5 py-3 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
          >
            <Plus size={14} /> ДОДАТИ ПІСНЮ
          </Link>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="te-surface p-6 flex flex-col gap-2" style={{ borderRadius: "1.5rem" }}>
            <div className="flex items-center gap-3 mb-2" style={{ color: "var(--orange)" }}>
              <Music size={24} />
              <span className="text-xs font-bold tracking-widest uppercase">Опубліковано</span>
            </div>
            <span className="text-4xl font-bold tracking-tighter" style={{ color: "var(--text)" }}>{published.length}</span>
          </div>

          <div className="te-surface p-6 flex flex-col gap-2" style={{ borderRadius: "1.5rem" }}>
            <div className="flex items-center gap-3 mb-2 text-blue-500">
              <EyeOff size={24} />
              <span className="text-xs font-bold tracking-widest uppercase">Чернетки</span>
            </div>
            <span className="text-4xl font-bold tracking-tighter" style={{ color: "var(--text)" }}>{drafts.length}</span>
          </div>

          <div className="te-surface p-6 flex flex-col gap-2" style={{ borderRadius: "1.5rem" }}>
            <div className="flex items-center gap-3 mb-2 text-gray-400">
              <Archive size={24} />
              <span className="text-xs font-bold tracking-widest uppercase">В архіві</span>
            </div>
            <span className="text-4xl font-bold tracking-tighter" style={{ color: "var(--text)" }}>{archived.length}</span>
          </div>
        </div>

        {/* Quick links */}
        <div className="mb-10">
          <Link
            href="/admin/artists"
            className="te-surface inline-flex items-center gap-3 px-6 py-4 te-pressable"
            style={{ borderRadius: "1.25rem" }}
          >
            <Users size={20} style={{ color: "var(--orange)" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Керування артистами</p>
              <p className="text-xs opacity-60" style={{ color: "var(--text-muted)" }}>Фото, жанр, біо</p>
            </div>
          </Link>
        </div>

        {/* Song table */}
        <div className="te-surface overflow-hidden" style={{ borderRadius: "1.5rem" }}>
          <table className="w-full text-left text-sm">
            <thead className="bg-[rgba(0,0,0,0.02)] border-b" style={{ borderColor: "rgba(0,0,0,0.05)", color: "var(--text-muted)" }}>
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Назва</th>
                <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Виконавець</th>
                <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Статус</th>
                <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Перегляди</th>
                <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)", color: "var(--text)" }}>
              {songs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center opacity-50">
                    Поки що немає пісень. Додайте першу!
                  </td>
                </tr>
              )}
              {songs.map((song) => (
                <tr key={song.id} className="hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                  <td className="px-6 py-4 font-bold whitespace-nowrap">
                    <Link href={`/songs/${song.slug}`} className="hover:underline">
                      {song.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium opacity-80 whitespace-nowrap">{song.artist}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={song.status} />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{song.views}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {song.status !== "published" && (
                        <form action={updateSongStatus}>
                          <input type="hidden" name="songId" value={song.id} />
                          <input type="hidden" name="status" value="published" />
                          <button
                            type="submit"
                            title="Опублікувати"
                            className="p-2 te-key rounded-lg opacity-60 hover:opacity-100 text-green-600"
                          >
                            <Eye size={16} />
                          </button>
                        </form>
                      )}
                      {song.status === "published" && (
                        <form action={updateSongStatus}>
                          <input type="hidden" name="songId" value={song.id} />
                          <input type="hidden" name="status" value="archived" />
                          <button
                            type="submit"
                            title="Архівувати"
                            className="p-2 te-key rounded-lg opacity-60 hover:opacity-100 text-yellow-600"
                          >
                            <Archive size={16} />
                          </button>
                        </form>
                      )}
                      <form action={deleteSong}>
                        <input type="hidden" name="songId" value={song.id} />
                        <button
                          type="submit"
                          title="Видалити"
                          className="p-2 te-key rounded-lg opacity-60 hover:opacity-100 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    published: { label: "Опубліковано", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    draft:     { label: "Чернетка",    color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
    archived:  { label: "Архів",       color: "#9ca3af", bg: "rgba(156,163,175,0.1)" },
    pending:   { label: "На перевірці",color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    rejected:  { label: "Відхилено",   color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  };
  const info = map[status] ?? { label: status, color: "#6b7280", bg: "rgba(107,114,128,0.1)" };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ color: info.color, background: info.bg }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: info.color, display: "inline-block" }} />
      {info.label}
    </span>
  );
}
