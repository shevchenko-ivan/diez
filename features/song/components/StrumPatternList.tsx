"use client";

import type { StrumPattern } from "@/features/song/types";
import { ControlBlock } from "@/shared/components/ControlBlock";
import { PatternPlayer } from "./PatternPlayer";

interface Props {
  patterns: StrumPattern[];
}

/**
 * Sidebar block showing all strumming patterns for a song. Wrapped in
 * ControlBlock to match the visual treatment of the other sidebar widgets
 * (Транспонування, Каподастр, Тюнер, Автоскрол).
 */
export function StrumPatternList({ patterns }: Props) {
  if (patterns.length === 0) return null;

  return (
    <ControlBlock label="Бій">
      <div className="space-y-4">
        {patterns.map((p) => (
          <PatternPlayer key={p.id} pattern={p} />
        ))}
      </div>
    </ControlBlock>
  );
}
