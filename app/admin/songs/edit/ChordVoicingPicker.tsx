"use client";

import { useEffect, useMemo, useState } from "react";
import { ChordDiagram, lookupChord, type ChordDef } from "@/features/song/components/ChordDiagram";

interface Props {
  /** Chord names extracted from the variant's lyrics (deduped, in order). */
  chords: string[];
  /** Initial admin-picked voicing indexes (chord -> index in lookupChord array). */
  initial?: Record<string, number> | null;
  /** Hidden input name to submit the serialized map under. Default: "chord_voicings". */
  fieldName?: string;
}

/**
 * For each unique chord in the variant, render the available CHORD_DB voicings
 * as a horizontal strip. Clicking a diagram marks it as the default voicing
 * everyone sees first when opening the song. Public users can still flip
 * voicings locally (per-browser via localStorage).
 *
 * Serializes the picked map into a hidden input so the parent <form> picks it
 * up on submit without needing client/server state-sharing.
 */
export function ChordVoicingPicker({ chords, initial, fieldName = "chord_voicings" }: Props) {
  const uniqueChords = useMemo(
    () => Array.from(new Set(chords)).filter(Boolean),
    [chords],
  );
  const [picks, setPicks] = useState<Record<string, number>>(() => ({ ...(initial ?? {}) }));

  // Re-sync when the parent form switches variants (initial prop changes).
  useEffect(() => {
    setPicks({ ...(initial ?? {}) });
  }, [initial]);

  if (uniqueChords.length === 0) return null;

  return (
    <div className="te-surface p-5 md:p-6" style={{ borderRadius: "1.5rem" }}>
      <input type="hidden" name={fieldName} value={JSON.stringify(picks)} />
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          Аплікатури акордів
        </h2>
      </div>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
        Натисни на аплікатуру, щоб зробити її дефолтною для цього варіанта. Користувач може потім перемикнутися сам.
      </p>

      <ul className="space-y-5">
        {uniqueChords.map((chord) => {
          const voicings = (lookupChord(chord) ?? []) as ChordDef[];
          if (voicings.length === 0) return null;
          const activeIdx = picks[chord] ?? 0;
          return (
            <li key={chord}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-sm" style={{ color: "var(--orange)" }}>
                  {chord}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {voicings.length === 1
                    ? "1 аплікатура"
                    : `${activeIdx + 1} / ${voicings.length}`}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollSnapType: "x mandatory" }}>
                {voicings.map((def, idx) => {
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setPicks((prev) => {
                          const next = { ...prev };
                          if (idx === 0) delete next[chord];
                          else next[chord] = idx;
                          return next;
                        })
                      }
                      className="te-pressable shrink-0 flex flex-col items-center"
                      style={{
                        scrollSnapAlign: "start",
                        padding: "8px 10px",
                        borderRadius: "0.75rem",
                        border: "2px solid",
                        borderColor: isActive ? "var(--orange)" : "transparent",
                        background: isActive ? "rgba(255,140,60,0.08)" : "transparent",
                      }}
                      title={isActive ? "Обрано як дефолт" : "Зробити дефолтом"}
                    >
                      <ChordDiagram name={chord} def={def} width={70} height={88} />
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
