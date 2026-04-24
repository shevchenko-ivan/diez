"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { BottomSheet } from "@/shared/components/BottomSheet";
import { createClient } from "@/lib/supabase/client";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { AddArtistToPlaylistPopover } from "./AddArtistToPlaylistPopover";

interface Props {
  artistSlug: string;
  artistName: string;
  initialSaved?: boolean;
  /** Total published songs by this artist — threaded into the popover. */
  songsCount?: number;
  /** Floating overlay on cover media vs. bare pill in a toolbar. */
  variant?: "floating" | "bare";
  size?: number;
  /** Button square size for the "bare" variant. Defaults to 36. */
  buttonSize?: number;
}

export function SaveArtistButton({
  artistSlug,
  artistName,
  initialSaved = false,
  songsCount = 0,
  variant = "floating",
  size = 14,
  buttonSize = 36,
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const anchorRectRef = useRef<DOMRect | null>(null);
  const { trigger } = useHaptics();

  useEffect(() => setSaved(initialSaved), [initialSaved]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trigger("medium");
    // Capture anchor rect for the popover before we await — currentTarget
    // gets nulled across the async boundary.
    anchorRectRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (anchorRectRef.current) setPopoverRect(anchorRectRef.current);
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
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label={saved ? "Підбірка створена" : "Зберегти виконавця"}
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
          aria-label={saved ? "Підбірка створена" : "Зберегти виконавця"}
          aria-pressed={saved}
          active={saved}
          style={{ width: buttonSize, height: buttonSize }}
        >
          {heart}
        </TeButton>
      )}

      {popoverRect && (
        <AddArtistToPlaylistPopover
          artistSlug={artistSlug}
          artistName={artistName}
          artistSongsCount={songsCount}
          anchorRect={popoverRect}
          onClose={() => setPopoverRect(null)}
          onSavedChange={setSaved}
        />
      )}
      <BottomSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title="Зареєструйтеся, щоб зберігати"
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 56, height: 56, background: "rgba(255,136,0,0.12)", color: "var(--orange)" }}
        >
          <Heart size={24} strokeWidth={2} fill="currentColor" />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Створіть акаунт — і всі ваші улюблені виконавці будуть у списках.
        </p>
        <div className="flex flex-col gap-2 w-full">
          <TeButton shape="pill" href="/auth/sign-up" className="w-full justify-center py-2.5">
            Створити акаунт
          </TeButton>
          <TeButton
            shape="pill"
            href="/auth/login"
            className="w-full justify-center py-2.5"
            style={{ background: "transparent", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
          >
            Увійти
          </TeButton>
          <button
            type="button"
            onClick={() => { trigger("light"); setAuthOpen(false); }}
            className="text-xs py-2"
            style={{ color: "var(--text-muted)" }}
          >
            Пізніше
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
