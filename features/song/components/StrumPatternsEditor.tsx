"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Trash2, Save, X, ChevronDown, ChevronUp, Play, Square } from "lucide-react";
import type { StrumPattern, Stroke, NoteLength } from "@/features/song/types";
import {
  createStrumPattern,
  updateStrumPattern,
  deleteStrumPattern,
} from "@/features/song/actions/strumming-patterns";
import { playStroke, intervalFor } from "@/features/song/lib/strumming-audio";
import { STRUM_PRESETS, type StrumPreset } from "@/features/song/lib/strum-presets";

import { ToggleKnob } from "@/shared/components/ToggleKnob";

interface Props {
  songId: string;
  initial: StrumPattern[];
}

const NOTE_LENGTHS: { value: NoteLength; label: string }[] = [
  { value: "1/4", label: "1/4" },
  { value: "1/8", label: "1/8" },
  { value: "1/16", label: "1/16" },
  { value: "1/4t", label: "1/4 triplet" },
  { value: "1/8t", label: "1/8 triplet" },
  { value: "1/16t", label: "1/16 triplet" },
];

/**
 * Admin editor for the per-song list of strumming patterns. Keeps a local
 * copy of the patterns so adding/editing/deleting feels instant; persists
 * each change via server actions and refetches via revalidatePath.
 *
 * Renders its own heading + toggle so the block can be collapsed when the
 * song has no rhythm. The toggle is purely UI — patterns persist either way
 * (the viewer just hides the block when there are no patterns).
 */
export function StrumPatternsEditor({ songId, initial }: Props) {
  const [patterns, setPatterns] = useState<StrumPattern[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Default expanded only if the song already has patterns. Admin can toggle
  // to add the first pattern.
  const [expanded, setExpanded] = useState(initial.length > 0);

  function handleSaved(updated: StrumPattern) {
    setPatterns((prev) => {
      const exists = prev.find((p) => p.id === updated.id);
      if (exists) return prev.map((p) => (p.id === updated.id ? updated : p));
      return [...prev, updated];
    });
    setEditingId(null);
    setAdding(false);
  }

  function handleDeleted(id: string) {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
    setEditingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold uppercase tracking-tighter" style={{ color: "var(--text)" }}>
            Бої / патерни
          </h2>
          {expanded && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Кілька патернів для різних частин пісні (Main, Pre-Chorus, Chorus...). Кожен зі своїм темпом, тривалістю ноти, акцентами.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Згорнути бої" : "Розгорнути бої"}
          className="flex-shrink-0"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <ToggleKnob active={expanded} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 mt-5">
      {patterns.length === 0 && !adding && (
        <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
          Жодного патерну. Додайте перший — він стане Main Pattern.
        </p>
      )}

      {patterns.map((p) =>
        editingId === p.id ? (
          <PatternForm
            key={p.id}
            songId={songId}
            initial={p}
            onSaved={handleSaved}
            onCancel={() => setEditingId(null)}
            onDeleted={handleDeleted}
          />
        ) : (
          <PatternRow
            key={p.id}
            pattern={p}
            onEdit={() => setEditingId(p.id)}
          />
        ),
      )}

      {adding ? (
        <PatternForm
          songId={songId}
          onSaved={handleSaved}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="te-pressable flex items-center gap-2 px-3 py-2 text-xs font-bold"
          style={{ borderRadius: "0.75rem", color: "var(--orange)" }}
        >
          <Plus size={14} /> Додати патерн
        </button>
      )}
        </div>
      )}
    </div>
  );
}

// ─── List row (read-only summary) ────────────────────────────────────────────

function PatternRow({ pattern, onEdit }: { pattern: StrumPattern; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="te-pressable w-full text-left p-3 flex items-center gap-3"
      style={{ borderRadius: "1rem" }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
          {pattern.name}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {pattern.tempo} bpm · {pattern.noteLength} · {pattern.strokes.length} strokes
        </div>
      </div>
      <StrokesPreview strokes={pattern.strokes} />
    </button>
  );
}

function StrokesPreview({ strokes }: { strokes: Stroke[] }) {
  const visible = strokes.slice(0, 16);
  return (
    <div className="flex items-center gap-0.5 flex-wrap max-w-full">
      {visible.map((s, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 10,
            textAlign: "center",
            fontSize: 12,
            fontWeight: s.a ? 900 : 600,
            opacity: s.r ? 0.3 : s.m ? 0.55 : 1,
            color: s.d === "D" ? "var(--text)" : "var(--text-muted)",
          }}
        >
          {s.r ? "·" : s.d === "D" ? "↓" : "↑"}
        </span>
      ))}
      {strokes.length > visible.length && (
        <span className="text-[10px] ml-0.5" style={{ color: "var(--text-muted)" }}>
          +{strokes.length - visible.length}
        </span>
      )}
    </div>
  );
}

// ─── Single-pattern form ─────────────────────────────────────────────────────

interface FormProps {
  songId: string;
  initial?: StrumPattern;
  onSaved: (p: StrumPattern) => void;
  onCancel: () => void;
  onDeleted?: (id: string) => void;
}

function PatternForm({ songId, initial, onSaved, onCancel, onDeleted }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "Main Pattern");
  const [tempo, setTempo] = useState(initial?.tempo ?? 100);
  const [noteLength, setNoteLength] = useState<NoteLength>(initial?.noteLength ?? "1/8");
  const [strokes, setStrokes] = useState<Stroke[]>(initial?.strokes ?? defaultStrokes());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function applyPreset(preset: StrumPreset) {
    setStrokes(preset.strokes.map((s) => ({ ...s })));
    setNoteLength(preset.noteLength);
  }

  // Preview playback — same engine as the read-only viewer so the admin hears
  // exactly what users will hear. Re-runs on tempo/noteLength/strokes changes
  // so edits during playback take effect immediately on the next loop tick.
  useEffect(() => {
    if (!playing || !audioCtxRef.current || strokes.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const audioCtx = audioCtxRef.current;
    const intervalMs = intervalFor(noteLength, tempo);
    let i = 0;
    const tick = () => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const stroke = strokes[i];
      setActiveIndex(i);
      if (stroke && !stroke.r) playStroke(audioCtx, stroke);
      i = (i + 1) % strokes.length;
    };
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [playing, strokes, tempo, noteLength]);

  // Tear down the AudioContext on unmount so we don't leak audio nodes when
  // the admin cancels/saves while the preview is still ticking.
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  function togglePlay() {
    if (!audioCtxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    setPlaying((p) => !p);
  }

  function cycleStroke(i: number) {
    setStrokes((prev) => {
      const next = [...prev];
      next[i] = nextStrokeState(next[i]);
      return next;
    });
  }

  function addStroke() {
    setStrokes((prev) => [...prev, { d: "D" }]);
  }
  function removeStroke() {
    setStrokes((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function applyTemplate(template: NoteLength | "custom") {
    if (template === "custom") return;
    const map: Record<string, Stroke[]> = {
      "1/4": [{ d: "D", a: true }, { d: "D" }, { d: "D" }, { d: "D" }],
      "1/8": [
        { d: "D", a: true }, { d: "U" }, { d: "D" }, { d: "U" },
        { d: "D" }, { d: "U" }, { d: "D" }, { d: "U" },
      ],
      "1/16": new Array(16).fill(0).map((_, i) => ({
        d: i % 2 === 0 ? "D" as const : "U" as const,
        ...(i === 0 ? { a: true } : {}),
      })),
      "1/8t": new Array(12).fill(0).map((_, i) => ({
        d: i % 2 === 0 ? "D" as const : "U" as const,
        ...(i % 3 === 0 ? { a: true } : {}),
      })),
      "1/4t": new Array(6).fill(0).map((_, i) => ({
        d: "D" as const,
        ...(i % 3 === 0 ? { a: true } : {}),
      })),
      "1/16t": new Array(12).fill(0).map((_, i) => ({
        d: i % 2 === 0 ? "D" as const : "U" as const,
        ...(i % 3 === 0 ? { a: true } : {}),
      })),
    };
    if (map[template]) {
      setStrokes(map[template]);
      setNoteLength(template);
    }
  }

  function handleSubmit() {
    setError(null);
    const isCreating = !initial;
    const action = isCreating ? createStrumPattern : updateStrumPattern;

    const fd = new FormData();
    if (isCreating) fd.set("songId", songId);
    else fd.set("id", initial!.id);
    fd.set("name", name);
    fd.set("tempo", String(tempo));
    fd.set("noteLength", noteLength);
    fd.set("strokes", JSON.stringify(strokes));

    startTransition(async () => {
      try {
        await action(fd);
        // Optimistic local update — the server-side revalidation will reload
        // the canonical list on the next navigation.
        onSaved({
          id: initial?.id ?? `tmp-${Date.now()}`,
          position: initial?.position ?? 999,
          name,
          tempo,
          noteLength,
          strokes,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Помилка");
      }
    });
  }

  function handleDelete() {
    if (!initial) return;
    if (!window.confirm(`Видалити патерн «${name}»?`)) return;
    const fd = new FormData();
    fd.set("id", initial.id);
    startTransition(async () => {
      try {
        await deleteStrumPattern(fd);
        onDeleted?.(initial.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Помилка");
      }
    });
  }

  return (
    <div
      className="te-inset p-4 space-y-3"
      style={{ borderRadius: "1rem" }}
      role="group"
      aria-label="Редактор патерну"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Зупинити прослуховування" : "Прослухати патерн"}
          title={playing ? "Зупинити" : "Прослухати"}
          className="flex items-center justify-center rounded-full transition-colors flex-shrink-0"
          style={{
            width: 26,
            height: 26,
            background: playing ? "var(--orange)" : "transparent",
            color: playing ? "#FFF" : "var(--text)",
            border: playing ? "none" : "1.5px solid var(--text)",
          }}
        >
          {playing ? (
            <Square size={10} fill="currentColor" />
          ) : (
            <Play size={11} fill="currentColor" style={{ marginLeft: 1 }} />
          )}
        </button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Назва (наприклад, Main Pattern)"
          className="field-input flex-1 text-sm"
          style={{ color: "var(--text)" }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <span className="font-bold" style={{ color: "var(--text-muted)" }}>BPM</span>
          <input
            type="number"
            min={30}
            max={320}
            value={tempo}
            onChange={(e) => setTempo(parseInt(e.target.value, 10) || 100)}
            className="field-input w-20 text-sm"
            style={{ color: "var(--text)" }}
          />
        </label>

        <label className="flex items-center gap-2 text-xs">
          <span className="font-bold" style={{ color: "var(--text-muted)" }}>Тривалість</span>
          <div className="relative">
            <select
              value={noteLength}
              onChange={(e) => setNoteLength(e.target.value as NoteLength)}
              className="field-input pr-7 text-sm appearance-none"
              style={{ color: "var(--text)" }}
            >
              {NOTE_LENGTHS.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          </div>
        </label>

        <button
          type="button"
          onClick={() => applyTemplate(noteLength)}
          className="te-pressable px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ borderRadius: "0.6rem", color: "var(--text-muted)" }}
          title="Заповнити стандартним патерном для обраної тривалості"
        >
          Шаблон
        </button>
      </div>

      {/* Presets gallery — one-click application of common patterns. Replaces
          the current strokes + noteLength entirely, then admin fine-tunes. */}
      <div>
        <button
          type="button"
          onClick={() => setPresetsOpen((v) => !v)}
          className="te-pressable flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ borderRadius: "0.6rem", color: "var(--text-muted)" }}
        >
          {presetsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Стандартні шаблони
        </button>
        {presetsOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {STRUM_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="te-pressable flex flex-col items-start gap-1 p-2 text-left min-w-0 overflow-hidden"
                style={{ borderRadius: "0.6rem" }}
                title={`Застосувати «${preset.label}»`}
              >
                <div className="flex items-center justify-between w-full gap-2 min-w-0">
                  <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>
                    {preset.label}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {preset.noteLength}
                  </span>
                </div>
                <StrokesPreview strokes={preset.strokes} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Strokes editor — strokes grouped by beat, with beat numbers and a
          triplet bracket beneath triplet groups. Mirrors the read-only viewer
          (PatternPlayer) so the admin sees what the user will see. */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Удари — клік перемикає: ↓ → ↓&gt; → ↓×  → ↑ → ↑&gt; → ↑× → · (пауза) → ↓
        </div>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2 p-2 rounded-lg" style={{ background: "var(--surface, rgba(0,0,0,0.02))" }}>
          {groupStrokesByBeat(strokes, noteLength).map((b) => (
            <EditableBeatGroup
              key={b.startIndex}
              strokes={b.strokes}
              startIndex={b.startIndex}
              beatNumber={b.beatNumber}
              isTriplet={noteLength.endsWith("t")}
              activeIndex={activeIndex}
              onCycle={cycleStroke}
            />
          ))}
          <div className="flex flex-col gap-1 ml-1 self-center">
            <button type="button" onClick={addStroke} className="te-pressable w-7 h-6 flex items-center justify-center" style={{ borderRadius: "0.4rem", color: "var(--orange)" }} title="Додати удар">
              <Plus size={12} strokeWidth={2.5} />
            </button>
            <button type="button" onClick={removeStroke} className="te-pressable w-7 h-6 flex items-center justify-center" style={{ borderRadius: "0.4rem", color: "var(--text-muted)" }} title="Прибрати останній">
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs" style={{ color: "var(--danger, #e46060)" }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="te-pressable flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
            style={{ borderRadius: "0.75rem", color: "var(--orange)", opacity: pending ? 0.5 : 1 }}
          >
            <Save size={12} /> Зберегти
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="te-pressable px-3 py-1.5 text-xs font-bold"
            style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
          >
            Скасувати
          </button>
        </div>
        {initial && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="te-pressable flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
            style={{ borderRadius: "0.75rem", color: "var(--danger, #e46060)" }}
          >
            <Trash2 size={12} /> Видалити
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Beat grouping (mirrors the viewer) ──────────────────────────────────────

interface EditableBeat {
  strokes: Stroke[];
  startIndex: number;
  beatNumber: number;
}

function groupStrokesByBeat(strokes: Stroke[], nl: NoteLength): EditableBeat[] {
  const size = strokesPerBeat(nl);
  const out: EditableBeat[] = [];
  for (let i = 0, beat = 1; i < strokes.length; i += size, beat += 1) {
    out.push({ strokes: strokes.slice(i, i + size), startIndex: i, beatNumber: beat });
  }
  return out;
}

function strokesPerBeat(nl: NoteLength): number {
  switch (nl) {
    case "1/4": return 1;
    case "1/8": return 2;
    case "1/16": return 4;
    case "1/4t": return 3;
    case "1/8t": return 3;
    case "1/16t": return 6;
  }
}

function EditableBeatGroup({
  strokes,
  startIndex,
  beatNumber,
  isTriplet,
  activeIndex,
  onCycle,
}: {
  strokes: Stroke[];
  startIndex: number;
  beatNumber: number;
  isTriplet: boolean;
  activeIndex: number;
  onCycle: (i: number) => void;
}) {
  const cellW = 24;
  return (
    <div className="flex flex-col items-stretch" style={{ minWidth: cellW * strokes.length }}>
      {/* Stroke buttons */}
      <div className="flex items-end gap-0.5">
        {strokes.map((s, i) => (
          <StrokeButton
            key={i}
            stroke={s}
            active={activeIndex === startIndex + i}
            onClick={() => onCycle(startIndex + i)}
          />
        ))}
      </div>

      {/* Subdivision labels — under EACH stroke, like sheet music: 1 & 2 & for
          eighths, 1 e & a for sixteenths. Triplets just label the downbeat
          (the "3" bracket below carries the rhythmic info). */}
      <div className="flex">
        {strokes.map((_, i) => (
          <div
            key={i}
            style={{
              width: cellW,
              textAlign: "center",
              fontSize: 11,
              fontWeight: i === 0 ? 700 : 600,
              color: "var(--text-muted)",
              lineHeight: "14px",
              opacity: i === 0 ? 1 : 0.7,
            }}
          >
            {subdivisionLabel(i, strokes.length, beatNumber, isTriplet)}
          </div>
        ))}
      </div>

      {/* Beam line — like the underline of beamed notes in sheet music. For
          triplets we also draw a "3" badge floating over the line. */}
      {strokes.length > 1 && (
        <div style={{ position: "relative", height: 10, marginTop: 1 }}>
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 3,
              right: 3,
              height: 0,
              borderTop: "1.5px solid var(--text-muted)",
              opacity: 0.55,
            }}
          />
          {isTriplet && strokes.length === 3 && (
            <div
              style={{
                position: "absolute",
                top: -1,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 9,
                fontWeight: 700,
                color: "var(--text-muted)",
                background: "var(--surface, #FFF)",
                padding: "0 3px",
                lineHeight: "12px",
              }}
            >
              3
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Sheet-music-style label for one stroke inside its beat (Ukrainian counting):
 *   1/4   → "1"
 *   1/8   → "1 і"
 *   1/16  → "1 та і та"
 *   1/4t  → "1" + bracket (downbeat only; the bracket carries the "3")
 *   1/8t  → "1" + bracket
 *   1/16t → "1" + bracket
 */
function subdivisionLabel(
  indexInBeat: number,
  beatSize: number,
  beatNumber: number,
  isTriplet: boolean,
): string {
  if (indexInBeat === 0) return String(beatNumber);
  if (isTriplet) return ""; // bracket carries the meaning
  if (beatSize === 2) return "і"; // 1/8
  if (beatSize === 4) return ["", "та", "і", "та"][indexInBeat] ?? ""; // 1/16
  return "";
}

function StrokeButton({
  stroke,
  active,
  onClick,
}: {
  stroke: Stroke;
  active: boolean;
  onClick: () => void;
}) {
  const isDown = stroke.d === "D";
  const isMute = stroke.m === true;
  const isAccent = stroke.a === true;
  const isRest = stroke.r === true;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center transition-all"
      style={{
        width: 24,
        height: 32,
        borderRadius: "0.4rem",
        background: active
          ? "rgba(255,136,0,0.18)"
          : "var(--surface-active, rgba(0,0,0,0.04))",
        border: isAccent ? "1.5px solid var(--orange)" : "1px solid transparent",
        opacity: isRest ? 0.4 : isMute ? 0.65 : 1,
        color: active ? "var(--orange)" : isDown ? "var(--text)" : "var(--text-muted)",
        fontSize: 16,
        fontWeight: isAccent ? 900 : 700,
        cursor: "pointer",
        position: "relative",
        transform: active ? "scale(1.15)" : "scale(1)",
      }}
      title={describeStroke(stroke)}
    >
      {isAccent && (
        <span style={{ position: "absolute", top: -2, fontSize: 9, color: "var(--orange)", fontWeight: 900 }}>&gt;</span>
      )}
      {isRest ? "·" : isDown ? "↓" : "↑"}
      {isMute && !isRest && (
        <span style={{ position: "absolute", bottom: 2, right: 2, fontSize: 8, color: "var(--text-muted)" }}>×</span>
      )}
    </button>
  );
}

// ─── Stroke state machine ────────────────────────────────────────────────────

function nextStrokeState(s: Stroke): Stroke {
  // Cycle: D → D! → Dx → U → U! → Ux → R → D
  if (s.r) return { d: "D" };
  if (s.d === "D") {
    if (s.m) return { d: "U" };
    if (s.a) return { d: "D", m: true };
    return { d: "D", a: true };
  }
  // Up
  if (s.m) return { d: "D", r: true };
  if (s.a) return { d: "U", m: true };
  return { d: "U", a: true };
}

function describeStroke(s: Stroke): string {
  if (s.r) return "Пауза";
  const dir = s.d === "D" ? "Униз" : "Угору";
  const parts = [dir];
  if (s.a) parts.push("акцент");
  if (s.m) parts.push("приглушено");
  return parts.join(", ");
}

function defaultStrokes(): Stroke[] {
  return [
    { d: "D", a: true }, { d: "U" }, { d: "D" }, { d: "U" },
    { d: "D" }, { d: "U" }, { d: "D" }, { d: "U" },
  ];
}
