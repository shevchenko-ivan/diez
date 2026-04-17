"use client";

import { useState } from "react";

type Slot = "D" | "U" | "Dx" | "Ux" | "-";
const CYCLE: Slot[] = ["-", "D", "U", "Dx", "Ux"];

interface Props {
  name: string;
  defaultValue?: string[] | null;
}

// Visual strumming editor. Each slot cycles through: empty → D → U → Dx (muted down)
// → Ux (muted up). The form submits a JSON array of active strokes (empty slots
// dropped) under the given name.
export function StrummingEditor({ name, defaultValue }: Props) {
  const initial: Slot[] =
    defaultValue && defaultValue.length > 0
      ? (defaultValue as Slot[])
      : Array(8).fill("-");

  const [pattern, setPattern] = useState<Slot[]>(initial);

  const cycle = (i: number) => {
    setPattern((p) => {
      const next = [...p];
      const idx = CYCLE.indexOf(next[i]);
      next[i] = CYCLE[(idx + 1) % CYCLE.length];
      return next;
    });
  };

  const resize = (len: number) => {
    setPattern((p) => {
      if (len === p.length) return p;
      if (len > p.length) return [...p, ...Array(len - p.length).fill("-" as Slot)];
      return p.slice(0, len);
    });
  };

  const clear = () => setPattern(pattern.map(() => "-" as Slot));

  const serialized = JSON.stringify(pattern.filter((s) => s !== "-"));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={serialized} />

      <div className="flex gap-1 flex-wrap">
        {pattern.map((s, i) => {
          const isEmpty = s === "-";
          const isDown = s.startsWith("D");
          const isMute = s.endsWith("x");
          return (
            <button
              key={i}
              type="button"
              onClick={() => cycle(i)}
              className="te-inset flex flex-col items-center justify-center transition-all"
              style={{
                width: "36px",
                height: "44px",
                borderRadius: "0.625rem",
                color: isEmpty
                  ? "var(--text-muted)"
                  : isMute
                  ? "var(--text-muted)"
                  : "var(--orange)",
                opacity: isEmpty ? 0.5 : isMute ? 0.7 : 1,
                fontWeight: 700,
              }}
              aria-label={`Крок ${i + 1}: ${isEmpty ? "пауза" : s}`}
            >
              <span style={{ fontSize: "18px", lineHeight: 1 }}>
                {isEmpty ? "·" : isDown ? "↓" : "↑"}
              </span>
              {isMute && (
                <span style={{ fontSize: "9px", marginTop: "2px", letterSpacing: "0.05em" }}>
                  mute
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[11px] font-mono">
        <span style={{ color: "var(--text-muted)" }}>Кроків:</span>
        {[4, 6, 8, 12, 16].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => resize(n)}
            className="te-inset px-2 py-1"
            style={{
              borderRadius: "0.5rem",
              color: pattern.length === n ? "var(--orange)" : "var(--text-muted)",
              fontWeight: pattern.length === n ? 700 : 400,
            }}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          className="te-inset px-2 py-1 ml-auto"
          style={{ borderRadius: "0.5rem", color: "var(--text-muted)" }}
        >
          Очистити
        </button>
      </div>

      <p className="text-[11px] font-mono opacity-50" style={{ color: "var(--text-muted)" }}>
        Клік перемикає: · → ↓ → ↑ → ↓mute → ↑mute
      </p>
    </div>
  );
}
