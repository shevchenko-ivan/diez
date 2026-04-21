"use client";

import { useState, type ReactNode } from "react";
import { ToggleKnob } from "@/shared/components/ToggleKnob";

interface Props {
  initialEnabled: boolean;
  children: ReactNode;
}

export function RhythmBlock({ initialEnabled, children }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);

  return (
    <div className="te-surface p-8 md:p-10 mb-6" style={{ borderRadius: "2rem" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          Ритм
        </h2>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className="flex-shrink-0"
          aria-label={enabled ? "Вимкнути ритм" : "Увімкнути ритм"}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <ToggleKnob active={enabled} />
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateRows: enabled ? "1fr" : "0fr",
          transition: "grid-template-rows 220ms ease, margin-top 220ms ease",
          marginTop: enabled ? 24 : 0,
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
