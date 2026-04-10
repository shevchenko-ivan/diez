"use client";

import { useCallback, useRef } from "react";

type HapticType = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

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

  return { trigger };
}
