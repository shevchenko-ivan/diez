"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional heading shown bold at the top. */
  title?: string;
  children: React.ReactNode;
}

/**
 * Mobile-first bottom sheet replacement for centered modals. Slides up from
 * the bottom on any viewport; on wide screens it still anchors to the bottom
 * centre but caps its width. Backdrop click + Escape + swipe-down close.
 */
export function BottomSheet({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(false);
  // Drives the enter/exit transition. `visible` toggles the transform + backdrop
  // opacity so we get a slide-up on open and slide-down on close.
  const [visible, setVisible] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      // Next tick so the initial (hidden) styles commit before transitioning.
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        background: visible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        transition: "background 180ms ease-out",
      }}
    >
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={(e) => e.stopPropagation()}
        className="te-surface w-full max-w-md flex flex-col gap-4 p-5 pb-7"
        style={{
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          aria-hidden
          className="self-center rounded-full"
          style={{ width: 36, height: 4, background: "var(--text-muted)", opacity: 0.25 }}
        />
        {title && (
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
