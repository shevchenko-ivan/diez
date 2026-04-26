"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  Copy,
  GripVertical,
  Link as LinkIcon,
  Lock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { SegmentedTabs } from "@/shared/components/SegmentedTabs";
import { toast } from "@/shared/components/Toaster";
import { useHaptics } from "@/shared/hooks/useHaptics";
import {
  deletePlaylist,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
  updatePlaylist,
} from "../actions/playlists";
import type { PlaylistVisibility } from "../types";

interface Song {
  id: string;
  slug: string;
  title: string;
  artist: string;
  difficulty: "easy" | "medium" | "hard";
  chords: string[];
  views: number;
  coverImage?: string;
  coverColor?: string;
  variantId?: string | null;
}

interface Props {
  playlist: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    visibility: PlaylistVisibility;
    isDefault: boolean;
  };
  initialSongs: Song[];
}

const VIS_OPTIONS: Array<{ value: PlaylistVisibility; label: string; icon: typeof Lock }> = [
  { value: "private", label: "Приватний", icon: Lock },
  { value: "unlisted", label: "За посиланням", icon: LinkIcon },
];

export function PlaylistManager({ playlist, initialSongs }: Props) {
  const router = useRouter();
  const [songs, setSongs] = useState(initialSongs);
  const [name, setName] = useState(playlist.name);
  const [editingName, setEditingName] = useState(false);
  const [visibility, setVisibility] = useState(playlist.visibility);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const { trigger } = useHaptics();

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/lists/${playlist.slug}` : `/lists/${playlist.slug}`;
  const canShare = visibility !== "private";

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === playlist.name) {
      setEditingName(false);
      setName(playlist.name);
      return;
    }
    setEditingName(false);
    startTransition(async () => {
      await updatePlaylist(playlist.id, { name: trimmed });
      router.refresh();
      toast("Назву збережено");
    });
  };

  const changeVisibility = (v: PlaylistVisibility) => {
    setVisibility(v);
    startTransition(async () => {
      await updatePlaylist(playlist.id, { visibility: v });
      router.refresh();
      toast("Видимість змінено");
    });
  };

  const removeSong = (songId: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    startTransition(async () => {
      await removeSongFromPlaylist(playlist.id, songId);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Видалити список "${playlist.name}"? Пісні залишаться в каталозі.`)) return;
    startTransition(async () => {
      const res = await deletePlaylist(playlist.id);
      if (res.ok) router.push("/profile/lists");
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = shareUrl;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast("Посилання скопійовано");
  };

  const onDragStart = (i: number) => setDragIndex(i);
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setSongs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(i, 0, moved);
      return next;
    });
    setDragIndex(i);
  };
  const onDragEnd = () => {
    const currentIds = songs.map((s) => s.id);
    const originalIds = initialSongs.map((s) => s.id);
    const changed = currentIds.some((id, i) => id !== originalIds[i]);
    setDragIndex(null);
    if (!changed) return;
    startTransition(async () => {
      await reorderPlaylistSongs(playlist.id, currentIds);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="te-surface p-4 flex flex-col gap-3" style={{ borderRadius: "1.5rem" }}>
        <div className="flex items-start gap-3">
          {/* Title */}
          <div className="min-w-0 flex-1">
            {editingName && !playlist.isDefault ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") { setName(playlist.name); setEditingName(false); }
                }}
                className="te-inset px-3 py-1 rounded-xl bg-transparent outline-none text-xl font-bold tracking-tighter"
                style={{ color: "var(--text)" }}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <h1 className="text-2xl font-bold uppercase tracking-tighter" style={{ color: "var(--text)" }}>
                  {name}
                </h1>
                {!playlist.isDefault && (
                  <button
                    type="button"
                    onClick={() => { trigger("selection"); setEditingName(true); }}
                    aria-label="Перейменувати"
                    className="opacity-50 hover:opacity-100"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
              {songs.length} {pluralSongs(songs.length)}
              {playlist.isDefault && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--orange-text)" }}>
                  Дефолт
                </span>
              )}
            </p>
          </div>

          {/* Delete */}
          {!playlist.isDefault && (
            <TeButton
              icon={Trash2}
              size="sm"
              tone="red"
              onClick={handleDelete}
              aria-label="Видалити список"
            />
          )}
        </div>

        {/* Visibility — full-width segmented tabs (match /chords instrument switcher) */}
        <SegmentedTabs
          options={VIS_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
          value={visibility}
          onChange={changeVisibility}
          ariaLabel="Видимість"
        />

        {/* URL — full-width input + separate copy button */}
        {canShare && (
          <div className="flex items-center gap-2 w-full">
            <div className="te-inset px-3 py-2 flex items-center gap-2 flex-1 min-w-0" style={{ borderRadius: "0.75rem" }}>
              <LinkIcon size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <code className="flex-1 min-w-0 text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{shareUrl}</code>
            </div>
            <TeButton
              icon={copied ? Check : Copy}
              size="sm"
              onClick={handleCopy}
              aria-label="Копіювати"
              active={copied}
            />
          </div>
        )}
      </div>

      {/* Songs list */}
      {songs.length === 0 ? (
        <div className="te-surface p-10 text-center" style={{ borderRadius: "1.5rem" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            У цьому списку поки немає пісень.
          </p>
          <Link href="/songs" className="inline-block mt-3 font-bold underline" style={{ color: "var(--orange-text)" }}>
            Знайдіть пісню →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {songs.map((song, i) => (
            <li
              key={song.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              className="te-surface flex items-center gap-3 p-3"
              style={{
                borderRadius: "1rem",
                opacity: dragIndex === i ? 0.5 : 1,
                cursor: "grab",
              }}
            >
              <span style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                <GripVertical size={16} />
              </span>
              <div
                className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  background: song.coverImage
                    ? undefined
                    : `linear-gradient(135deg, ${song.coverColor ?? "#C8D5E8"}CC, ${song.coverColor ?? "#C8D5E8"}66)`,
                }}
              >
                {song.coverImage && (
                  <Image src={song.coverImage} alt={song.title} width={64} height={64} className="w-full h-full object-cover" />
                )}
              </div>
              <Link
                href={song.variantId ? `/songs/${song.slug}?v=${song.variantId}` : `/songs/${song.slug}`}
                className="flex-1 min-w-0"
              >
                <div className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{song.title}</div>
                <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{song.artist}</div>
              </Link>
              <TeButton
                icon={X}
                size="sm"
                tone="red"
                onClick={() => removeSong(song.id)}
                aria-label="Прибрати"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function pluralSongs(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "пісня";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "пісні";
  return "пісень";
}
