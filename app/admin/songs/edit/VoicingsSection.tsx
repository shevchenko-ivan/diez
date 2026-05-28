"use client";

import { useRef, useState } from "react";
import { Guitar, RefreshCw, ChevronUp } from "lucide-react";
import { parseLyricsWithChords } from "@/features/song/lib/parseLyrics";
import { lookupChord, type ChordDef } from "@/features/song/components/ChordDiagram";
import { ChordVoicingPicker } from "./ChordVoicingPicker";

interface Props {
  /** Saved per-variant preset-index map (chord -> index). Preserved when collapsed. */
  initial?: Record<string, number> | null;
  /** Saved per-variant custom shapes (chord -> ChordDef). */
  initialCustom?: Record<string, ChordDef> | null;
  /** name of the lyrics <textarea> in the same form. */
  lyricsFieldName?: string;
}

/**
 * On-demand voicing editor for the song form. Collapsed by default so it never
 * gets in the way. "Визначити аплікатури" parses the CURRENT lyrics textarea
 * (client-side, no save needed), extracts the chords and reveals the picker so
 * the admin can review or change default voicings — or draw a custom shape.
 *
 * Both maps serialize into always-present hidden inputs, so saved voicings
 * survive even if the admin never opens the picker.
 */
export function VoicingsSection({ initial, initialCustom, lyricsFieldName = "lyrics_with_chords" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [picks, setPicks] = useState<Record<string, number>>(() => ({ ...(initial ?? {}) }));
  const [custom, setCustom] = useState<Record<string, ChordDef>>(() => ({ ...(initialCustom ?? {}) }));
  const [chords, setChords] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);

  const determine = () => {
    const form = rootRef.current?.closest("form");
    const field = form?.elements.namedItem(lyricsFieldName) as HTMLTextAreaElement | null;
    const raw = field?.value ?? "";
    setChords(parseLyricsWithChords(raw).chords);
    setOpen(true);
  };

  const handlePick = (chord: string, idx: number) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (idx === 0) delete next[chord];
      else next[chord] = idx;
      return next;
    });
  };

  // Saving a custom shape stores it and selects it as the default (its index
  // is the preset count — it's appended after presets in the viewer too).
  const handleCustom = (chord: string, def: ChordDef) => {
    setCustom((prev) => ({ ...prev, [chord]: def }));
    const presetCount = (lookupChord(chord) ?? []).length;
    setPicks((prev) => ({ ...prev, [chord]: presetCount }));
  };

  // Deleting a custom shape removes it and, if it was the chord's default,
  // falls the default back to the first preset.
  const handleDeleteCustom = (chord: string) => {
    const presetCount = (lookupChord(chord) ?? []).length;
    setCustom((prev) => {
      const next = { ...prev };
      delete next[chord];
      return next;
    });
    setPicks((prev) => {
      if (prev[chord] !== presetCount) return prev;
      const next = { ...prev };
      delete next[chord];
      return next;
    });
  };

  return (
    <div ref={rootRef} className="te-surface p-5 md:p-6" style={{ borderRadius: "1.5rem" }}>
      {/* Both maps always submit, even when the picker is collapsed. */}
      <input type="hidden" name="chord_voicings" value={JSON.stringify(picks)} />
      <input type="hidden" name="custom_voicings" value={JSON.stringify(custom)} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-bold uppercase tracking-tighter" style={{ color: "var(--text)" }}>
            Аплікатури акордів
          </h2>
          {!open && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Визнач аплікатури з тексту, щоб переглянути, змінити основні або створити власну. Необовʼязково.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {open ? (
            <>
              <button
                type="button"
                onClick={determine}
                className="te-pressable px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
                title="Перечитати акорди з тексту"
              >
                <RefreshCw size={13} />
                Перевизначити
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="te-pressable px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
                title="Згорнути"
              >
                <ChevronUp size={13} />
                Згорнути
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={determine}
              className="te-pressable px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{ borderRadius: "0.75rem", color: "var(--orange)", background: "rgba(255,140,60,0.08)" }}
            >
              <Guitar size={15} />
              Визначити аплікатури
            </button>
          )}
        </div>
      </div>

      {open && chords !== null && (
        <div className="mt-5">
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            Натисни на аплікатуру, щоб зробити її основною. «Створити свою» — задати власну аплікатуру. Користувач може потім перемикнутися сам.
          </p>
          <ChordVoicingPicker
            chords={chords}
            picks={picks}
            custom={custom}
            onPick={handlePick}
            onCustom={handleCustom}
            onDeleteCustom={handleDeleteCustom}
          />
        </div>
      )}
    </div>
  );
}
