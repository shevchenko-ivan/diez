"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Pencil, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { SongCover } from "@/shared/components/SongCover";
import { useLiteMode } from "@/shared/components/LiteModeProvider";
import { SongStatusBadge, statusAccent } from "./SongStatusBadge";
import { deleteMySubmission } from "@/features/song/actions/submit";

// Card for a song the current user submitted — shown on their profile and the
// home page. Deliberately framed differently from catalogue SongCards (a padded
// surface with a status-coloured top accent, status tag *under* the title, and
// owner actions) so it instantly reads as "my song", not a published catalogue
// entry. Drafts get a dashed frame + dimmed cover to look unfinished.

export interface MySongCardProps {
  id: string;
  slug: string;
  title: string;
  artist: string;
  status: string;
  coverImage?: string;
  coverColor?: string;
}

export function MySongCard({ id, slug, title, artist, status, coverImage, coverColor }: MySongCardProps) {
  const lite = useLiteMode();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPublished = status === "published";
  const isDraft = status === "draft";
  const editHref = `/profile/songs/${id}/edit`;
  const primaryHref = isPublished ? `/songs/${slug}` : editHref;
  const fallbackColor = coverColor || "#C8D5E8";
  const accent = statusAccent(status);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteMySubmission(id);
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
      setMenuOpen(false);
      alert(res.message ?? "Не вдалося видалити пісню.");
    }
  }

  return (
    <div
      className="group relative te-surface transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        borderRadius: "1.1rem",
        padding: 10,
        borderTop: `3px solid ${accent}`,
        ...(isDraft ? { border: `1px dashed ${accent}66`, borderTop: `3px dashed ${accent}` } : {}),
      }}
    >
      {/* Cover */}
      <Link href={primaryHref} className="block focus-visible:outline-none">
        <div
          className="relative aspect-square overflow-hidden"
          style={{
            borderRadius: "0.7rem",
            background: `linear-gradient(145deg, ${fallbackColor}CC, ${fallbackColor}66)`,
            boxShadow: "inset 0 0 0 1px var(--border)",
            opacity: isDraft ? 0.78 : 1,
          }}
        >
          <SongCover
            src={lite ? null : coverImage}
            alt={`Обкладинка пісні «${title}» — ${artist}`}
            title={`${title} — ${artist}`}
            fill
            sizes="(max-width: 1024px) 50vw, 360px"
            iconSize={40}
          />
        </div>
      </Link>

      {/* Actions menu — top-right corner of the card */}
      <div ref={menuRef} className="absolute z-20" style={{ top: 16, right: 16 }}>
        <button
          type="button"
          onClick={() => { setMenuOpen((v) => !v); setConfirming(false); }}
          aria-label="Дії"
          className="inline-flex items-center justify-center rounded-full"
          style={{ width: 28, height: 28, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", color: "#FFF" }}
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-1 te-surface overflow-hidden"
            style={{ minWidth: 168, borderRadius: "0.85rem", boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}
          >
            {!confirming ? (
              <>
                <Link
                  href={editHref}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                  style={{ color: "var(--text)" }}
                >
                  <Pencil size={15} /> Редагувати
                </Link>
                {isPublished && (
                  <Link
                    href={`/songs/${slug}`}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                    style={{ color: "var(--text)" }}
                  >
                    <ExternalLink size={15} /> Переглянути
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-red-500/10 text-red-500"
                >
                  <Trash2 size={15} /> Видалити
                </button>
              </>
            ) : (
              <div className="p-3 space-y-2.5">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Видалити цю пісню? Дію не скасувати.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white disabled:opacity-60"
                    style={{ background: "#dc3c3c" }}
                  >
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Видалити
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg te-pressable"
                    style={{ color: "var(--text-mid)" }}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title + status tag + artist (all below the cover, always legible) */}
      <Link href={primaryHref} className="block mt-2.5 px-0.5 focus-visible:outline-none">
        <p className="font-semibold text-sm truncate" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
          {title || "Без назви"}
        </p>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1.5">
          <SongStatusBadge status={status} style={{ flexShrink: 0 }} />
          <span className="text-xs truncate min-w-0 max-w-full" style={{ color: "var(--text-muted)" }}>
            {artist || "—"}
          </span>
        </div>
      </Link>
    </div>
  );
}
