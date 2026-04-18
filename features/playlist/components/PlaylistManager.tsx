"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  GripVertical,
  Globe,
  Link as LinkIcon,
  Lock,
  Pencil,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { DifficultyBadge } from "@/shared/components/DifficultyBadge";
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
  { value: "public", label: "Публічний", icon: Globe },
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
    });
  };

  const changeVisibility = (v: PlaylistVisibility) => {
    setVisibility(v);
    startTransition(async () => {
      await updatePlaylist(playlist.id, { visibility: v });
      router.refresh();
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
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
      <div className="te-surface p-6" style={{ borderRadius: "1.5rem" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {editingName && !playlist.isDefault ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") { setName(playlist.name); setEditingName(false); }
                  }}
                  className="te-inset px-3 py-2 rounded-xl bg-transparent outline-none text-2xl font-bold tracking-tighter w-full max-w-md"
                  style={{ color: "var(--text)" }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter" style={{ color: "var(--text)" }}>
                  {name}
                </h1>
                {!playlist.isDefault && (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    aria-label="Перейменувати"
                    className="opacity-60 hover:opacity-100"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm font-medium mt-2" style={{ color: "var(--text-muted)" }}>
              {songs.length} {pluralSongs(songs.length)}
              {playlist.isDefault && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--orange)" }}>
                  Дефолт
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TeButton
              shape="pill"
              onClick={handleCopy}
              disabled={!canShare}
              title={canShare ? "Скопіювати посилання" : "Змініть видимість, щоб поділитися"}
              className="px-4 py-2 text-xs font-bold"
              style={!canShare ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            >
              {copied ? <Check size={14} strokeWidth={2} /> : <Share2 size={14} strokeWidth={2} />}
              {copied ? "Скопійовано" : "Поділитися"}
            </TeButton>
            {!playlist.isDefault && (
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Видалити список"
                className="inline-flex items-center justify-center rounded-full hover:bg-red-500/10"
                style={{ width: 36, height: 36, color: "#e11d48" }}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Visibility selector */}
        <div className="mt-6">
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--text-muted)" }}>
            Видимість
          </label>
          <div className="flex gap-1 max-w-md">
            {VIS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => changeVisibility(opt.value)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={{
                    background: active ? "rgba(255,136,0,0.1)" : "transparent",
                    color: active ? "var(--orange)" : "var(--text-muted)",
                  }}
                >
                  <Icon size={12} strokeWidth={2} />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {canShare && (
            <div className="mt-3 te-inset px-3 py-2 rounded-lg flex items-center gap-2 max-w-md">
              <LinkIcon size={12} style={{ color: "var(--text-muted)" }} />
              <code className="flex-1 text-xs truncate" style={{ color: "var(--text-muted)" }}>{shareUrl}</code>
              <button type="button" onClick={handleCopy} aria-label="Копіювати" style={{ color: "var(--text-muted)" }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Songs list */}
      {songs.length === 0 ? (
        <div className="te-surface p-10 text-center" style={{ borderRadius: "1.5rem" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            У цьому списку поки немає пісень.
          </p>
          <Link href="/songs" className="inline-block mt-3 font-bold underline" style={{ color: "var(--orange)" }}>
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
                className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                style={{
                  background: song.coverImage
                    ? undefined
                    : `linear-gradient(135deg, ${song.coverColor ?? "#C8D5E8"}CC, ${song.coverColor ?? "#C8D5E8"}66)`,
                }}
              >
                {song.coverImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover" />
                )}
              </div>
              <Link href={`/songs/${song.slug}`} className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{song.title}</div>
                <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{song.artist}</div>
              </Link>
              <DifficultyBadge difficulty={song.difficulty} />
              <button
                type="button"
                onClick={() => removeSong(song.id)}
                aria-label="Прибрати"
                className="inline-flex items-center justify-center rounded-full hover:bg-red-500/10"
                style={{ width: 32, height: 32, color: "var(--text-muted)" }}
              >
                <X size={14} strokeWidth={2} />
              </button>
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
