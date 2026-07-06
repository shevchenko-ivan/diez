"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, RotateCw } from "lucide-react";
import { TabView } from "./TabView";

// Dedicated fullscreen viewer for a song's tablature. Collects every section's
// tab block into one focused, zoomable, scrollable overlay — handy on the phone
// where inline tabs are cramped. Portals to <body> because the song page uses
// content-visibility/transform which break position:fixed inside the tree.

export interface TabFsItem {
  label?: string;
  tab: string;
}

const MIN = 12;
const MAX = 30;
const DEFAULT = 17;

export function TabFullscreenView({ tabs, onClose }: { tabs: TabFsItem[]; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // lock background scroll
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  const dec = () => setFontSize((f) => Math.max(MIN, f - 2));
  const inc = () => setFontSize((f) => Math.min(MAX, f + 2));

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "var(--bg)", display: "flex", flexDirection: "column" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between gap-3 px-4"
        style={{ height: 56, flexShrink: 0, borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))" }}
      >
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text)" }}>
          Табулатура
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={dec}
            disabled={fontSize <= MIN}
            aria-label="Зменшити"
            className="te-pressable inline-flex items-center justify-center rounded-lg disabled:opacity-40"
            style={{ width: 34, height: 34, border: "1px solid var(--border, rgba(0,0,0,0.12))", color: "var(--text)" }}
          >
            <Minus size={16} />
          </button>
          <span className="text-xs font-mono tabular-nums w-6 text-center" style={{ color: "var(--text-muted)" }}>{fontSize}</span>
          <button
            type="button"
            onClick={inc}
            disabled={fontSize >= MAX}
            aria-label="Збільшити"
            className="te-pressable inline-flex items-center justify-center rounded-lg disabled:opacity-40"
            style={{ width: 34, height: 34, border: "1px solid var(--border, rgba(0,0,0,0.12))", color: "var(--text)" }}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="te-pressable inline-flex items-center justify-center rounded-lg ml-1"
            style={{ width: 34, height: 34, border: "1px solid var(--border, rgba(0,0,0,0.12))", color: "var(--text)" }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-5" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Rotate hint — only useful on a narrow screen, where wide tabs overflow. */}
        <p
          className="sm:hidden flex items-center gap-1.5 text-[11px] mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          <RotateCw size={13} /> Поверніть телефон горизонтально для ширших табів.
        </p>

        <div className="space-y-6 max-w-5xl mx-auto">
          {tabs.map((t, i) => (
            <div key={i}>
              {t.label && (
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  {t.label}
                </div>
              )}
              <div
                className="te-inset rounded-xl overflow-x-auto scrollbar-none"
                style={{ padding: "12px 14px", WebkitOverflowScrolling: "touch" }}
              >
                <TabView tab={t.tab} fontSize={fontSize} bg="var(--surface)" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
