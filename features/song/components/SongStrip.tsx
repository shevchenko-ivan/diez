"use client";

import { useEffect, useRef, useState } from "react";
import { SongCard } from "./SongCard";
import { TopSongCard } from "./TopSongCard";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { type Song } from "../types";

// Home-page "Топ популярних" as a horizontal, infinitely-scrolling strip —
// same UX as the artist strip. Loads the next page of most-viewed songs when
// the user nears the right edge.

const PAGE_SIZE = 12;
// Card width: compact on phones so more than one fits per screen, roomier on
// tablet/desktop. Tailwind literal classes (responsive-safe).
const CARD_W = "w-[150px] sm:w-[200px]";

interface Props {
  initial: Song[];
  /** All slugs the current user has saved — to pre-fill the heart state. */
  savedSlugs: string[];
  /** Server action that returns the next page of songs for this strip. */
  loadMore: (offset: number, limit?: number) => Promise<Song[]>;
  /** True when the initial page already returned fewer items than requested. */
  initialExhausted?: boolean;
  /**
   * Card style.
   * - "default" (the existing card with cover + title + artist + chord chips).
   * - "featured" (square cover only; title/artist fades in on hover, always
   *   visible on touch). Used for the "Топ популярних" shelf on /.
   */
  variant?: "default" | "featured";
}

export function SongStrip({
  initial,
  savedSlugs,
  loadMore,
  initialExhausted = false,
  variant = "default",
}: Props) {
  const [songs, setSongs] = useState<Song[]>(initial);
  const [exhausted, setExhausted] = useState(initialExhausted);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // Pin offset against initial.length so concurrent loads can't double-fetch.
  const offsetRef = useRef<number>(initial.length);
  const saved = new Set(savedSlugs);
  const { trigger } = useHaptics();
  const lastTickRef = useRef(0);

  // iOS-picker-style tactile feedback while the user swipes through the strip.
  // Fires a "selection" haptic tap each time a new card crosses the leading
  // edge — same sensation as scrubbing a UIDatePicker wheel.
  //
  // Notes:
  // - Touch-only (mobile / tablet). Desktop pointer-fine devices get nothing.
  // - Android Chrome / Firefox uses navigator.vibrate directly (real motor pulse).
  // - iOS Safari has never shipped the Web Vibration API, but web-haptics
  //   falls back to an AudioContext "click" buffer — a short pulse played
  //   through the speaker that resonates through the device frame and reads
  //   as tactile. Quieter than a real motor, audible at very low volume in
  //   silent rooms, but enough for picker-tick perception during a swipe.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

    // Card pitch — mobile CARD_W is 150px + gap-3 (12px) = 162px.
    // On sm+ the strip is 200px wide, but the touch heuristic above only
    // activates for coarse pointers (phones), so 150-class width is what
    // we feel under the finger.
    const tickWidth = 162;

    const onScroll = () => {
      const tick = Math.floor(el.scrollLeft / tickWidth);
      if (tick !== lastTickRef.current) {
        lastTickRef.current = tick;
        // "selection" maps to a very short tick — the iOS picker tap, not a
        // full haptic thud. Fires fast, decays fast, no overlap on flicks.
        void trigger("selection");
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [trigger]);

  useEffect(() => {
    if (exhausted) return;
    const sentinel = sentinelRef.current;
    const root = scrollerRef.current;
    if (!sentinel || !root) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (loading || exhausted) return;
          setLoading(true);
          const offset = offsetRef.current;
          loadMore(offset, PAGE_SIZE)
            .then((next) => {
              if (next.length === 0) {
                setExhausted(true);
              } else {
                setSongs((prev) => [...prev, ...next]);
                offsetRef.current = offset + next.length;
                if (next.length < PAGE_SIZE) setExhausted(true);
              }
            })
            .finally(() => setLoading(false));
        }
      },
      // Trigger ~1.5 cards before the right edge of the horizontal scroller.
      { root, rootMargin: "0px 300px 0px 0px", threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loading, exhausted, loadMore]);

  return (
    <div
      ref={scrollerRef}
      // -my-4 py-7: overflow-x:auto forces overflow-y to clip, which would cut
      // the cards' hover drop-shadow. The negative margin + extra padding gives
      // the shadow 28px of room while keeping the visual spacing identical to
      // py-3 (net 12px each side).
      className="flex overflow-x-auto -my-4 py-7 -mx-6 px-6 sm:mx-0 sm:px-0 gap-3 scrollbar-none"
    >
      {songs.map((s, i) => (
        <div key={s.slug} className={`flex-shrink-0 ${CARD_W}`}>
          {variant === "featured" ? (
            <TopSongCard
              slug={s.slug}
              title={s.title}
              artist={s.artist}
              coverImage={s.coverImage}
              coverColor={s.coverColor}
              index={i}
            />
          ) : (
            <SongCard
              slug={s.slug}
              title={s.title}
              artist={s.artist}
              difficulty={s.difficulty}
              chords={s.chords}
              views={s.views}
              coverImage={s.coverImage}
              coverColor={s.coverColor}
              index={i}
              isSaved={saved.has(s.slug)}
            />
          )}
        </div>
      ))}

      {/* Sentinel at the trailing edge — IntersectionObserver fires as the
          user nears the right side, fetching the next page. */}
      {!exhausted && (
        <div
          ref={sentinelRef}
          className="flex-shrink-0 flex gap-3"
          style={{ paddingLeft: 1 }}
          aria-hidden
        >
          {loading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className={`flex-shrink-0 te-card-thick ${CARD_W}`}
                style={{ borderRadius: "1.5rem", padding: 10 }}
              >
                <div
                  className="te-card-well w-full aspect-square"
                  style={{ borderRadius: "1rem", opacity: 0.4 }}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
