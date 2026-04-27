"use client";

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "desktop" | "other";

/**
 * Manages PWA install affordance across platforms.
 * - Android Chrome fires `beforeinstallprompt` — we capture & re-trigger via prompt().
 * - iOS Safari has no API; we surface manual instructions instead.
 * - Already-installed PWAs (display-mode: standalone) hide the affordance.
 */
export function useInstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("other");
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isMobile = isIOS || isAndroid;
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : isMobile ? "other" : "desktop");

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes navigator.standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setDeferredPrompt(null);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome === "accepted";
  }, [deferredPrompt]);

  // Show button on mobile (always — iOS gets instructions),
  // and on desktop only if Chrome/Edge surfaced the prompt.
  const canShow =
    !isStandalone &&
    (platform === "ios" || platform === "android" || deferredPrompt !== null);

  const hasNativePrompt = deferredPrompt !== null;

  return { canShow, platform, hasNativePrompt, promptInstall, isStandalone };
}
