"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { ChordDiagram, type ChordDef } from "@/features/song/components/ChordDiagram";
import { TeButton } from "@/shared/components/TeButton";

interface Props {
  chord: string;
  /** Existing custom shape to edit, if any. */
  initial?: ChordDef | null;
  /** True when this custom shape is currently the chord's default — affects the delete warning. */
  usedAsDefault?: boolean;
  onSave: (def: ChordDef) => void;
  onCancel: () => void;
  /** Remove the saved custom shape. Only offered when editing an existing one. */
  onDelete?: () => void;
}

// String order matches ChordDef.strings: [low E, A, D, G, B, high e].
// Rendered left→right (low E leftmost, high e rightmost) like a chord diagram.
const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];
const STRINGS = [0, 1, 2, 3, 4, 5];
const VISIBLE_FRETS = 5;     // how many fret rows the window shows
const MAX_BASE_FRET = 17;    // so baseFret + 4 stays ≤ 21
const GUTTER = 16;           // left column width for fret numbers

// Internal fret state per string: -1 muted, 0 open, n absolute fret.
// A fresh shape starts fully muted — every string is explicitly ✕ until the
// admin opens it or frets it.
function fromDef(def?: ChordDef | null): number[] {
  if (!def || !Array.isArray(def.strings) || def.strings.length !== 6) {
    return [-1, -1, -1, -1, -1, -1];
  }
  return def.strings.map((s) => (s < 0 ? -1 : s));
}

/**
 * Compact 6×5 fret editor for hand-drawing one chord shape. Tap a fret to
 * place/remove a dot; tap a string's top marker to toggle open ↔ muted; step
 * the base fret to move the window up the neck. Barre is auto-detected by
 * ChordDiagram, so there's no separate control.
 */
export function CustomVoicingBuilder({ chord, initial, usedAsDefault, onSave, onCancel, onDelete }: Props) {
  const [frets, setFrets] = useState<number[]>(() => fromDef(initial));
  const [baseFret, setBaseFret] = useState<number>(() =>
    initial?.baseFret && initial.baseFret >= 1 ? Math.min(initial.baseFret, MAX_BASE_FRET) : 1,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const visibleFrets = Array.from({ length: VISIBLE_FRETS }, (_, i) => baseFret + i);
  const isEditing = !!initial;

  // Tap a fret: place it, or mute the string if it was already on that fret.
  const setFret = (strIdx: number, fret: number) =>
    setFrets((prev) => {
      const next = [...prev];
      next[strIdx] = next[strIdx] === fret ? -1 : fret;
      return next;
    });

  // Marker toggles muted ↔ open (a fretted string just switches to open).
  const cycleMarker = (strIdx: number) =>
    setFrets((prev) => {
      const next = [...prev];
      next[strIdx] = next[strIdx] === 0 ? -1 : 0;
      return next;
    });

  // Shift the visible window. Fretted notes outside the new window become
  // muted, so the preview matches what the grid shows.
  const changeBase = (delta: number) => {
    const next = Math.min(MAX_BASE_FRET, Math.max(1, baseFret + delta));
    if (next === baseFret) return;
    setBaseFret(next);
    setFrets((prev) => prev.map((f) => (f > 0 && (f < next || f > next + VISIBLE_FRETS - 1) ? -1 : f)));
  };

  const previewDef: ChordDef = { strings: frets, baseFret };
  const hasDot = frets.some((f) => f >= 0);

  return (
    <div className="mt-3">
      <div className="te-inset p-4" style={{ borderRadius: "1rem" }}>
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Editor grid — vertical chord-diagram orientation: strings left→right
              (low E … high e), frets top→bottom (1st fret on top). */}
          <div className="flex flex-col gap-1.5">
            {/* Base-fret stepper (inline, on top) */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Початковий лад
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => changeBase(-1)}
                  disabled={baseFret <= 1}
                  className="te-pressable flex items-center justify-center"
                  style={{ width: 22, height: 22, borderRadius: 6, color: "var(--text)", opacity: baseFret <= 1 ? 0.35 : 1 }}
                  aria-label="Нижче"
                >
                  <Minus size={13} />
                </button>
                <span className="font-mono font-bold text-sm text-center" style={{ width: 18, color: "var(--text)" }}>
                  {baseFret}
                </span>
                <button
                  type="button"
                  onClick={() => changeBase(1)}
                  disabled={baseFret >= MAX_BASE_FRET}
                  className="te-pressable flex items-center justify-center"
                  style={{ width: 22, height: 22, borderRadius: 6, color: "var(--text)", opacity: baseFret >= MAX_BASE_FRET ? 0.35 : 1 }}
                  aria-label="Вище"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* String letters */}
            <div className="flex items-center gap-1.5">
              <span style={{ width: GUTTER }} />
              {STRINGS.map((strIdx) => (
                <span key={strIdx} className="text-[10px] font-mono text-center" style={{ width: 22, color: "var(--text-muted)" }}>
                  {STRING_LABELS[strIdx]}
                </span>
              ))}
            </div>

            {/* Open / muted markers above each string */}
            <div className="flex items-center gap-1.5">
              <span style={{ width: GUTTER }} />
              {STRINGS.map((strIdx) => {
                const v = frets[strIdx];
                const markerLabel = v === 0 ? "O" : v === -1 ? "✕" : "";
                return (
                  <button
                    key={strIdx}
                    type="button"
                    onClick={() => cycleMarker(strIdx)}
                    className="te-pressable flex items-center justify-center text-[11px] font-bold"
                    style={{
                      width: 22, height: 22, borderRadius: 6,
                      color: v === -1 ? "var(--text-muted)" : "var(--orange)",
                    }}
                    title="Відкрита / заглушена струна"
                  >
                    {markerLabel}
                  </button>
                );
              })}
            </div>

            {/* Fret rows (window starts at baseFret, on top) */}
            {visibleFrets.map((fret) => (
              <div key={fret} className="flex items-center gap-1.5">
                <span className="text-[9px]" style={{ width: GUTTER, textAlign: "right", color: "var(--text-muted)" }}>
                  {fret}
                </span>
                {STRINGS.map((strIdx) => {
                  const active = frets[strIdx] === fret;
                  return (
                    <button
                      key={strIdx}
                      type="button"
                      onClick={() => setFret(strIdx, fret)}
                      className="te-pressable flex items-center justify-center"
                      style={{ width: 22, height: 22, borderRadius: 6 }}
                      aria-label={`Струна ${STRING_LABELS[strIdx]}, лад ${fret}`}
                    >
                      <span
                        style={{
                          width: 13, height: 13, borderRadius: 999,
                          background: active ? "var(--orange)" : "transparent",
                          border: active ? "none" : "1.5px solid var(--text-muted)",
                          opacity: active ? 1 : 0.3,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Live preview */}
          <ChordDiagram name={chord} def={previewDef} width={84} height={104} />
        </div>
      </div>

      {/* Actions — outside the editor surface, bottom-right. */}
      <div className="flex items-center justify-end gap-2 mt-3 flex-wrap">
        {isEditing && onDelete && (
          <TeButton shape="pill" type="button" tone="red" icon={Trash2} onClick={() => setConfirmingDelete(true)} className="mr-auto px-3 py-1.5 text-xs font-bold">
            Видалити
          </TeButton>
        )}
        <TeButton shape="pill" type="button" onClick={onCancel} className="px-4 py-1.5 text-xs font-bold">
          Скасувати
        </TeButton>
        <TeButton
          shape="pill"
          type="button"
          tone="orange"
          icon={Check}
          disabled={!hasDot}
          onClick={() => onSave(previewDef)}
          className="px-4 py-1.5 text-xs font-bold"
        >
          Зберегти аплікатуру
        </TeButton>
      </div>

      {confirmingDelete && onDelete && (
        <DeleteConfirmModal
          chord={chord}
          usedAsDefault={!!usedAsDefault}
          onConfirm={() => { setConfirmingDelete(false); onDelete(); }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({
  chord, usedAsDefault, onConfirm, onCancel,
}: {
  chord: string;
  usedAsDefault: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-voicing-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="te-surface p-6 max-w-sm w-full flex flex-col gap-4"
        style={{ borderRadius: "1.25rem" }}
      >
        <h2 id="delete-voicing-title" className="text-base font-bold" style={{ color: "var(--text)" }}>
          Видалити аплікатуру?
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {usedAsDefault
            ? `Власну аплікатуру для «${chord}» буде видалено. Зараз вона основна в цій пісні — основною знову стане стандартна аплікатура.`
            : `Власну аплікатуру для «${chord}» буде видалено.`}
        </p>
        <div className="flex items-center justify-end gap-2">
          <TeButton shape="pill" type="button" onClick={onCancel} className="px-4 py-1.5 text-xs font-bold">
            Скасувати
          </TeButton>
          <TeButton shape="pill" type="button" tone="red" icon={Trash2} onClick={onConfirm} className="px-4 py-1.5 text-xs font-bold">
            Так, видалити
          </TeButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
