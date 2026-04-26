"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastItem = { id: number; message: string };

const listeners = new Set<(t: ToastItem) => void>();
let nextId = 0;

export function toast(message: string) {
  const t: ToastItem = { id: nextId++, message };
  listeners.forEach((fn) => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fn = (t: ToastItem) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 2800);
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="te-surface"
          style={{
            padding: "10px 20px",
            borderRadius: 999,
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
            whiteSpace: "nowrap",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}
