// Neutral pulsing placeholder block for Suspense fallbacks. Suspense pages
// under PageShell stream a tiny "Завантаження..." fallback first, which
// parks the footer near the top of the viewport — when the real content
// streams in, the footer jumps a full screen down and the whole swap is
// charged to CLS (field CLS on /profile/lists hit ~0.7 from this alone).
// A fallback that mirrors the final layout keeps the footer below the fold
// and lets content land in place, so the swap costs ~0.
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--surface-dk)", ...style }}
    />
  );
}
