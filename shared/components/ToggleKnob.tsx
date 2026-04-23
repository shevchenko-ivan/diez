"use client";

import { useEffect, useRef } from "react";
import { useHaptics } from "@/shared/hooks/useHaptics";

// Framed pill toggle — a slightly-rounded square button with a 3×4 grip-dot
// pattern slides inside a dark inset track, all wrapped in a cream bezel.
// Active state lights the track orange.
//
// Colors pull from shared `--toggle-*` tokens so the toggle auto-adapts
// between light (warm cream/bronze) and dark (charcoal) themes.
//
// The `height` prop is the full wrapper height (bezel included).

interface ToggleKnobProps {
  active: boolean;
  width?: number;
  height?: number;
}

export function ToggleKnob({ active, width, height = 26 }: ToggleKnobProps) {
  // base em so the whole component scales with height
  // wrapper = track(1.5em) + 2 × padding(0.125em) = 1.75em
  const em = height / 1.75;
  const W = width ?? em * 3.25; // track 3em + 2 × padding 0.125em

  // Fire the two-pulse toggle haptic when `active` flips — skip the initial
  // mount so SSR hydration / initial render doesn't vibrate.
  const { toggle } = useHaptics();
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    toggle();
  }, [active, toggle]);

  return (
    <span
      aria-hidden
      className="dz-toggle"
      data-active={active ? "true" : "false"}
      style={{ fontSize: `${em}px`, width: W, height }}
    >
      <span className="dz-toggle-track">
        <span className="dz-toggle-thumb">
          <span className="dz-toggle-dots">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="dz-toggle-dot" />
            ))}
          </span>
        </span>
      </span>

      <style jsx>{`
        .dz-toggle {
          position: relative;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          padding: 0.125em;
          border-radius: 0.5em;
          /* flat frame matching the instrument tabs */
          background: var(--bg-inset, rgba(0, 0, 0, 0.06));
          flex-shrink: 0;
          line-height: 0;
        }
        /* Dark inset track */
        .dz-toggle-track {
          position: relative;
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 0.375em;
          background-color: var(--bg-inset, rgba(0, 0, 0, 0.06));
          box-shadow:
            inset 0 0 0.0625em 0.125em rgba(255, 255, 255, 0.18),
            inset 0 0.0625em 0.125em rgba(0, 0, 0, 0.35);
          transition: background-color 0.3s linear;
        }
        .dz-toggle[data-active="true"] .dz-toggle-track {
          background-color: var(--orange);
        }

        /* Sliding button */
        .dz-toggle-thumb {
          position: absolute;
          top: 50%;
          left: 0.0625em;
          transform: translateY(-50%);
          display: flex;
          justify-content: center;
          align-items: center;
          width: 1.375em;
          height: 1.375em;
          border-radius: 0.3125em;
          background-color: var(--toggle-rim-bottom);
          box-shadow:
            inset 0 -0.0625em 0.0625em 0.125em rgba(0, 0, 0, 0.08),
            inset 0 -0.125em 0.0625em rgba(0, 0, 0, 0.18),
            inset 0 0.1875em 0.0625em rgba(255, 255, 255, 0.35),
            0 0.125em 0.125em rgba(0, 0, 0, 0.45);
          transition: left 0.4s ease;
        }
        .dz-toggle[data-active="true"] .dz-toggle-thumb {
          /* track_w − thumb_w − left(0.0625em) = 3 − 1.375 − 0.0625 = 1.5625 */
          left: 1.5625em;
        }

        /* 3 × 4 grid of grip dots */
        .dz-toggle-dots {
          display: grid;
          grid-template-columns: repeat(3, 0.125em);
          grid-auto-rows: 0.125em;
          gap: 0.125em;
        }
        .dz-toggle-dot {
          width: 0.125em;
          height: 0.125em;
          border-radius: 50%;
          background-image: radial-gradient(
            circle at 50% 0,
            var(--toggle-rim-bottom),
            var(--toggle-rim-top)
          );
        }

        /* ── Dark theme ───────────────────────────────────────────────────
           Drop the bright white inset highlights, lift the thumb above the
           track, and darken the dot gradient so nothing glows. */
        :global([data-theme="dark"]) .dz-toggle {
          background: #1a191e;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.06),
            0 1px 0 rgba(255, 255, 255, 0.04);
        }
        :global([data-theme="dark"]) .dz-toggle-track {
          box-shadow:
            inset 0 0 0.0625em 0.125em rgba(255, 255, 255, 0.04),
            inset 0 0.0625em 0.2em rgba(0, 0, 0, 0.6);
        }
        :global([data-theme="dark"]) .dz-toggle-thumb {
          background-color: #4a4852;
          box-shadow:
            inset 0 -0.0625em 0.0625em 0.125em rgba(0, 0, 0, 0.2),
            inset 0 -0.125em 0.0625em rgba(0, 0, 0, 0.3),
            inset 0 0.1875em 0.0625em rgba(255, 255, 255, 0.08),
            0 0.125em 0.2em rgba(0, 0, 0, 0.6);
        }
        :global([data-theme="dark"]) .dz-toggle-dot {
          background-image: radial-gradient(
            circle at 50% 0,
            #6a6772,
            #2a2830
          );
        }
        @media (prefers-color-scheme: dark) {
          :global(:root:not([data-theme="light"])) .dz-toggle {
            background: #1a191e;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.06),
              0 1px 0 rgba(255, 255, 255, 0.04);
          }
          :global(:root:not([data-theme="light"])) .dz-toggle-track {
            box-shadow:
              inset 0 0 0.0625em 0.125em rgba(255, 255, 255, 0.04),
              inset 0 0.0625em 0.2em rgba(0, 0, 0, 0.6);
          }
          :global(:root:not([data-theme="light"])) .dz-toggle-thumb {
            background-color: #4a4852;
            box-shadow:
              inset 0 -0.0625em 0.0625em 0.125em rgba(0, 0, 0, 0.2),
              inset 0 -0.125em 0.0625em rgba(0, 0, 0, 0.3),
              inset 0 0.1875em 0.0625em rgba(255, 255, 255, 0.08),
              0 0.125em 0.2em rgba(0, 0, 0, 0.6);
          }
          :global(:root:not([data-theme="light"])) .dz-toggle-dot {
            background-image: radial-gradient(
              circle at 50% 0,
              #6a6772,
              #2a2830
            );
          }
        }
      `}</style>
    </span>
  );
}
