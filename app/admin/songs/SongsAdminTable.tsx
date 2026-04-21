"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pencil, Eye, Archive, Trash2, RotateCcw, ArrowUp, ArrowDown } from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { DifficultyBadge } from "@/shared/components/DifficultyBadge";
import { AdminTable, AdminTh, AdminTr } from "@/shared/components/AdminTable";
import { TeButton } from "@/shared/components/TeButton";
import { updateSongStatus, deleteSong, bulkUpdateSongStatus, bulkDeleteSongs } from "@/features/song/actions/admin";

interface AdminSong {
  id: string;
  slug: string;
  title: string;
  artist: string;
  genre: string;
  difficulty: string;
  views: number;
  source_popularity: number | null;
  source_views: number | null;
  status: string;
  created_at: string;
}

function formatPopularity(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeUa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!isFinite(diff) || diff < 0) return "щойно";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "щойно";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} хв тому`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} год тому`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} дн тому`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} міс тому`;
  const yr = Math.floor(day / 365);
  return `${yr} р тому`;
}

interface Props {
  songs: AdminSong[];
  tab: "active" | "archived";
  sort: string;
  dir: "asc" | "desc";
  tabParam: "published" | "draft" | "archived";
}

function SortLink({
  col, label, sort, dir, tabParam, title,
}: { col: string; label: React.ReactNode; sort: string; dir: "asc" | "desc"; tabParam: string; title?: string }) {
  const active = sort === col;
  const nextDir = active && dir === "desc" ? "asc" : "desc";
  const current = useSearchParams();
  const params = new URLSearchParams(current.toString());
  if (tabParam !== "published") params.set("tab", tabParam); else params.delete("tab");
  params.set("sort", col);
  params.set("dir", nextDir);
  params.delete("page");
  const qs = params.toString();
  return (
    <Link href={`/admin/songs${qs ? `?${qs}` : ""}`} title={title} className="inline-flex items-center gap-1 hover:opacity-100 transition-opacity">
      {label}
      {active && (dir === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
    </Link>
  );
}

export function SongsAdminTable({ songs, tab, sort, dir, tabParam }: Props) {
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
              <>
                <TeButton
                  shape="pill"
                  icon={Eye}
                  iconSize={13}
                  onClick={() => bulkAction(bulkUpdateSongStatus, { status: "published" })}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
                >
                  Опублікувати
                </TeButton>
                <TeButton
                  shape="pill"
                  icon={Archive}
                  iconSize={13}
                  onClick={() => bulkAction(bulkUpdateSongStatus, { status: "archived" })}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
                >
                  В архів
                </TeButton>
              </>
            ) : (
              <>
                <TeButton
                  shape="pill"
                  icon={RotateCcw}
                  iconSize={13}
                  onClick={() => bulkAction(bulkUpdateSongStatus, { status: "published" })}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
                >
                  Відновити
                </TeButton>
                <TeButton
                  shape="pill"
                  icon={Trash2}
                  iconSize={13}
                  onClick={() => {
                    if (confirm(`Видалити ${selected.size} пісень назавжди?`)) {
                      bulkAction(bulkDeleteSongs, {});
                    }
                  }}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  style={{ borderRadius: "0.75rem", color: "var(--text-red, #ef4444)" }}
                >
                  Видалити
                </TeButton>
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
          <AdminTh><SortLink col="title" label="Назва" sort={sort} dir={dir} tabParam={tabParam} /></AdminTh>
          <AdminTh><SortLink col="artist" label="Виконавець" sort={sort} dir={dir} tabParam={tabParam} /></AdminTh>
          <AdminTh><SortLink col="genre" label="Жанр" sort={sort} dir={dir} tabParam={tabParam} /></AdminTh>
          <AdminTh><SortLink col="difficulty" label="Складність" sort={sort} dir={dir} tabParam={tabParam} /></AdminTh>
          <AdminTh>Статус</AdminTh>
          <AdminTh><SortLink col="views" label="Перегляди" sort={sort} dir={dir} tabParam={tabParam} /></AdminTh>
          <AdminTh title="Популярність за Deezer rank"><SortLink col="source_popularity" label="Джерело" sort={sort} dir={dir} tabParam={tabParam} /></AdminTh>
          <AdminTh className="w-12"><SortLink col="source_views" title="Перегляди на джерелі" label={<Eye size={13} />} sort={sort} dir={dir} tabParam={tabParam} /></AdminTh>
          <AdminTh><SortLink col="created_at" label="Додано" sort={sort} dir={dir} tabParam={tabParam} /></AdminTh>
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
            <td className="px-4 py-3 font-mono text-xs opacity-70" title={song.source_popularity?.toLocaleString() ?? ""}>{formatPopularity(song.source_popularity)}</td>
            <td className="px-4 py-3 font-mono text-xs opacity-70" title={song.source_views?.toLocaleString() ?? ""}>{formatPopularity(song.source_views)}</td>
            <td className="px-4 py-3 text-xs opacity-70 whitespace-nowrap" title={new Date(song.created_at).toLocaleString("uk-UA")}>{formatRelativeUa(song.created_at)}</td>
            <td className="px-4 py-3">
              <div className="flex items-center justify-end gap-1">
                <TeButton
                  shape="pill"
                  href={`/admin/songs/edit?id=${song.id}`}
                  icon={Pencil}
                  iconSize={14}
                  title="Редагувати"
                  className="p-2 rounded-lg opacity-50 hover:opacity-100"
                />

                {tab === "active" ? (
                  <form action={updateSongStatus}>
                    <input type="hidden" name="songId" value={song.id} />
                    <input type="hidden" name="status" value={song.status === "published" ? "archived" : "published"} />
                    <TeButton
                      shape="pill"
                      type="submit"
                      icon={song.status === "published" ? Archive : Eye}
                      iconSize={14}
                      title={song.status === "published" ? "В архів" : "Опублікувати"}
                      className="p-2 rounded-lg opacity-50 hover:opacity-100"
                    />
                  </form>
                ) : (
                  <>
                    <form action={updateSongStatus}>
                      <input type="hidden" name="songId" value={song.id} />
                      <input type="hidden" name="status" value="published" />
                      <TeButton
                        shape="pill"
                        type="submit"
                        icon={RotateCcw}
                        iconSize={14}
                        title="Відновити"
                        className="p-2 rounded-lg opacity-50 hover:opacity-100"
                      />
                    </form>
                    <form action={deleteSong} onSubmit={(e) => {
                      if (!confirm("Видалити назавжди?")) e.preventDefault();
                    }}>
                      <input type="hidden" name="songId" value={song.id} />
                      <TeButton
                        shape="pill"
                        type="submit"
                        icon={Trash2}
                        iconSize={14}
                        title="Видалити назавжди"
                        className="p-2 rounded-lg opacity-50 hover:opacity-100 hover:text-red-500"
                      />
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
