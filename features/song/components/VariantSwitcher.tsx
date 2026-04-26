"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Check, Eye, Plus } from "lucide-react";
import type { SongVariant } from "@/features/song/types";
import Link from "next/link";
import { useHaptics } from "@/shared/hooks/useHaptics";

interface Props {
  variants: SongVariant[];
  activeVariantId?: string;
  addVariantHref?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function VariantSwitcher({ variants, activeVariantId, addVariantHref }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { trigger } = useHaptics();

  const hasChoice = variants.length > 1 || !!addVariantHref;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!hasChoice) return null;

  const active =
    variants.find((v) => v.id === activeVariantId) ||
    variants.find((v) => v.isPrimary) ||
    variants[0];

  const hrefFor = (v: SongVariant) => `${pathname}?v=${v.id}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { trigger("selection"); setOpen((o) => !o); }}
        className="te-pressable flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-wide"
        style={{
          borderRadius: "0.75rem",
          color: "var(--text)",
          minWidth: 140,
          justifyContent: "space-between",
        }}
      >
        <span className="truncate">{active?.label ?? "Основний"}</span>
        <ChevronDown size={14} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          className="te-surface absolute right-0 z-30 mt-2 overflow-hidden"
          style={{
            borderRadius: "1rem",
            minWidth: 280,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          <ul className="py-1">
            {variants.map((v) => {
              const isActive = v.id === active?.id;
              return (
                <li key={v.id}>
                  <Link
                    href={hrefFor(v)}
                    onClick={() => { trigger("selection"); setOpen(false); }}
                    className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-[var(--bg-hover,rgba(255,255,255,0.03))]"
                    style={{ color: "var(--text)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{v.label}</span>
                        {v.isPrimary && (
                          <span
                            className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5"
                            style={{
                              borderRadius: 4,
                              color: "var(--orange)",
                              background: "rgba(255,140,60,0.12)",
                            }}
                          >
                            Основний
                          </span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-3 mt-0.5 text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <span>{formatDate(v.createdAt)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye size={11} /> {v.views.toLocaleString("uk-UA")}
                        </span>
                      </div>
                    </div>
                    {isActive && (
                      <Check size={14} style={{ color: "var(--orange)", marginTop: 3 }} />
                    )}
                  </Link>
                </li>
              );
            })}
            {addVariantHref && (
              <li
                className="border-t mt-1 pt-1"
                style={{ borderColor: "var(--border, rgba(255,255,255,0.06))" }}
              >
                <Link
                  href={addVariantHref}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-xs font-bold"
                  style={{ color: "var(--orange)" }}
                  onClick={() => { trigger("light"); setOpen(false); }}
                >
                  <Plus size={13} />
                  Додати варіант
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
