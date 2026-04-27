"use client";

import type { StrumPattern } from "@/features/song/types";
import { PatternPlayer } from "./PatternPlayer";

interface Props {
  patterns: StrumPattern[];
}

/**
 * Sidebar block showing all strumming patterns for a song. Mirrors the
 * Ultimate Guitar layout: stacked patterns each with its own header
 * (name + bpm + play) and stroke row.
 */
export function StrumPatternList({ patterns }: Props) {
  if (patterns.length === 0) return null;

  return (
    <div
      className="space-y-3 px-3 py-3"
      style={{
        borderRadius: "0.75rem",
        border: "1px solid var(--border, rgba(0,0,0,0.06))",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Бій
        </span>
      </div>
      <div className="space-y-4">
        {patterns.map((p) => (
          <PatternPlayer key={p.id} pattern={p} />
        ))}
      </div>
    </div>
  );
}
