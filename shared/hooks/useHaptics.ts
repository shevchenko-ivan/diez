"use client";

import { useCallback, useRef } from "react";

type HapticType = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

// Two-pulse "click" pattern for on/off toggles — a sharper primary pulse
// followed ~140ms later by a faint echo. Matches the tactile feel of a
// physical switch catching, then settling.
interface PulseEffect { delay?: number; duration: number; intensity: number }
const TOGGLE_PATTERN: PulseEffect[] = [
  { duration: 60, intensity: 0.59 },
  { delay: 140, duration: 50, intensity: 0.17 },
];

/**
 * Thin wrapper around web-haptics.
 * Works only on mobile (iOS/Android with vibration support).
 * On desktop it's a no-op — no errors.
 */
export function useHaptics() {
  // Lazy-init to avoid SSR issues
  const hapticsRef = useRef<{ trigger: (t: HapticType) => void } | null>(null);

  const getHaptics = useCallback(async () => {
    if (hapticsRef.current) return hapticsRef.current;
    try {
      const { WebHaptics } = await import("web-haptics");
      hapticsRef.current = new WebHaptics();
    } catch {
      // unsupported browser — noop
      hapticsRef.current = { trigger: () => {} };
    }
    return hapticsRef.current;
  }, []);

  const trigger = useCallback(
    async (type: HapticType = "light") => {
      const h = await getHaptics();
      h?.trigger(type);
    },
    [getHaptics],
  );

  const toggle = useCallback(
    async () => {
      const h = await getHaptics();
      // web-haptics' `trigger` accepts either a preset string or a raw
      // PulseEffect[] pattern. Cast via `unknown` since the ref type was
      // narrowed to the preset signature.
      (h as unknown as { trigger: (p: PulseEffect[]) => void })?.trigger(TOGGLE_PATTERN);
    },
    [getHaptics],
  );

  const strum = useCallback(
    async () => {
      // Arpeggio-like vibration pattern for a guitar strum
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([15, 25, 15, 25, 15, 25, 20]);
      } else {
        const h = await getHaptics();
        h?.trigger("medium");
      }
    },
    [getHaptics],
  );

  return { trigger, strum, toggle };
}
