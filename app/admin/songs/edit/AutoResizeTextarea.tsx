"use client";

import { useRef, useEffect, useCallback } from "react";

export function AutoResizeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
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
