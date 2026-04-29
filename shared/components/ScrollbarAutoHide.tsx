"use client";

import { useEffect } from "react";

/**
 * Adds `is-scrolling` to <html> while the user is actively scrolling and
 * removes it 50ms after motion stops. CSS uses this class to reveal the
 * scrollbar track/thumb.
 */
export function ScrollbarAutoHide() {
  useEffect(() => {
    const html = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      html.classList.add("is-scrolling");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        html.classList.remove("is-scrolling");
      }, 50);
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
  }, []);

  return null;
}
