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

/**
 * Haptics are fully disabled.
 *
 * History: the site used navigator.vibrate() on Android for taps/toggles.
 * User feedback (June 2026): vibration fired on every touch while browsing
 * and felt intrusive even after scoping it to real taps only — so it's now
 * a deliberate no-op everywhere. The hook and its call-site API are kept so
 * the dozens of `trigger("light")` calls don't need to be ripped out, and
 * haptics can be re-enabled behind a user setting later if ever wanted.
 */
export function useHaptics() {
  const trigger = useCallback((_type: HapticType = "light") => {}, []);
  const toggle = useCallback(() => {}, []);
  const strum = useCallback(() => {}, []);

  return { trigger, strum, toggle };
}
