"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Eye, Archive, Trash2, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { DifficultyBadge } from "@/shared/components/DifficultyBadge";
import { AdminTable, AdminTh, AdminTr } from "@/shared/components/AdminTable";
import { updateSongStatus, deleteSong, bulkUpdateSongStatus, bulkDeleteSongs } from "@/features/song/actions/admin";

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

interface Props {
  songs: AdminSong[];
  tab: "active" | "archived";
}

export function SongsAdminTable({ songs, tab }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allChecked = songs.length > 0 && selected.size === songs.length;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(songs.map(s => s.id)));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkAction(action: (fd: FormData) => Promise<void>, extra: Record<string, string>) {
    const fd = new FormData();
    fd.set("ids", Array.from(selected).join(","));
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    startTransition(async () => {
      await action(fd);
      setSelected(new Set());
    });
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="te-surface mb-3 px-4 py-2.5 flex items-center gap-3 flex-wrap"
          style={{ borderRadius: "1rem" }}
        >
          <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
            Вибрано: {selected.size}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {tab === "active" ? (
              <button
                onClick={() => bulkAction(bulkUpdateSongStatus, { status: "archived" })}
                disabled={isPending}
                className="te-key px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
              >
                <Archive size={13} /> В архів
              </button>
            ) : (
              <>
                <button
                  onClick={() => bulkAction(bulkUpdateSongStatus, { status: "published" })}
                  disabled={isPending}
                  className="te-key px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
                >
                  <RotateCcw size={13} /> Відновити
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Видалити ${selected.size} пісень назавжди?`)) {
                      bulkAction(bulkDeleteSongs, {});
                    }
                  }}
                  disabled={isPending}
                  className="te-key px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  style={{ borderRadius: "0.75rem", color: "var(--text-red, #ef4444)" }}
                >
                  <Trash2 size={13} /> Видалити
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <AdminTable
        isEmpty={songs.length === 0}
        emptyMessage={tab === "archived" ? "Архів порожній" : "Пісень ще немає. Додайте першу!"}
        headers={<>
          <AdminTh className="w-8">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="accent-orange-500"
            />
          </AdminTh>
          <AdminTh>Назва</AdminTh>
          <AdminTh>Виконавець</AdminTh>
          <AdminTh>Жанр</AdminTh>
          <AdminTh>Складність</AdminTh>
          <AdminTh>Статус</AdminTh>
          <AdminTh>Перегляди</AdminTh>
          <AdminTh className="text-right">Дії</AdminTh>
        </>}
      >
        {songs.map((song) => (
          <AdminTr key={song.id} className={selected.has(song.id) ? "bg-orange-50 dark:bg-orange-900/10" : ""}>
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={selected.has(song.id)}
                onChange={() => toggleOne(song.id)}
                className="accent-orange-500"
              />
            </td>
            <td className="px-4 py-3 font-bold whitespace-nowrap max-w-[200px] truncate">
              <Link href={`/songs/${song.slug}`} className="hover:underline">
                {song.title}
              </Link>
            </td>
            <td className="px-4 py-3 opacity-80 whitespace-nowrap">{song.artist}</td>
            <td className="px-4 py-3 opacity-60 text-xs whitespace-nowrap">{song.genre ?? "—"}</td>
            <td className="px-4 py-3"><DifficultyBadge difficulty={song.difficulty} /></td>
            <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={song.status} /></td>
            <td className="px-4 py-3 font-mono text-xs opacity-70">{song.views}</td>
            <td className="px-4 py-3">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/admin/songs/edit?id=${song.id}`}
                  title="Редагувати"
                  className="p-2 te-key rounded-lg opacity-50 hover:opacity-100"
                >
                  <Pencil size={14} />
                </Link>

                {tab === "active" ? (
                  <form action={updateSongStatus}>
                    <input type="hidden" name="songId" value={song.id} />
                    <input type="hidden" name="status" value={song.status === "published" ? "archived" : "published"} />
                    <button
                      type="submit"
                      title={song.status === "published" ? "В архів" : "Опублікувати"}
                      className="p-2 te-key rounded-lg opacity-50 hover:opacity-100"
                    >
                      {song.status === "published" ? <Archive size={14} /> : <Eye size={14} />}
                    </button>
                  </form>
                ) : (
                  <>
                    <form action={updateSongStatus}>
                      <input type="hidden" name="songId" value={song.id} />
                      <input type="hidden" name="status" value="published" />
                      <button type="submit" title="Відновити" className="p-2 te-key rounded-lg opacity-50 hover:opacity-100">
                        <RotateCcw size={14} />
                      </button>
                    </form>
                    <form action={deleteSong} onSubmit={(e) => {
                      if (!confirm("Видалити назавжди?")) e.preventDefault();
                    }}>
                      <input type="hidden" name="songId" value={song.id} />
                      <button type="submit" title="Видалити назавжди" className="p-2 te-key rounded-lg opacity-50 hover:opacity-100 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </td>
          </AdminTr>
        ))}
      </AdminTable>
    </div>
  );
}
