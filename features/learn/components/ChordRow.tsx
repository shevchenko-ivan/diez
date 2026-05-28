"use client";

import { ChordDiagram, lookupChord } from "@/features/song/components/ChordDiagram";

/**
 * Inline row of interactive chord diagrams for articles. Looks up each chord's
 * default voicing and renders the live ChordDiagram (clickable to hear it) —
 * the unique, non-text content that sets these articles apart from generic
 * guitar blogs.
 */
export function ChordRow({ names, caption }: { names: string[]; caption?: string }) {
  return (
    <span className="not-prose block my-6">
      <span className="flex flex-wrap gap-3">
        {names.map((name) => {
          const def = lookupChord(name)?.[0];
          if (!def) return null;
          return (
            <span
              key={name}
              className="te-surface inline-flex flex-col items-center"
              style={{ padding: "8px 10px", borderRadius: "0.9rem" }}
            >
              <ChordDiagram name={name} def={def} width={86} height={108} />
            </span>
          );
        })}
      </span>
      {caption && (
        <span className="block text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          {caption}
        </span>
      )}
    </span>
  );
}
