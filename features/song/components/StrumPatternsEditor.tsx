"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save, X, ChevronDown } from "lucide-react";
import type { StrumPattern, Stroke, NoteLength } from "@/features/song/types";
import {
  createStrumPattern,
  updateStrumPattern,
  deleteStrumPattern,
} from "@/features/song/actions/strumming-patterns";

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
 */
export function StrumPatternsEditor({ songId, initial }: Props) {
  const [patterns, setPatterns] = useState<StrumPattern[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
    <div className="space-y-3">
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
    <div className="flex items-center gap-0.5">
      {visible.map((s, i) => (
        <span
          key={i}
          style={{
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

      {/* Strokes editor */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Удари — клік перемикає: ↓ → ↓&gt; → ↓×  → ↑ → ↑&gt; → ↑× → · (пауза) → ↓
        </div>
        <div className="flex flex-wrap items-end gap-1 p-2 rounded-lg" style={{ background: "var(--surface, rgba(0,0,0,0.02))" }}>
          {strokes.map((s, i) => (
            <StrokeButton key={i} stroke={s} onClick={() => cycleStroke(i)} />
          ))}
          <div className="flex flex-col gap-1 ml-1">
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

function StrokeButton({ stroke, onClick }: { stroke: Stroke; onClick: () => void }) {
  const isDown = stroke.d === "D";
  const isMute = stroke.m === true;
  const isAccent = stroke.a === true;
  const isRest = stroke.r === true;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center"
      style={{
        width: 24,
        height: 32,
        borderRadius: "0.4rem",
        background: "var(--surface-active, rgba(0,0,0,0.04))",
        border: isAccent ? "1.5px solid var(--orange)" : "1px solid transparent",
        opacity: isRest ? 0.4 : isMute ? 0.65 : 1,
        color: isDown ? "var(--text)" : "var(--text-muted)",
        fontSize: 16,
        fontWeight: isAccent ? 900 : 700,
        cursor: "pointer",
        position: "relative",
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
