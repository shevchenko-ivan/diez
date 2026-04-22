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

      {/* Explicit flag so the server action knows whether the user wants rhythm. */}
      <input type="hidden" name="rhythm_enabled" value={enabled ? "on" : ""} />

      {enabled && (
        <div className="space-y-4 mt-6">{children}</div>
      )}
    </div>
  );
}
