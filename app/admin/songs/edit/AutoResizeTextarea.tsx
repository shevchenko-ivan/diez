"use client";

import { useRef, useEffect, useCallback } from "react";

export function AutoResizeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Save & restore window scroll: setting `height: auto` momentarily collapses
    // the textarea, which moves the caret out of the viewport, and the browser
    // scrolls the page UP to follow it. Without this guard, every Space (or any
    // keystroke that triggers onInput) jolts the page up.
    const sx = window.scrollX;
    const sy = window.scrollY;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    if (window.scrollX !== sx || window.scrollY !== sy) {
      window.scrollTo(sx, sy);
    }
  }, []);

  useEffect(() => {
    resize();
  }, [resize]);

  return (
    <textarea
      ref={ref}
      {...props}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
      style={{ ...props.style, overflow: "hidden" }}
    />
  );
}
