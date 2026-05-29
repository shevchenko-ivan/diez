"use client";

import { useState } from "react";
import Image from "next/image";
import { Guitar } from "lucide-react";

// ── Song cover with graceful fallback ─────────────────────────────────────────
// Renders the cover image; when there's no src OR the URL fails to load
// (onError), falls back to a warm, page-toned panel + a centered guitar — on
// brand for a chords site, and distinct from the "has player" music-note
// indicator shown elsewhere in the row. The fallback uses theme tokens
// (--bg → --surface-dk), so it stays warm and a touch darker than the row in
// both light and dark themes. Fills its parent — the parent controls size,
// aspect ratio and border radius.

interface SongCoverProps {
  src?: string | null;
  alt: string;
  /** Hover tooltip — kept for SEO parity with the previous markup. */
  title?: string;
  /** Use next/image `fill` (parent must be positioned). Otherwise pass width/height. */
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  /** Guitar icon size for the fallback. Scale to the container. */
  iconSize?: number;
  /** How the cover fits its box. "cover" (default) crops to fill the frame;
      "contain" shows the whole cover proportionally, with a blurred copy
      filling the letterbox space so covers of any aspect ratio stay fully
      visible without dead space. Only applies in `fill` mode. */
  fit?: "cover" | "contain";
}

export function SongCover({
  src,
  alt,
  title,
  fill = false,
  width,
  height,
  sizes,
  priority,
  iconSize = 24,
  fit = "cover",
}: SongCoverProps) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{
        background: showImage
          ? undefined
          : "linear-gradient(135deg, var(--bg), var(--surface-dk))",
      }}
    >
      {showImage ? (
        fill ? (
          <>
            {/* Blurred copy fills the letterbox space so a contained cover of
                any aspect ratio reads as an intentional frame, not dead space.
                Same src as the sharp layer → the browser fetches it once. */}
            {fit === "contain" && (
              <Image
                src={src as string}
                alt=""
                aria-hidden
                fill
                sizes={sizes}
                className="object-cover scale-110 blur-2xl"
                style={{ opacity: 0.5 }}
              />
            )}
            <Image
              src={src as string}
              alt={alt}
              title={title}
              fill
              sizes={sizes}
              priority={priority}
              className={fit === "contain" ? "object-contain" : "object-cover"}
              onError={() => setErrored(true)}
            />
          </>
        ) : (
          <Image
            src={src as string}
            alt={alt}
            title={title}
            width={width}
            height={height}
            priority={priority}
            className="w-full h-full object-cover"
            onError={() => setErrored(true)}
          />
        )
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: "var(--orange)", opacity: 0.65 }}
        >
          <Guitar size={iconSize} strokeWidth={2} />
        </span>
      )}
    </div>
  );
}
