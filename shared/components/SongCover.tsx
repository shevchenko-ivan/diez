"use client";

import { useState } from "react";
import { Guitar } from "lucide-react";
import { coverThumb } from "@/lib/utils";

// ── Song cover with graceful fallback ─────────────────────────────────────────
// Renders the cover image; when there's no src OR the URL fails to load
// (onError), falls back to a warm, page-toned panel + a centered guitar — on
// brand for a chords site, and distinct from the "has player" music-note
// indicator shown elsewhere in the row. The fallback uses theme tokens
// (--bg → --surface-dk), so it stays warm and a touch darker than the row in
// both light and dark themes. Fills its parent — the parent controls size,
// aspect ratio and border radius.
//
// Deliberately a plain <img>, NOT next/image. Covers are served pre-encoded
// from /_covers (or straight from the source CDN), so next/image's optimizer
// added nothing here (`unoptimized`) — while its lazy/priority handling kept
// planting <link rel="preload"> tags: next/image emits one for `priority`,
// `fetchPriority="high"` AND plain `loading="eager"` alike, and React SSR
// itself emits one for any eager/high-priority <img> (both verified
// 2026-08-31; six head preloads once competed with the font preloads and
// cost 10 PSI points). A plain lazy <img> gets no preload, and unlocks a
// real srcset for the two snapshot cuts.

interface SongCoverProps {
  src?: string | null;
  alt: string;
  /** Hover tooltip — kept for SEO parity with the previous markup. */
  title?: string;
  /** Absolutely-fill the (positioned) parent. Otherwise pass width/height. */
  fill?: boolean;
  width?: number;
  height?: number;
  /** srcset slot sizes; defaults to `${width}px` when width is given. */
  sizes?: string;
  /**
   * Eager-load (out of the browser's lazy queue) — for covers on the first
   * screen, one of which is the mobile LCP element. React SSR still emits a
   * preload link for an eager <img>, so grant this only to genuinely visible
   * cards; a below-the-fold eager cover is a wasted head preload.
   */
  plainEager?: boolean;
  /** Guitar icon size for the fallback. Scale to the container. */
  iconSize?: number;
}

export function SongCover({
  src,
  alt,
  title,
  fill = false,
  width,
  height,
  sizes,
  plainEager,
  iconSize = 24,
}: SongCoverProps) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;
  // Serve directly from the source CDN (bypass Vercel's Image Optimization
  // quota), downscaled via the URL so the payload stays light.
  const thumb = coverThumb(src);

  // Snapshot covers ship in two cuts — 500px and a `.300.webp` twin under the
  // same hash (tools/prefetch-covers.ts) — so the browser picks by slot size
  // and DPR: PSI's emulated phone (150px slot, DPR 1.75) and real DPR-2
  // phones take the 300px cut, DPR-3 screens keep the full 500px. CDN
  // fallback URLs have no twin, so they stay single-candidate.
  const isSnapshot =
    typeof thumb === "string" && thumb.startsWith("/_covers/") && thumb.endsWith(".webp");
  const srcSet = isSnapshot
    ? `${(thumb as string).replace(/\.webp$/, ".300.webp")} 300w, ${thumb} 500w`
    : undefined;
  const sizesAttr = srcSet ? (sizes ?? (width ? `${width}px` : "100vw")) : undefined;

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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb as string}
          srcSet={srcSet}
          sizes={sizesAttr}
          alt={alt}
          title={title}
          loading={plainEager ? "eager" : "lazy"}
          decoding="async"
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          className={
            fill
              ? "absolute inset-0 w-full h-full object-cover"
              : "w-full h-full object-cover"
          }
          onError={() => setErrored(true)}
        />
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
