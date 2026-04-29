"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, X } from "lucide-react";
import {
  createPlaylist,
  getPlaylistsForSong,
  setSongPlaylists,
} from "../actions/playlists";
import type { PlaylistSummary } from "../types";
import { ToggleKnob } from "@/shared/components/ToggleKnob";
import { TeButton } from "@/shared/components/TeButton";

interface Props {
  slug: string;
  variantId?: string;
  /** Rect of the anchor (heart button) — popover positions itself below/above. */
  anchorRect: DOMRect;
  /** Pre-fetched playlists (from hover/focus prefetch) — skips the loading state. */
  initialLists?: PlaylistSummary[] | null;
  onClose: () => void;
  onSavedChange: (saved: boolean) => void;
}

const POPOVER_WIDTH = 288;
const FADE = 20;

// Pre-select the default list when the song isn't in any list yet, so the
// click on the heart immediately stages a save to the default — closing the
// popover without further interaction commits it.
function presetSelection(lists: PlaylistSummary[]): Set<string> {
  const already = new Set(lists.filter((p) => p.hasSong).map((p) => p.id));
  if (already.size === 0) {
    const def = lists.find((p) => p.isDefault);
    if (def) already.add(def.id);
  }
  return already;
}

function buildFadeMask(top: boolean, bottom: boolean): string {
  if (!top && !bottom) return "none";
  const start = top ? `transparent 0, black ${FADE}px` : `black 0`;
  const end = bottom ? `black calc(100% - ${FADE}px), transparent 100%` : `black 100%`;
  return `linear-gradient(to bottom, ${start}, ${end})`;
}
const GAP = 8;

export function AddToPlaylistPopover({ slug, variantId, anchorRect, initialLists, onClose, onSavedChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [lists, setLists] = useState<PlaylistSummary[] | null>(initialLists ?? null);
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (!initialLists) return new Set();
    return presetSelection(initialLists);
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
  const initialSelectedRef = useRef<Set<string> | null>(null);
  const selectedRef = useRef<Set<string>>(selected);
  selectedRef.current = selected;

  const closeWithSave = () => {
    const initial = initialSelectedRef.current;
    const current = selectedRef.current;
    const changed =
      !initial ||
      initial.size !== current.size ||
      [...current].some((id) => !initial.has(id));
    if (!changed) {
      onClose();
      return;
    }
    setSongPlaylists(slug, [...current], variantId).then((res) => {
      if (res.ok) onSavedChange(res.data.saved);
    });
    onClose();
  };

  const updateFades = () => {
    const el = listRef.current;
    if (!el) return;
    setFadeTop(el.scrollTop > 2);
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };

  useEffect(() => {
    updateFades();
  }, [lists, showCreate]);

  // Mount + keyboard + scroll/resize close — all apply pending changes.
  // On mobile we render as a bottom sheet and skip the scroll/resize close.
  useEffect(() => {
    setMounted(true);
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const prevOverflow = document.body.style.overflow;
      const prevPadding = document.body.style.paddingRight;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
      const id = requestAnimationFrame(() => setSheetVisible(true));
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeWithSave();
      window.addEventListener("keydown", onKey);
      return () => {
        cancelAnimationFrame(id);
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPadding;
      };
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeWithSave();
    const onScroll = (e: Event) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      closeWithSave();
    };
    const onResize = () => closeWithSave();
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

  // Position computation — flip above if not enough room below.
  useLayoutEffect(() => {
    if (!mounted || isMobile) return;
    const popH = popoverRef.current?.offsetHeight ?? 320;
    const roomBelow = window.innerHeight - anchorRect.bottom;
    const placement: "bottom" | "top" = roomBelow > popH + GAP || anchorRect.top < popH + GAP ? "bottom" : "top";

    let left = anchorRect.left + anchorRect.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8));

    const top = placement === "bottom" ? anchorRect.bottom + GAP : anchorRect.top - popH - GAP;
    setPos({ top, left, placement });
  }, [mounted, anchorRect, lists, showCreate, isMobile]);

  // Load playlists; auto-select default if song is not yet in any list, so
  // a single click on the heart commits the song to the default list.
  useEffect(() => {
    const bootstrap = (data: PlaylistSummary[]) => {
      setLists(data);
      const already = new Set(data.filter((p) => p.hasSong).map((p) => p.id));
      initialSelectedRef.current = already;
      const next = presetSelection(data);
      setSelected(next);
      onSavedChange(next.size > 0);
    };
    if (initialLists) {
      bootstrap(initialLists);
      return;
    }
    getPlaylistsForSong(slug).then(bootstrap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, initialLists]);

  // Close on outside click — applies pending changes. Mobile uses backdrop.
  useEffect(() => {
    if (!mounted || isMobile) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closeWithSave();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mounted, isMobile, onClose]);

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
          songCount: 0,
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
      aria-modal={isMobile ? "true" : undefined}
      aria-labelledby="add-to-playlist-title"
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
        <h2 id="add-to-playlist-title" className="flex-1 min-w-0 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Зберегти в список
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
              <button
                key={p.id}
                data-playlist-id={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                role="switch"
                aria-checked={active}
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors text-left"
                style={{ color: "var(--text)" }}
              >
                <ToggleKnob active={active} />
                <span className={`flex-1 text-sm truncate ${active ? "font-semibold" : "font-medium"}`}>{p.name}</span>
                {p.isDefault && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Дефолт
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {showCreate ? (
        <div className="flex items-center gap-2">
          <div className="te-inset flex-1 min-w-0 px-4 py-2" style={{ borderRadius: 999 }}>
            <input
              type="text"
              placeholder="Назва списку"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setShowCreate(false); setNewName(""); }
              }}
              autoFocus
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
          <TeButton
            icon={X}
            size="sm"
            onClick={() => { setShowCreate(false); setNewName(""); }}
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
          onClick={() => setShowCreate(true)}
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
    isMobile ? (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center"
        style={{
          background: sheetVisible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
          transition: "background 180ms ease-out",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeWithSave();
        }}
      >
        {sheet}
      </div>
    ) : (
      sheet
    ),
    document.body,
  );
}
