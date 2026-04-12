export const dynamic = "force-dynamic";

import { Navbar } from "@/shared/components/Navbar";
import { ArrowLeft, Plus, Eye, Archive, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { updateSongStatus, deleteSong } from "@/features/song/actions/admin";

export const metadata = { title: "Пісні — Адмінка | Diez" };

interface AdminSong {
  id: string;
  slug: string;
  title: string;
  artist: string;
  genre: string;
  difficulty: string;
  views: number;
  status: string;
  created_at: string;
}

export default async function AdminSongsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { data: songs } = await admin
    .from("songs")
    .select("id, slug, title, artist, genre, difficulty, views, status, created_at")
    .order("created_at", { ascending: false });

  const list = (songs ?? []) as AdminSong[];

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/admin" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Адмін-панель
        </Link>

        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
              Пісні
            </h1>
            <p className="text-sm opacity-60" style={{ color: "var(--text-muted)" }}>
              {list.length} пісень
            </p>
          </div>
          <Link
            href="/add"
            className="te-btn-orange px-5 py-3 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
          >
            <Plus size={14} /> ДОДАТИ ПІСНЮ
          </Link>
        </div>

        <div className="te-surface overflow-hidden" style={{ borderRadius: "1.5rem" }}>
          {list.length === 0 ? (
            <div className="p-12 text-center opacity-50" style={{ color: "var(--text-muted)" }}>
              Пісень ще немає. Додайте першу!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b" style={{ borderColor: "rgba(0,0,0,0.06)", color: "var(--text-muted)" }}>
                  <tr>
                    <th className="px-4 py-3 font-bold tracking-wider text-xs uppercase">Назва</th>
                    <th className="px-4 py-3 font-bold tracking-wider text-xs uppercase">Виконавець</th>
                    <th className="px-4 py-3 font-bold tracking-wider text-xs uppercase">Жанр</th>
                    <th className="px-4 py-3 font-bold tracking-wider text-xs uppercase">Складність</th>
                    <th className="px-4 py-3 font-bold tracking-wider text-xs uppercase">Статус</th>
                    <th className="px-4 py-3 font-bold tracking-wider text-xs uppercase">Перегляди</th>
                    <th className="px-4 py-3 text-right font-bold tracking-wider text-xs uppercase">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)", color: "var(--text)" }}>
                  {list.map((song) => (
                    <tr key={song.id} className="hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                      <td className="px-4 py-3 font-bold whitespace-nowrap max-w-[200px] truncate">
                        <Link href={`/songs/${song.slug}`} className="hover:underline">
                          {song.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 opacity-80 whitespace-nowrap">{song.artist}</td>
                      <td className="px-4 py-3 opacity-60 text-xs whitespace-nowrap">{song.genre ?? "—"}</td>
                      <td className="px-4 py-3">
                        <DifficultyBadge difficulty={song.difficulty} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={song.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs opacity-70">{song.views}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <Link
                            href={`/admin/songs/edit?id=${song.id}`}
                            title="Редагувати"
                            className="p-2 te-key rounded-lg opacity-50 hover:opacity-100"
                          >
                            <Pencil size={15} />
                          </Link>

                          {/* Publish / Archive toggle */}
                          {song.status !== "published" ? (
                            <form action={updateSongStatus}>
                              <input type="hidden" name="songId" value={song.id} />
                              <input type="hidden" name="status" value="published" />
                              <button type="submit" title="Опублікувати" className="p-2 te-key rounded-lg opacity-50 hover:opacity-100 hover:text-green-500">
                                <Eye size={15} />
                              </button>
                            </form>
                          ) : (
                            <form action={updateSongStatus}>
                              <input type="hidden" name="songId" value={song.id} />
                              <input type="hidden" name="status" value="archived" />
                              <button type="submit" title="Архівувати" className="p-2 te-key rounded-lg opacity-50 hover:opacity-100 hover:text-yellow-500">
                                <Archive size={15} />
                              </button>
                            </form>
                          )}

                          {/* Delete */}
                          <form action={deleteSong}>
                            <input type="hidden" name="songId" value={song.id} />
                            <button type="submit" title="Видалити" className="p-2 te-key rounded-lg opacity-50 hover:opacity-100 hover:text-red-500">
                              <Trash2 size={15} />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    easy:   { label: "Легка",    color: "#30D158", bg: "rgba(48,209,88,0.1)" },
    medium: { label: "Середня",  color: "#FF9F0A", bg: "rgba(255,159,10,0.1)" },
    hard:   { label: "Складна",  color: "#FF453A", bg: "rgba(255,69,58,0.1)" },
  };
  const d = map[difficulty] ?? { label: difficulty, color: "var(--text-muted)", bg: "transparent" };
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest" style={{ color: d.color, background: d.bg }}>
      {d.label}
    </span>
  );
}
