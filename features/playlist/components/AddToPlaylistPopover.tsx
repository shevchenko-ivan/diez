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

interface Props {
  slug: string;
  /** Rect of the anchor (heart button) — popover positions itself below/above. */
  anchorRect: DOMRect;
  /** Pre-fetched playlists (from hover/focus prefetch) — skips the loading state. */
  initialLists?: PlaylistSummary[] | null;
  onClose: () => void;
  onSavedChange: (saved: boolean) => void;
}

function ToggleKnob({ active }: { active: boolean }) {
  const W = 40;
  const H = 22;
  const PAD = 3;
  const KNOB = H - PAD * 2;
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        width: W,
        height: H,
        flexShrink: 0,
        borderRadius: 999,
        background: active ? "var(--orange)" : "var(--surface-dk, rgba(0,0,0,0.06))",
        boxShadow: "var(--sh-socket)",
        transition: "background 150ms ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: PAD,
          left: active ? W - KNOB - PAD : PAD,
          width: KNOB,
          height: KNOB,
          borderRadius: 999,
          background: "var(--surface-hi, #ffffff)",
          boxShadow: "var(--sh-physical)",
          transition: "left 160ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </span>
  );
}

const POPOVER_WIDTH = 288;
const FADE = 20;

function buildFadeMask(top: boolean, bottom: boolean): string {
  if (!top && !bottom) return "none";
  const start = top ? `transparent 0, black ${FADE}px` : `black 0`;
  const end = bottom ? `black calc(100% - ${FADE}px), transparent 100%` : `black 100%`;
  return `linear-gradient(to bottom, ${start}, ${end})`;
}
const GAP = 8;

export function AddToPlaylistPopover({ slug, anchorRect, initialLists, onClose, onSavedChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const [lists, setLists] = useState<PlaylistSummary[] | null>(initialLists ?? null);
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (!initialLists) return new Set();
    const already = new Set(initialLists.filter((p) => p.hasSong).map((p) => p.id));
    return already;
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
    setSongPlaylists(slug, [...current]).then((res) => {
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
  useEffect(() => {
    setMounted(true);
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

  }, []);

  // Position computation — flip above if not enough room below.
  useLayoutEffect(() => {
    if (!mounted) return;
    const popH = popoverRef.current?.offsetHeight ?? 320;
    const roomBelow = window.innerHeight - anchorRect.bottom;
    const placement: "bottom" | "top" = roomBelow > popH + GAP || anchorRect.top < popH + GAP ? "bottom" : "top";

    let left = anchorRect.left + anchorRect.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8));

    const top = placement === "bottom" ? anchorRect.bottom + GAP : anchorRect.top - popH - GAP;
    setPos({ top, left, placement });
  }, [mounted, anchorRect, lists, showCreate]);

  // Load playlists; auto-select default if song is not yet in any list.
  useEffect(() => {
    const bootstrap = (data: PlaylistSummary[]) => {
      setLists(data);
      const already = new Set(data.filter((p) => p.hasSong).map((p) => p.id));
      initialSelectedRef.current = new Set(already);
      if (already.size === 0) {
        const def = data.find((p) => p.isDefault);
        if (def) already.add(def.id);
      }
      setSelected(already);
    };
    if (initialLists) {
      bootstrap(initialLists);
      return;
    }
    getPlaylistsForSong(slug).then(bootstrap);
  }, [slug, initialLists]);

  // Close on outside click — applies pending changes.
  useEffect(() => {
    if (!mounted) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closeWithSave();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mounted, onClose]);

  const toggle = (id: string) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        },
      ]);
      setSelected((prev) => new Set(prev).add(res.data.id));
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

  return createPortal(
    <div
      ref={popoverRef}
      className="te-surface flex flex-col gap-3 p-4"
      role="dialog"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: POPOVER_WIDTH,
        zIndex: 60,
        borderRadius: "1rem",
        boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        Зберегти в список
      </h2>

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
        <div className="te-inset flex items-center gap-1 pl-3 pr-1 py-1" style={{ borderRadius: 999 }}>
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
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium"
            style={{ color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewName(""); }}
            aria-label="Скасувати"
            className="inline-flex items-center justify-center rounded-full transition-colors"
            style={{ width: 26, height: 26, color: "var(--text-muted)" }}
          >
            <X size={14} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || isPending}
            aria-label="Створити"
            className="inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-40"
            style={{ width: 28, height: 28, background: "var(--orange)", color: "white" }}
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ color: "var(--orange)" }}
        >
          <Plus size={14} strokeWidth={2} />
          Новий список
        </button>
      )}

      {error && <p className="text-xs" style={{ color: "#e11d48" }}>{error}</p>}
    </div>,
    document.body,
  );
}
