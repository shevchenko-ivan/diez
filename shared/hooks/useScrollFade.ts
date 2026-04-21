"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

const FADE_PX = 20;

export function buildFadeMask(top: boolean, bottom: boolean, fadePx = FADE_PX): string {
  if (!top && !bottom) return "none";
  const start = top ? `transparent 0, black ${fadePx}px` : `black 0`;
  const end = bottom ? `black calc(100% - ${fadePx}px), transparent 100%` : `black 100%`;
  return `linear-gradient(to bottom, ${start}, ${end})`;
}

export function useScrollFade<T extends HTMLElement>(
  deps: unknown[] = [],
): { ref: RefObject<T | null>; fadeTop: boolean; fadeBottom: boolean; onScroll: () => void } {
  const ref = useRef<T>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setFadeTop(el.scrollTop > 2);
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };

  // Recompute when content changes or on mount.
  useLayoutEffect(() => {
    update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Recompute on resize — viewport-height-bound containers change with window size.
  useEffect(() => {
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return { ref, fadeTop, fadeBottom, onScroll: update };
}
