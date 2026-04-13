export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { AdminTable, AdminTh, AdminTr } from "@/shared/components/AdminTable";
import { ArrowLeft, Plus, Eye, Archive, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { DifficultyBadge } from "@/shared/components/DifficultyBadge";
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
    <PageShell footer={false}>
      <Link href="/admin" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
        <ArrowLeft size={14} /> Адмін-панель
      </Link>

      <PageHeader
        title="Пісні"
        subtitle={`${list.length} пісень`}
        action={
          <Link
            href="/add"
            className="te-btn-orange px-5 py-3 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
          >
            <Plus size={14} /> ДОДАТИ ПІСНЮ
          </Link>
        }
      />

      <AdminTable
          isEmpty={list.length === 0}
          emptyMessage="Пісень ще немає. Додайте першу!"
          headers={<>
            <AdminTh>Назва</AdminTh>
            <AdminTh>Виконавець</AdminTh>
            <AdminTh>Жанр</AdminTh>
            <AdminTh>Складність</AdminTh>
            <AdminTh>Статус</AdminTh>
            <AdminTh>Перегляди</AdminTh>
            <AdminTh className="text-right">Дії</AdminTh>
          </>}
        >
          {list.map((song) => (
            <AdminTr key={song.id}>
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
                  <Link
                    href={`/admin/songs/edit?id=${song.id}`}
                    title="Редагувати"
                    className="p-2 te-key rounded-lg opacity-50 hover:opacity-100"
                  >
                    <Pencil size={15} />
                  </Link>
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
                  <form action={deleteSong}>
                    <input type="hidden" name="songId" value={song.id} />
                    <button type="submit" title="Видалити" className="p-2 te-key rounded-lg opacity-50 hover:opacity-100 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </form>
                </div>
              </td>
            </AdminTr>
          ))}
        </AdminTable>
    </PageShell>
  );
}

