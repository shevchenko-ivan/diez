"use client";

import { useEffect, useRef, useState } from "react";
import { HapticLink } from "@/shared/components/HapticLink";
import { loadMoreArtists } from "../actions/strip";
import type { Artist } from "../services/artists";

const PAGE_SIZE = 12;

interface Props {
  initial: Artist[];
  /** True when the initial page already returned fewer items than requested
      (no need to ping the server for more). */
  initialExhausted?: boolean;
}

export function ArtistStrip({ initial, initialExhausted = false }: Props) {
  const [artists, setArtists] = useState<Artist[]>(initial);
  const [exhausted, setExhausted] = useState(initialExhausted);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // Pin offset against initial.length so concurrent loads can't double-fetch.
  const offsetRef = useRef<number>(initial.length);

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
          loadMoreArtists(offset, PAGE_SIZE)
            .then((next) => {
              if (next.length === 0) {
                setExhausted(true);
              } else {
                setArtists((prev) => [...prev, ...next]);
                offsetRef.current = offset + next.length;
                if (next.length < PAGE_SIZE) setExhausted(true);
              }
            })
            .finally(() => setLoading(false));
        }
      },
      // Observe within the horizontal scroller; trigger ~one card before edge.
      { root, rootMargin: "0px 200px 0px 0px", threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loading, exhausted]);

  return (
    <div
      ref={scrollerRef}
      className="flex overflow-x-auto py-3 -mx-6 px-6 sm:mx-0 sm:px-0 gap-3 scrollbar-none"
    >
      {artists.map((artist) => {
        const initial = artist.name.charAt(0).toUpperCase();
        const hue = artist.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
        const placeholderBg = `hsl(${hue}, 40%, 68%)`;
        return (
          <HapticLink
            key={artist.slug}
            href={`/artists/${artist.slug}`}
            className="artist-strip-card flex-shrink-0 flex flex-col items-center"
            style={{ width: 132, paddingLeft: 6, paddingRight: 6 }}
          >
            <div
              className="artist-strip-avatar te-inset"
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {artist.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.photo_url}
                  alt={artist.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: placeholderBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>
                    {initial}
                  </span>
                </div>
              )}
            </div>
            <p
              className="truncate uppercase font-bold mt-2 text-center w-full"
              style={{ fontSize: "0.72rem", letterSpacing: "0.04em", color: "var(--text)" }}
            >
              {artist.name}
            </p>
          </HapticLink>
        );
      })}

      {/* Sentinel + loading skeletons. Sentinel must sit at the trailing edge
          of the scroller so IntersectionObserver fires when the user nears
          the right side of the strip. */}
      {!exhausted && (
        <div
          ref={sentinelRef}
          className="flex-shrink-0 flex items-center gap-3"
          style={{ width: loading ? 132 * 2 + 12 : 1, minHeight: 132 }}
          aria-hidden
        >
          {loading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center"
                style={{ width: 132, paddingLeft: 6, paddingRight: 6 }}
              >
                <div
                  className="te-inset"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: "var(--surface-2, rgba(255,255,255,0.05))",
                    opacity: 0.4,
                  }}
                />
              </div>
            ))}
        </div>
      )}

      <style>{`
        .artist-strip-avatar { transition: transform 160ms ease, filter 160ms ease; }
        @media (hover: hover) {
          .artist-strip-card:hover .artist-strip-avatar { transform: scale(1.05); }
        }
        .artist-strip-card:active .artist-strip-avatar { transform: scale(0.98); }
      `}</style>
    </div>
  );
}
