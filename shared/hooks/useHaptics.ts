"use client";

import { useCallback } from "react";

type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error";

// Direct navigator.vibrate millisecond patterns. Single-number = solid pulse.
// Array = on/off/on/off… durations. Modelled after iOS UIFeedbackGenerator
// presets — same names so existing trigger("light") calls keep working.
const PRESETS: Record<HapticType, number | number[]> = {
  light: 15,
  medium: 25,
  heavy: 35,
  selection: 8,
  success: [30, 60, 40],
  warning: [40, 100, 40],
  error: [40, 40, 40, 40, 40],
};

// Two-pulse "click" for on/off toggles — sharper primary, soft echo ~140ms
// later. Matches the feel of a physical switch catching, then settling.
const TOGGLE_PATTERN: number[] = [60, 140, 50];

// Arpeggio-like pattern for a guitar strum.
const STRUM_PATTERN: number[] = [15, 25, 15, 25, 15, 25, 20];

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

/**
 * Thin wrapper around the Web Vibration API.
 *
 * - **Android Chrome / Firefox:** real motor pulse via `navigator.vibrate()`.
 * - **iOS Safari:** silent no-op. Apple has never implemented the Web
 *   Vibration API and there is no reliable cross-version way to trigger the
 *   Taptic Engine from a browser. We deliberately do NOT use the
 *   AudioContext-click fallback that some libraries ship — it plays a
 *   literal click *sound* through the speaker, which is noise rather than
 *   tactile feedback. Honest silence is better than fake haptic.
 * - **Desktop:** silent no-op.
 *
 * If iOS one day exposes the Vibration API (or Apple ships a Web Haptics
 * spec), this hook automatically lights up — every call already routes
 * through `navigator.vibrate` when present.
 */
export function useHaptics() {
  const trigger = useCallback((type: HapticType = "light") => {
    vibrate(PRESETS[type]);
  }, []);

  const toggle = useCallback(() => {
    vibrate(TOGGLE_PATTERN);
  }, []);

  const strum = useCallback(() => {
    vibrate(STRUM_PATTERN);
  }, []);

  return { trigger, strum, toggle };
}
