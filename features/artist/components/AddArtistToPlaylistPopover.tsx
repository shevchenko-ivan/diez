"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Trash2, X } from "lucide-react";
import {
  getPlaylistsForArtist,
  setArtistPlaylists,
} from "@/features/playlist/actions/artist-playlists";
import { createPlaylist, deletePlaylist } from "@/features/playlist/actions/playlists";
import type { PlaylistSummary } from "@/features/playlist/types";
import { ToggleKnob } from "@/shared/components/ToggleKnob";
import { BottomSheet } from "@/shared/components/BottomSheet";
import { TeButton } from "@/shared/components/TeButton";

// Visual + behavioral twin of AddToPlaylistPopover, but for the artist-level
// heart. Each toggle encodes "all of the artist's songs live in this list".
// Flipping it ON tops the list up with missing songs; flipping it OFF removes
// every song by the artist from that list. Changes are batched and saved on
// close, exactly like the per-song picker.

interface Props {
  artistSlug: string;
  artistName: string;
  /** Total published songs by this artist — used for freshly-created lists. */
  artistSongsCount?: number;
  anchorRect: DOMRect;
  initialLists?: PlaylistSummary[] | null;
  onClose: () => void;
  onSavedChange: (saved: boolean) => void;
}

const POPOVER_WIDTH = 288;
const FADE = 20;
const GAP = 8;

function buildFadeMask(top: boolean, bottom: boolean): string {
  if (!top && !bottom) return "none";
  const start = top ? `transparent 0, black ${FADE}px` : `black 0`;
  const end = bottom ? `black calc(100% - ${FADE}px), transparent 100%` : `black 100%`;
  return `linear-gradient(to bottom, ${start}, ${end})`;
}

export function AddArtistToPlaylistPopover({
  artistSlug,
  artistName,
  artistSongsCount = 0,
  anchorRect,
  initialLists,
  onClose,
  onSavedChange,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [lists, setLists] = useState<PlaylistSummary[] | null>(initialLists ?? null);
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (!initialLists) return new Set();
    return new Set(initialLists.filter((p) => p.hasSong).map((p) => p.id));
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: "bottom" | "top" }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlaylistSummary | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const initialSelectedRef = useRef<Set<string> | null>(null);
  const selectedRef = useRef<Set<string>>(selected);
  selectedRef.current = selected;
  const confirmDeleteRef = useRef<PlaylistSummary | null>(null);
  confirmDeleteRef.current = confirmDelete;

  const closeWithSave = () => {
    const initial = initialSelectedRef.current;
    const current = selectedRef.current;
    if (!initial) {
      onClose();
      return;
    }
    const toAdd = [...current].filter((id) => !initial.has(id));
    const toRemove = [...initial].filter((id) => !current.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) {
      onClose();
      return;
    }
    setArtistPlaylists(artistSlug, toAdd, toRemove).then((res) => {
      if (res.ok) onSavedChange(current.size > 0);
    });
    onClose();
  };

  const updateFades = () => {
    const el = listRef.current;
    if (!el) return;
    setFadeTop(el.scrollTop > 2);
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };

  useEffect(() => { updateFades(); }, [lists, showCreate]);

  useEffect(() => {
    setMounted(true);
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) {
      // Lock body scroll while bottom sheet is open.
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const prevOverflow = document.body.style.overflow;
      const prevPadding = document.body.style.paddingRight;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
      const id = requestAnimationFrame(() => setSheetVisible(true));
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (confirmDeleteRef.current) return;
        closeWithSave();
      };
      window.addEventListener("keydown", onKey);
      return () => {
        cancelAnimationFrame(id);
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPadding;
      };
    }
    // Desktop: anchor-tracked popover — close on outside scroll/resize.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmDeleteRef.current) return;
      closeWithSave();
    };
    const onScroll = (e: Event) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (confirmDeleteRef.current) return;
      closeWithSave();
    };
    const onResize = () => {
      if (confirmDeleteRef.current) return;
      closeWithSave();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!mounted || isMobile) return;
    const popH = popoverRef.current?.offsetHeight ?? 320;
    const roomBelow = window.innerHeight - anchorRect.bottom;
    const placement: "bottom" | "top" =
      roomBelow > popH + GAP || anchorRect.top < popH + GAP ? "bottom" : "top";
    let left = anchorRect.left + anchorRect.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8));
    const top = placement === "bottom" ? anchorRect.bottom + GAP : anchorRect.top - popH - GAP;
    setPos({ top, left, placement });
  }, [mounted, anchorRect, lists, showCreate, isMobile]);

  useEffect(() => {
    const bootstrap = (data: PlaylistSummary[]) => {
      setLists(data);
      const already = new Set(data.filter((p) => p.hasSong).map((p) => p.id));
      initialSelectedRef.current = new Set(already);
      setSelected(already);
    };
    if (initialLists) {
      bootstrap(initialLists);
      return;
    }
    getPlaylistsForArtist(artistSlug).then(bootstrap);
  }, [artistSlug, initialLists]);

  useEffect(() => {
    if (!mounted || isMobile) return;
    const onDown = (e: MouseEvent) => {
      if (confirmDeleteRef.current) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closeWithSave();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isMobile]);

  const requestDelete = (p: PlaylistSummary) => {
    if (p.isDefault) return;
    // Empty list — delete immediately, no confirmation needed.
    if (p.songCount === 0) {
      doDelete(p.id);
      return;
    }
    setConfirmDelete(p);
  };

  const doDelete = async (id: string) => {
    setDeletePending(true);
    const res = await deletePlaylist(id);
    setDeletePending(false);
    if (!res.ok) return;
    setLists((prev) => (prev ?? []).filter((p) => p.id !== id));
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      onSavedChange(next.size > 0);
      return next;
    });
    if (initialSelectedRef.current) initialSelectedRef.current.delete(id);
    setConfirmDelete(null);
  };

  const toggle = (id: string) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSavedChange(next.size > 0);
      return next;
    });
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const res = await createPlaylist({ name, visibility: "private" });
      if (!res.ok) {
        setError(res.message ?? "Не вдалося створити список");
        return;
      }
      setLists((prev) => [
        ...(prev ?? []),
        {
          id: res.data.id,
          name: res.data.name,
          isDefault: false,
          visibility: res.data.visibility,
          hasSong: true,
          // Newly-created list is about to receive every artist song on save.
          songCount: artistSongsCount,
        },
      ]);
      setSelected((prev) => {
        const next = new Set(prev).add(res.data.id);
        onSavedChange(next.size > 0);
        return next;
      });
      setNewName("");
      setShowCreate(false);
      setScrollToId(res.data.id);
    });
  };

  useEffect(() => {
    if (!scrollToId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-playlist-id="${scrollToId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setScrollToId(null);
  }, [scrollToId, lists]);

  if (!mounted) return null;

  const desktopStyle: React.CSSProperties = {
    position: "fixed",
    top: pos.top,
    left: pos.left,
    width: POPOVER_WIDTH,
    zIndex: 60,
    borderRadius: "1rem",
    boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
  };
  const mobileStyle: React.CSSProperties = {
    borderTopLeftRadius: "1.5rem",
    borderTopRightRadius: "1.5rem",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: "100%",
    maxWidth: "28rem",
    transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
    transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
  };

  const sheet = (
    <div
      ref={popoverRef}
      className="te-surface flex flex-col gap-3 p-4"
      role="dialog"
      style={isMobile ? mobileStyle : desktopStyle}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {isMobile && (
        <div
          aria-hidden
          className="self-center rounded-full -mt-1 mb-1"
          style={{ width: 36, height: 4, background: "var(--text-muted)", opacity: 0.25 }}
        />
      )}
      <div className="flex items-center gap-2">
        <h2
          className="flex-1 min-w-0 text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Пісні «{artistName}» у списках
        </h2>
        {isMobile && (
          <button
            type="button"
            onClick={closeWithSave}
            aria-label="Закрити"
            className="te-icon-btn te-icon-btn-sm shrink-0"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <div
        ref={listRef}
        onScroll={updateFades}
        className="flex flex-col gap-0.5 max-h-[226px] overflow-y-auto -mx-1 px-1"
        style={{
          WebkitMaskImage: buildFadeMask(fadeTop, fadeBottom),
          maskImage: buildFadeMask(fadeTop, fadeBottom),
        }}
      >
        {lists === null ? (
          <div className="py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Завантаження…
          </div>
        ) : (
          lists.map((p) => {
            const active = selected.has(p.id);
            return (
              <div
                key={p.id}
                data-playlist-id={p.id}
                className="flex items-center gap-2 px-2 py-2 rounded-lg"
                style={{ color: "var(--text)" }}
              >
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  role="switch"
                  aria-checked={active}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  style={{ color: "inherit" }}
                >
                  <ToggleKnob active={active} />
                  <span
                    className={`flex-1 text-sm truncate ${active ? "font-semibold" : "font-medium"}`}
                  >
                    {p.name}
                    <span
                      className="ml-1 font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ({p.songCount})
                    </span>
                  </span>
                </button>
                {p.isDefault ? (
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Дефолт
                  </span>
                ) : (
                  <TeButton
                    icon={Trash2}
                    size="sm"
                    tone="red"
                    onClick={() => requestDelete(p)}
                    aria-label="Видалити список"
                    className="shrink-0"
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {showCreate ? (
        <div className="flex items-center gap-2">
          <div
            className="te-inset flex-1 min-w-0 px-4 py-2"
            style={{ borderRadius: 999 }}
          >
            <input
              type="text"
              placeholder="Назва списку"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setShowCreate(false);
                  setNewName("");
                }
              }}
              autoFocus
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
          <TeButton
            icon={X}
            size="sm"
            onClick={() => {
              setShowCreate(false);
              setNewName("");
            }}
            aria-label="Скасувати"
          />
          <TeButton
            icon={Check}
            size="sm"
            active
            onClick={handleCreate}
            disabled={!newName.trim() || isPending}
            aria-label="Створити"
          />
        </div>
      ) : (
        <TeButton
          shape="pill"
          onClick={() => {
            setShowCreate(true);
            setNewName(artistName);
          }}
          className="w-full justify-center gap-2 py-2.5 text-sm font-semibold"
          style={{ color: "var(--orange)" }}
        >
          <Plus size={14} strokeWidth={2.2} />
          Новий список
        </TeButton>
      )}

      {error && <p className="text-xs" style={{ color: "#e11d48" }}>{error}</p>}
    </div>
  );

  return createPortal(
    <>
    {isMobile ? (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center"
        style={{
          background: sheetVisible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
          transition: "background 180ms ease-out",
        }}
        onMouseDown={(e) => {
          if (confirmDeleteRef.current) return;
          if (e.target === e.currentTarget) closeWithSave();
        }}
      >
        {sheet}
      </div>
    ) : (
      sheet
    )}
    <BottomSheet
      open={!!confirmDelete}
      onClose={() => !deletePending && setConfirmDelete(null)}
      title="Видалити список?"
    >
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {confirmDelete && (
          <>
            У списку <b style={{ color: "var(--text)" }}>«{confirmDelete.name}»</b>{" "}
            {confirmDelete.songCount} {pluralSongs(confirmDelete.songCount)}. Видалити його назавжди?
          </>
        )}
      </p>
      <div className="flex flex-col gap-2 w-full">
        <TeButton
          shape="pill"
          onClick={() => confirmDelete && doDelete(confirmDelete.id)}
          disabled={deletePending}
          className="w-full justify-center py-2.5"
          style={{ color: "#e11d48" }}
        >
          {deletePending ? "Видалення…" : "Видалити"}
        </TeButton>
        <button
          type="button"
          onClick={() => !deletePending && setConfirmDelete(null)}
          className="text-xs py-2"
          style={{ color: "var(--text-muted)" }}
        >
          Скасувати
        </button>
      </div>
    </BottomSheet>
    </>,
    document.body,
  );
}

function pluralSongs(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "пісня";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "пісні";
  return "пісень";
}
