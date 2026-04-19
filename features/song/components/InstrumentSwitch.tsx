"use client";

import { useInstrument, type Instrument } from "@/shared/hooks/useInstrument";
import { useHaptics } from "@/shared/hooks/useHaptics";

const OPTIONS: { value: Instrument; label: string }[] = [
  { value: "guitar", label: "Гітара" },
  { value: "ukulele", label: "Укулеле" },
  { value: "piano", label: "Піаніно" },
];

export function InstrumentSwitch() {
  const [instrument, setInstrument] = useInstrument();
  const { trigger } = useHaptics();

  return (
    <div
      role="tablist"
      aria-label="Інструмент"
      className="te-inset flex rounded-full p-0.5"
      style={{ background: "var(--bg-inset, rgba(0,0,0,0.06))" }}
    >
      {OPTIONS.map((opt) => {
        const active = instrument === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) {
                trigger("light");
                setInstrument(opt.value);
              }
            }}
            className="flex-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-full transition-colors"
            style={{
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--orange)" : "var(--text-muted)",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : undefined,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
