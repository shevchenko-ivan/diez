"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Flag, X, CheckCircle2 } from "lucide-react";
import { reportSong } from "@/features/song/actions/reports";

const REASONS = [
  { value: "russian", label: "Російськомовний контент" },
  { value: "copyright", label: "Порушення авторських прав" },
  { value: "wrong", label: "Неправильний текст / акорди" },
  { value: "spam", label: "Спам або сміття" },
  { value: "other", label: "Інше" },
];

export function ReportButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [result, formAction, pending] = useActionState(reportSong, null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-100"
        style={{ color: "var(--text-muted)", opacity: 0.7 }}
      >
        <Flag size={12} /> Поскаржитись
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="te-surface w-full max-w-md p-6 relative"
            style={{ borderRadius: "1.5rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрити"
              className="te-icon-btn"
              // Inline position beats the .te-icon-btn class (which sets
              // position: relative and would otherwise drop it inline).
              style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, color: "var(--text-muted)", zIndex: 1 }}
            >
              <X size={16} />
            </button>

            {result?.ok ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 size={36} style={{ color: "var(--orange)", margin: "0 auto" }} />
                <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Дякуємо за скаргу</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Ми розглянемо її якнайшвидше.
                </p>
                <button type="button" onClick={() => setOpen(false)} className="te-pill-btn px-5 py-2.5 text-sm font-bold">
                  Закрити
                </button>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <h3 className="text-base font-bold pr-8" style={{ color: "var(--text)" }}>Поскаржитись на пісню</h3>
                <input type="hidden" name="slug" value={slug} />

                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Причина</label>
                  <div className="space-y-1.5">
                    {REASONS.map((r, i) => (
                      <label key={r.value} className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
                        <input type="radio" name="reason" value={r.value} defaultChecked={i === 0} className="accent-orange-500" />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="te-inset p-3" style={{ borderRadius: "1rem" }}>
                  <textarea
                    name="details"
                    rows={3}
                    placeholder="Деталі (необовʼязково)"
                    className="w-full bg-transparent outline-none text-sm resize-y"
                    style={{ color: "var(--text)" }}
                  />
                </div>

                {result && !result.ok && (
                  <p className="text-xs" style={{ color: "#dc3c3c" }}>{result.message}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                    Скасувати
                  </button>
                  <button type="submit" disabled={pending} className="te-pill-btn px-5 py-2.5 text-sm font-bold disabled:opacity-50">
                    {pending ? "Надсилаємо…" : "Надіслати"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
