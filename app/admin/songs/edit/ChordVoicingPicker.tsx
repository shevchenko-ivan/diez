"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ChordDiagram, lookupChord, type ChordDef } from "@/features/song/components/ChordDiagram";
import { CustomVoicingBuilder } from "./CustomVoicingBuilder";

interface Props {
  /** Chord names to show voicings for (deduped client-side). */
  chords: string[];
  /** Controlled map: chord -> picked index in the combined list (0 = default). */
  picks: Record<string, number>;
  /** Admin-drawn custom shapes per chord (appended after the presets). */
  custom: Record<string, ChordDef>;
  /** Called when the admin picks a voicing. idx 0 means "default" (key removed). */
  onPick: (chord: string, idx: number) => void;
  /** Called when a custom shape is saved (also selects it as default). */
  onCustom: (chord: string, def: ChordDef) => void;
  /** Called when a saved custom shape is deleted. */
  onDeleteCustom: (chord: string) => void;
}

/**
 * Controlled voicing grid. For each unique chord, renders the preset CHORD_DB
 * voicings plus any admin-drawn custom shape as a horizontal strip; clicking
 * one marks it the default voicing the public viewer sees first. "Створити
 * свою" opens a mini fret editor inline. State lives in the parent
 * (VoicingsSection) so the picker can be mounted/unmounted on demand.
 */
export function ChordVoicingPicker({ chords, picks, custom, onPick, onCustom, onDeleteCustom }: Props) {
  const uniqueChords = useMemo(
    () => Array.from(new Set(chords)).filter(Boolean),
    [chords],
  );
  const [editing, setEditing] = useState<string | null>(null);

  if (uniqueChords.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        У тексті не знайдено акордів. Додай акорди над словами й натисни «Визначити аплікатури» ще раз.
      </p>
    );
  }

  return (
    <ul className="space-y-5">
      {uniqueChords.map((chord) => {
        const presets = (lookupChord(chord) ?? []) as ChordDef[];
        const customDef = custom[chord] ?? null;
        // Combined list mirrors the viewer: presets first, custom appended last.
        const customIdx = presets.length;
        const total = presets.length + (customDef ? 1 : 0);
        const activeIdx = picks[chord] ?? 0;
        return (
          <li key={chord}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm" style={{ color: "var(--orange)" }}>
                {chord}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {total <= 1 ? `${total} аплікатура` : `${activeIdx + 1} / ${total}`}
              </span>
              <button
                type="button"
                onClick={() => setEditing((c) => (c === chord ? null : chord))}
                className="te-pressable ml-auto px-2 py-1 text-[11px] font-bold flex items-center gap-1"
                style={{ borderRadius: "0.5rem", color: "var(--text-muted)" }}
              >
                {customDef ? <Pencil size={12} /> : <Plus size={12} />}
                {customDef ? "Редагувати свою" : "Створити свою"}
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollSnapType: "x mandatory" }}>
              {presets.map((def, idx) => (
                <VoicingButton
                  key={idx}
                  chord={chord}
                  def={def}
                  active={idx === activeIdx}
                  onClick={() => onPick(chord, idx)}
                />
              ))}
              {customDef && (
                <VoicingButton
                  chord={chord}
                  def={customDef}
                  active={activeIdx === customIdx}
                  badge="своя"
                  onClick={() => onPick(chord, customIdx)}
                />
              )}
            </div>

            {editing === chord && (
              <CustomVoicingBuilder
                chord={chord}
                initial={customDef}
                usedAsDefault={activeIdx === customIdx}
                onSave={(def) => {
                  onCustom(chord, def);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
                onDelete={
                  customDef
                    ? () => {
                        onDeleteCustom(chord);
                        setEditing(null);
                      }
                    : undefined
                }
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function VoicingButton({
  chord, def, active, badge, onClick,
}: {
  chord: string;
  def: ChordDef;
  active: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="te-pressable shrink-0 flex flex-col items-center relative"
      style={{
        scrollSnapAlign: "start",
        padding: "8px 10px",
        borderRadius: "0.75rem",
        border: "2px solid",
        borderColor: active ? "var(--orange)" : "transparent",
        background: active ? "rgba(255,140,60,0.08)" : "transparent",
      }}
      title={active ? "Обрано як основну" : "Зробити основною"}
    >
      {badge && (
        <span
          className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5"
          style={{ borderRadius: 4, color: "var(--orange)", background: "rgba(255,140,60,0.14)" }}
        >
          {badge}
        </span>
      )}
      <ChordDiagram name={chord} def={def} width={70} height={88} />
    </button>
  );
}
