"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Archive, Trash2, RotateCcw, User } from "lucide-react";
import { AdminTable, AdminTh, AdminTr } from "@/shared/components/AdminTable";
import {
  archiveArtist,
  restoreArtist,
  deleteArtist,
  updateArtistPhoto,
  bulkArchiveArtists,
  bulkRestoreArtists,
  bulkDeleteArtists,
} from "@/features/artist/actions/admin";

interface AdminArtist {
  id: string;
  slug: string;
  name: string;
  photo_url: string | null;
  genre: string | null;
  archived_at: string | null;
}

interface Props {
  artists: AdminArtist[];
  tab: "active" | "archived";
}

export function ArtistsAdminTable({ artists, tab }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allChecked = artists.length > 0 && selected.size === artists.length;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(artists.map(a => a.id)));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkAction(action: (fd: FormData) => Promise<void>) {
    const fd = new FormData();
    fd.set("ids", Array.from(selected).join(","));
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
                onClick={() => bulkAction(bulkArchiveArtists)}
                disabled={isPending}
                className="te-key px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
              >
                <Archive size={13} /> В архів
              </button>
            ) : (
              <>
                <button
                  onClick={() => bulkAction(bulkRestoreArtists)}
                  disabled={isPending}
                  className="te-key px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
                >
                  <RotateCcw size={13} /> Відновити
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Видалити ${selected.size} виконавців назавжди?`)) {
                      bulkAction(bulkDeleteArtists);
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
        isEmpty={artists.length === 0}
        emptyMessage={tab === "archived" ? "Архів порожній" : "Виконавців ще немає. Додайте першого!"}
        headers={<>
          <AdminTh className="w-8">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="accent-orange-500"
            />
          </AdminTh>
          <AdminTh className="w-10" />
          <AdminTh>Виконавець</AdminTh>
          <AdminTh>URL фото</AdminTh>
          <AdminTh>Жанр</AdminTh>
          <AdminTh className="text-right">Дії</AdminTh>
        </>}
      >
        {artists.map((artist) => (
          <AdminTr key={artist.id} className={selected.has(artist.id) ? "bg-orange-50 dark:bg-orange-900/10" : ""}>
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={selected.has(artist.id)}
                onChange={() => toggleOne(artist.id)}
                className="accent-orange-500"
              />
            </td>
            <td className="px-4 py-3">
              <div className="w-10 h-10 rounded-full overflow-hidden te-inset flex-shrink-0 flex items-center justify-center">
                {artist.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.photo_url} alt={artist.name} className="object-cover w-full h-full" />
                ) : (
                  <User size={16} style={{ color: "var(--text-muted)" }} />
                )}
              </div>
            </td>
            <td className="px-4 py-3">
              <span className="font-bold">{artist.name}</span>
              <p className="font-mono text-xs opacity-40 mt-0.5">{artist.slug}</p>
            </td>
            <td className="px-4 py-3">
              <form action={updateArtistPhoto} className="flex items-center gap-2">
                <input type="hidden" name="artistId" value={artist.id} />
                <div className="te-inset px-3 py-1.5 flex-1" style={{ borderRadius: "0.75rem" }}>
                  <input
                    name="photo_url"
                    defaultValue={artist.photo_url ?? ""}
                    placeholder="https://..."
                    className="w-full bg-transparent outline-none text-xs font-mono"
                    style={{ color: "var(--text)", minWidth: 0 }}
                  />
                </div>
                <button
                  type="submit"
                  className="te-key px-3 py-1.5 text-xs font-bold tracking-widest shrink-0"
                  style={{ borderRadius: "0.75rem", color: "var(--orange)" }}
                >
                  ОК
                </button>
              </form>
            </td>
            <td className="px-4 py-3 opacity-60 text-xs">{artist.genre ?? "—"}</td>
            <td className="px-4 py-3">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/admin/artists/edit?id=${artist.id}`}
                  title="Редагувати"
                  className="p-2 te-key rounded-lg opacity-50 hover:opacity-100"
                >
                  <Pencil size={14} />
                </Link>

                {tab === "active" ? (
                  <form action={archiveArtist}>
                    <input type="hidden" name="artistId" value={artist.id} />
                    <button
                      type="submit"
                      title="В архів"
                      className="p-2 te-key rounded-lg opacity-50 hover:opacity-100"
                    >
                      <Archive size={14} />
                    </button>
                  </form>
                ) : (
                  <>
                    <form action={restoreArtist}>
                      <input type="hidden" name="artistId" value={artist.id} />
                      <button type="submit" title="Відновити" className="p-2 te-key rounded-lg opacity-50 hover:opacity-100">
                        <RotateCcw size={14} />
                      </button>
                    </form>
                    <form action={deleteArtist} onSubmit={(e) => {
                      if (!confirm("Видалити назавжди?")) e.preventDefault();
                    }}>
                      <input type="hidden" name="artistId" value={artist.id} />
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
