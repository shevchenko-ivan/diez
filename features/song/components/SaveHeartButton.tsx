"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Heart, X } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { AddToPlaylistPopover } from "@/features/playlist/components/AddToPlaylistPopover";
import { getPlaylistsForSong } from "@/features/playlist/actions/playlists";
import type { PlaylistSummary } from "@/features/playlist/types";
import { createClient } from "@/lib/supabase/client";
import { useHaptics } from "@/shared/hooks/useHaptics";

interface Props {
  slug: string;
  initialSaved?: boolean;
  /** Floating pill style (white background on media) vs bare (inherits parent) */
  variant?: "floating" | "bare";
  size?: number;
  variantId?: string;
}

export function SaveHeartButton({ slug, initialSaved = false, variant = "floating", size = 14, variantId }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [prefetched, setPrefetched] = useState<PlaylistSummary[] | null>(null);
  const prefetchStarted = useRef(false);
  const { trigger } = useHaptics();

  useEffect(() => setSaved(initialSaved), [initialSaved]);

  const prefetch = () => {
    if (prefetchStarted.current) return;
    prefetchStarted.current = true;
    getPlaylistsForSong(slug)
      .then(setPrefetched)
      .catch(() => { prefetchStarted.current = false; });
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trigger("medium");
    // Capture anchor rect before awaiting — currentTarget is nulled after await.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setAnchorRect(rect);
  };

  const heart = (
    <Heart
      size={size}
      strokeWidth={1.8}
      fill={saved ? "currentColor" : "none"}
      style={{ color: saved ? "var(--orange)" : undefined }}
    />
  );

  return (
    <>
      {variant === "floating" ? (
        <button
          type="button"
          onClick={handleClick}
          onMouseEnter={() => { setHover(true); prefetch(); }}
          onMouseLeave={() => setHover(false)}
          onFocus={prefetch}
          onTouchStart={prefetch}
          aria-label={saved ? "Змінити списки" : "Додати у список"}
          aria-pressed={saved}
          className="absolute top-2 right-2 z-10 inline-flex items-center justify-center rounded-full transition-colors"
          style={{
            width: 30,
            height: 30,
            background: !saved && hover ? "rgba(0,0,0,0.35)" : "transparent",
            backdropFilter: !saved && hover ? "blur(8px)" : "none",
            WebkitBackdropFilter: !saved && hover ? "blur(8px)" : "none",
            color: saved || hover ? "var(--orange)" : "rgba(255,255,255,0.95)",
            boxShadow: !saved && hover ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
            filter: saved || !hover ? "drop-shadow(0 1px 2px rgba(0,0,0,0.45))" : "none",
          }}
        >
          {heart}
        </button>
      ) : (
        <TeButton
          onClick={(e) => handleClick(e as unknown as React.MouseEvent)}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          onTouchStart={prefetch}
          aria-label={saved ? "Змінити списки" : "Додати у список"}
          aria-pressed={saved}
          active={saved}
          style={{ width: 36, height: 36 }}
        >
          {heart}
        </TeButton>
      )}

      {anchorRect && (
        <AddToPlaylistPopover
          slug={slug}
          variantId={variantId}
          anchorRect={anchorRect}
          initialLists={prefetched}
          onClose={() => {
            setAnchorRect(null);
            setPrefetched(null);
            prefetchStarted.current = false;
          }}
          onSavedChange={(s) => setSaved(s)}
        />
      )}
      {authOpen && <AuthRequiredModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}

function AuthRequiredModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [onClose]);

  if (!mounted) return null;

  const stopAndClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={stopAndClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={(e) => e.stopPropagation()}
        className="te-surface p-6 max-w-sm w-full flex flex-col items-center text-center gap-4 relative"
        style={{ borderRadius: "1.25rem" }}
      >
        <button
          type="button"
          onClick={(e) => { trigger("light"); stopAndClose(e); }}
          aria-label="Закрити"
          className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full"
          style={{ width: 28, height: 28, color: "var(--text-muted)", background: "transparent" }}
        >
          <X size={16} strokeWidth={2} />
        </button>
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 56, height: 56, background: "rgba(255,136,0,0.12)", color: "var(--orange)" }}
        >
          <Heart size={24} strokeWidth={2} fill="currentColor" />
        </div>
        <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
          Зареєструйтеся, щоб зберігати
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Створіть акаунт — і всі ваші улюблені пісні будуть у списках.
        </p>
        <div className="flex flex-col gap-2 w-full mt-2">
          <TeButton shape="pill" href="/auth/sign-up" className="w-full justify-center py-2.5">
            Створити акаунт
          </TeButton>
          <TeButton shape="pill" href="/auth/login" className="w-full justify-center py-2.5" style={{ background: "transparent", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}>
            Увійти
          </TeButton>
          <button
            type="button"
            onClick={() => { trigger("light"); onClose(); }}
            className="text-xs mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Пізніше
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
