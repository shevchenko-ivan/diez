"use client";

import { useCallback, useEffect } from "react";

type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error";

interface PulseEffect {
  delay?: number;
  duration: number;
  intensity: number;
}

// Two-pulse "click" pattern for on/off toggles — a sharper primary pulse
// followed ~140ms later by a faint echo. Matches the tactile feel of a
// physical switch catching, then settling.
const TOGGLE_PATTERN: PulseEffect[] = [
  { duration: 60, intensity: 0.59 },
  { delay: 140, duration: 50, intensity: 0.17 },
];

// ─── Module-singleton WebHaptics ────────────────────────────────────────────
// One WebHaptics instance shared across every useHaptics() consumer. The
// previous implementation created one per hook call which (a) wasted memory
// and (b) prevented the AudioContext bootstrap below from being effective —
// each instance had its own suspended context.
//
// `debug: !supportsVibrate` is the key: web-haptics only runs its internal
// AudioContext "click" buffer in debug mode. On Android we have real
// navigator.vibrate (the motor pulse), so we skip the audio decoration; on
// iOS Safari (no Vibration API) we flip debug on so the audio fallback fires
// and the user actually feels a tick through the speaker.

type SharedHapticsLike = {
  trigger: (input: HapticType | PulseEffect[]) => void;
};

let sharedHaptics: SharedHapticsLike | null = null;
let sharedInitPromise: Promise<SharedHapticsLike> | null = null;
let audioBootstrapped = false;

async function getSharedHaptics(): Promise<SharedHapticsLike> {
  if (sharedHaptics) return sharedHaptics;
  if (sharedInitPromise) return sharedInitPromise;
  sharedInitPromise = (async () => {
    try {
      const { WebHaptics } = await import("web-haptics");
      const supportsVibrate =
        typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
      sharedHaptics = new WebHaptics({
        // web-haptics' "debug" flag is mis-named — it really means "enable the
        // AudioContext click-buffer fallback". On iOS Safari (no Vibration API)
        // that buffer is the only thing producing perceivable feedback.
        debug: !supportsVibrate,
      }) as unknown as SharedHapticsLike;
    } catch {
      sharedHaptics = { trigger: () => {} };
    }
    return sharedHaptics!;
  })();
  return sharedInitPromise;
}

/**
 * Thin wrapper around web-haptics.
 *
 * Works on Android (real Vibration API → motor pulse) and iOS Safari (audio
 * click fallback through speaker, only after the first user touch primes the
 * AudioContext — see the bootstrap effect below). On desktop it's a no-op.
 */
export function useHaptics() {
  const trigger = useCallback(async (type: HapticType = "light") => {
    const h = await getSharedHaptics();
    h.trigger(type);
  }, []);

  const toggle = useCallback(async () => {
    const h = await getSharedHaptics();
    h.trigger(TOGGLE_PATTERN);
  }, []);

  const strum = useCallback(async () => {
    // Arpeggio-like vibration pattern for a guitar strum. Prefer
    // navigator.vibrate directly when available — it accepts the raw
    // millisecond pattern without going through web-haptics' validator.
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([15, 25, 15, 25, 15, 25, 20]);
    } else {
      const h = await getSharedHaptics();
      h.trigger("medium");
    }
  }, []);

  // Bootstrap web-haptics' AudioContext on the first user touch. The Web
  // Audio API requires a user gesture to resume a suspended context, and
  // scroll events with { passive: true } don't qualify. By registering a
  // one-shot touchstart listener at the window level, the very first tap
  // anywhere in the app primes the context — afterwards any trigger() call
  // (including those fired from a passive scroll handler) can play audio
  // without the autoplay policy blocking it.
  //
  // Bootstrapping only happens once per page load — the module-level
  // `audioBootstrapped` flag short-circuits future hook mounts.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (audioBootstrapped) return;
    // Touch-only devices. Desktop pointer-fine devices don't need this.
    if (!window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

    const bootstrap = () => {
      audioBootstrapped = true;
      // A tiny "light" tick — barely perceptible, but it routes through
      // web-haptics' trigger() inside a user-gesture context, which lets
      // ensureAudio() call AudioContext.resume() successfully.
      void trigger("light");
    };
    window.addEventListener("touchstart", bootstrap, { passive: true, once: true });
    return () => window.removeEventListener("touchstart", bootstrap);
  }, [trigger]);

  return { trigger, strum, toggle };
}
