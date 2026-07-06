"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Check, Wrench } from "lucide-react";
import { STRUM_PRESETS, type StrumPreset } from "@/features/song/lib/strum-presets";
import { playStroke, playMetronomeClick, intervalFor, strokesPerBeat } from "@/features/song/lib/strumming-audio";
import { StrumPatternsEditor } from "@/features/song/components/StrumPatternsEditor";
import { ToggleKnob } from "@/shared/components/ToggleKnob";
import type { Stroke, StrumPattern } from "@/features/song/types";

// Simplified strum picker for non-admin users on the add-song form.
// Pick one preset → friendly tempo → preview → (optional) hand off to the full
// builder. Emits the same hidden `strumming_patterns` payload the editor does,
// so submitSong is unchanged. Design: design workflow synthesis (June 2026).

const TIERS = [
  { label: "Повільно", min: 60, max: 84, mid: 72 },
  { label: "Помірно", min: 85, max: 104, mid: 95 },
  { label: "Швидко", min: 105, max: 134, mid: 120 },
  { label: "Дуже швидко", min: 135, max: 180, mid: 155 },
];

// The most popular strums, shown directly. Plain names for the very basics.
const POPULAR = ["pop-classic", "eighths-du", "six-mute", "eighths-d", "folk", "ballad", "rock-eighths", "country"];
const POPULAR_NAMES: Record<string, string> = {
  "pop-classic": "Шістка",
  "eighths-du": "Вісімка",
  "six-mute": "Шістка з приглушенням",
};

const byId = (id: string): StrumPreset | undefined => STRUM_PRESETS.find((p) => p.id === id);

function defaultTempo(p: StrumPreset): number {
  if (p.noteLength.endsWith("t") || p.id.includes("ballad")) return 76;
  if (["rock-eighths", "march", "sixteenths"].includes(p.id)) return 120;
  return 95;
}

// Same glyph rules as StrumPatternsEditor's StrokesPreview — users "see" the rhythm.
function StrokesPreview({ strokes }: { strokes: Stroke[] }) {
  const visible = strokes.slice(0, 16);
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
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
    </div>
  );
}

export function SimpleStrumPicker({ initial = [] }: { initial?: StrumPattern[] } = {}) {
  // When editing a song that already has strums, open straight into the full
  // builder seeded with them — otherwise an empty picker would wipe them on save.
  const [advanced, setAdvanced] = useState(initial.length > 0);
  const [expanded, setExpanded] = useState(initial.length > 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tempo, setTempo] = useState(95);
  const [playing, setPlaying] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const preset = selectedId ? byId(selectedId) : undefined;

  function select(p: StrumPreset) {
    setSelectedId(p.id);
    setTempo(defaultTempo(p));
  }

  // Playback loop — same engine as StrumPatternsEditor, single pattern.
  useEffect(() => {
    if (!playing || !ctxRef.current || !preset) return;
    const ctx = ctxRef.current;
    const ms = intervalFor(preset.noteLength, tempo);
    const beat = strokesPerBeat(preset.noteLength);
    let i = 0;
    const id = setInterval(() => {
      if (ctx.state === "suspended") ctx.resume();
      const s = preset.strokes[i];
      if (s && !s.r) playStroke(ctx, s);
      if (metronome && i % beat === 0) playMetronomeClick(ctx, Math.floor(i / beat) % 4 === 0);
      i = (i + 1) % preset.strokes.length;
    }, ms);
    return () => clearInterval(id);
  }, [playing, selectedId, tempo, metronome, preset]);

  useEffect(() => () => { ctxRef.current?.close().catch(() => {}); ctxRef.current = null; }, []);

  function togglePlay() {
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new AC();
      }
      ctxRef.current.resume();
      setPlaying((p) => !p);
    } catch {
      /* no audio (private mode) — submission still works */
    }
  }

  // Advanced: hand off to the full editor, seeded with the current preset so
  // nothing is lost. The editor (draft mode) emits the same hidden input.
  if (advanced) {
    const seed = preset
      ? [{
          id: crypto.randomUUID?.() ?? `tmp-${Date.now()}`,
          position: 0,
          name: "Бій",
          tempo,
          noteLength: preset.noteLength,
          strokes: preset.strokes,
        }]
      : initial;
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setAdvanced(false)}
          className="te-pressable px-3 py-1.5 text-xs font-bold"
          style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
        >
          ← Готові бої
        </button>
        {/* Regular users build a one-off strum for this song — open the form
            straight away, no "save as template". */}
        <StrumPatternsEditor initial={seed} allowTemplates={false} autoOpenForm />
      </div>
    );
  }

  // One preset card.
  function card(p: StrumPreset, name?: string) {
    const on = p.id === selectedId;
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => select(p)}
        className="te-pressable relative flex flex-col items-start gap-1 p-2 text-left"
        style={{
          borderRadius: "0.6rem",
          border: on ? "1.5px solid var(--orange)" : "1px solid transparent",
          background: on ? "rgba(255,140,60,0.08)" : undefined,
        }}
      >
        {on && <Check size={12} className="absolute top-1.5 right-1.5" style={{ color: "var(--orange)" }} />}
        <span className="text-[11px] font-bold pr-3" style={{ color: "var(--text)" }}>{name ?? p.label}</span>
        <StrokesPreview strokes={p.strokes} />
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with on/off toggle — collapsed by default. Kept first so
          `space-y-5` adds no stray top margin (a leading hidden input would
          push the header down by one gap). */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tighter" style={{ color: "var(--text)" }}>
            Вказати бій <span className="font-normal text-sm" style={{ color: "var(--text-muted)" }}>(необовʼязково)</span>
          </h2>
          {expanded && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Оберіть готовий бій або пропустіть.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Згорнути бій" : "Розгорнути бій"}
          className="flex-shrink-0"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <ToggleKnob active={expanded} />
        </button>
      </div>

      {!expanded ? null : (
      <>
      {/* 1 · Popular ready-made strums, shown directly */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {POPULAR.map(byId).filter((p): p is StrumPreset => !!p).map((p) => card(p, POPULAR_NAMES[p.id]))}
      </div>

      {/* 2 · Tempo (only once a preset is picked) */}
      {preset && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Швидкість</div>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map((t) => {
              const on = tempo >= t.min && tempo <= t.max;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTempo(t.mid)}
                  className="te-pressable px-3 py-1.5 text-xs font-bold"
                  style={{ borderRadius: "999px", background: on ? "var(--orange)" : undefined, color: on ? "#FFF" : "var(--text-mid)" }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={60}
              max={180}
              step={1}
              value={tempo}
              onChange={(e) => setTempo(+e.target.value)}
              aria-label="Темп (BPM)"
              className="flex-1"
              style={{ accentColor: "var(--orange)" }}
            />
            <span className="text-xs font-mono tabular-nums" style={{ color: "var(--text)" }}>{tempo} bpm</span>
          </div>
        </div>
      )}

      {/* 3 · Preview */}
      {preset && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Зупинити" : "Прослухати бій"}
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              background: playing ? "var(--orange)" : "transparent",
              color: playing ? "#FFF" : "var(--text)",
              border: playing ? "none" : "1.5px solid var(--text)",
            }}
          >
            {playing ? <Square size={12} fill="currentColor" /> : <Play size={13} fill="currentColor" style={{ marginLeft: 1 }} />}
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>«{preset.label}» · {tempo} bpm</span>
          <button
            type="button"
            onClick={() => setMetronome((m) => !m)}
            aria-pressed={metronome}
            className="ml-auto px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest"
            style={{
              borderRadius: "0.75rem",
              border: "1px solid",
              borderColor: metronome ? "rgba(255,140,60,0.45)" : "var(--border, rgba(0,0,0,0.1))",
              background: metronome ? "rgba(255,140,60,0.12)" : "transparent",
              color: metronome ? "var(--orange)" : "var(--text-muted)",
            }}
          >
            З метрономом
          </button>
        </div>
      )}

      {/* 4 · Build-your-own — opens the full editor (this song only) */}
      <button
        type="button"
        onClick={() => setAdvanced(true)}
        className="te-pressable w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold"
        style={{ borderRadius: "0.9rem", border: "1px dashed var(--border, rgba(0,0,0,0.15))", color: "var(--orange)" }}
      >
        <Wrench size={14} /> Створити свій бій
      </button>
      </>
      )}

      {/* The simple block emits the form payload itself. [] when skipped.
          Last child (and display:none) so it never adds a visible gap. */}
      <input
        type="hidden"
        name="strumming_patterns"
        value={JSON.stringify(
          preset ? [{ name: "Бій", tempo, noteLength: preset.noteLength, strokes: preset.strokes }] : [],
        )}
      />
    </div>
  );
}
