"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Check, X } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";

/* ── Data ──────────────────────────────────────────────────────────────────── */

const STRINGS = [
  { name: "E", octave: 2, freq: 82.41 },
  { name: "A", octave: 2, freq: 110.0 },
  { name: "D", octave: 3, freq: 146.83 },
  { name: "G", octave: 3, freq: 196.0 },
  { name: "B", octave: 3, freq: 246.94 },
  { name: "E", octave: 4, freq: 329.63 },
];

const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

/* ── Pitch detection ───────────────────────────────────────────────────────── */

function detectPitch(buf: Float32Array, sr: number): number | null {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / buf.length) < 0.006) return null;

  const minP = Math.floor(sr / 450);
  const maxP = Math.min(Math.ceil(sr / 70), (buf.length / 2) | 0);
  const len = buf.length - maxP;

  let best = -Infinity,
    bestP = -1;
  for (let p = minP; p <= maxP; p++) {
    let c = 0;
    for (let i = 0; i < len; i++) c += buf[i] * buf[i + p];
    if (c > best) { best = c; bestP = p; }
  }
  if (bestP < 0) return null;

  let z = 0;
  for (let i = 0; i < len; i++) z += buf[i] * buf[i];
  if (z < 0.001 || best / z < 0.25) return null;

  let T: number = bestP;
  if (bestP > minP && bestP < maxP) {
    let c0 = 0, c2 = 0;
    for (let i = 0; i < len; i++) {
      c0 += buf[i] * buf[i + bestP - 1];
      c2 += buf[i] * buf[i + bestP + 1];
    }
    const a = (c0 + c2 - 2 * best) / 2;
    const b = (c2 - c0) / 2;
    if (a < 0) T = bestP - b / (2 * a);
  }
  return sr / T;
}

function freqToNote(freq: number) {
  const midi = 12 * Math.log2(freq / 440) + 69;
  const r = Math.round(midi);
  return {
    note: NOTE_NAMES[((r % 12) + 12) % 12],
    octave: Math.floor(r / 12) - 1,
    cents: Math.round((midi - r) * 100),
  };
}

function closestString(freq: number) {
  return STRINGS.reduce(
    (b, s, i) =>
      Math.abs(Math.log2(freq / s.freq)) <
      Math.abs(Math.log2(freq / STRINGS[b].freq))
        ? i
        : b,
    0,
  );
}

/* ── Compact Gauge ─────────────────────────────────────────────────────────── */

function MiniGauge({
  cents,
  hasNote,
  inTune,
}: {
  cents: number;
  hasNote: boolean;
  inTune: boolean;
}) {
  const TICKS = 31;
  const CX = 120;
  const CY = 108;
  const R1 = 64;

  const tickColor = (d: number) =>
    d <= 2 ? "#22c55e" : d <= 5 ? "#84cc16" : d <= 9 ? "#eab308" : d <= 12 ? "#f97316" : "#ef4444";

  const needleAngle = hasNote ? (cents / 50) * 90 : 0;

  return (
    <svg viewBox="0 0 240 114" style={{ width: "100%", display: "block" }}>
      <defs>
        <filter id="twk">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <radialGradient id="twbg" cx="50%" cy="95%">
        <stop offset="0%" stopColor={inTune ? "rgba(34,197,94,0.12)" : "rgba(200,245,0,0.06)"} />
        <stop offset="80%" stopColor="transparent" />
      </radialGradient>
      <rect width="240" height="114" fill="url(#twbg)" />

      {Array.from({ length: TICKS }).map((_, i) => {
        const a = Math.PI * (1 - i / (TICKS - 1));
        const d = Math.abs(i - 15);
        const h = d <= 2 ? 14 : 10;
        return (
          <line
            key={i}
            x1={CX + R1 * Math.cos(a)}
            y1={CY - R1 * Math.sin(a)}
            x2={CX + (R1 + h) * Math.cos(a)}
            y2={CY - (R1 + h) * Math.sin(a)}
            stroke={tickColor(d)}
            strokeWidth={d <= 2 ? "3" : "2"}
            strokeLinecap="round"
            opacity={hasNote ? 0.9 : 0.12}
            filter={hasNote && d <= 2 ? "url(#twk)" : undefined}
          />
        );
      })}

      <g
        style={{
          transform: `rotate(${needleAngle}deg)`,
          transformOrigin: `${CX}px ${CY}px`,
          transition: "transform 80ms linear",
        }}
      >
        <line
          x1={CX} y1={CY} x2={CX} y2={CY - R1 - 16}
          stroke={hasNote ? (inTune ? "#22c55e" : "white") : "transparent"}
          strokeWidth="2.5" strokeLinecap="round" opacity={0.25}
          filter="url(#twk)"
        />
        <line
          x1={CX} y1={CY} x2={CX} y2={CY - R1 - 16}
          stroke={hasNote ? (inTune ? "#22c55e" : "white") : "rgba(255,255,255,0.08)"}
          strokeWidth="1.5" strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r="3" fill={hasNote ? "white" : "rgba(255,255,255,0.1)"} />
      </g>
    </svg>
  );
}

/* ── TunerWidget ───────────────────────────────────────────────────────────── */

export function TunerWidget({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(false);
  const [noteName, setNoteName] = useState<string | null>(null);
  const [cents, setCents] = useState(0);
  const [strIdx, setStrIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bufRef = useRef<any>(null);

  const stableKeyRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);
  const smoothCentsRef = useRef(0);
  const lastDetectRef = useRef(0);

  const detect = useCallback(() => {
    const a = analyserRef.current;
    const b = bufRef.current;
    const ctx = audioCtxRef.current;
    if (!a || !b || !ctx) return;

    a.getFloatTimeDomainData(b);
    const f = detectPitch(b, ctx.sampleRate);
    const now = performance.now();

    if (f) {
      const n = freqToNote(f);
      const key = `${n.note}${n.octave}`;
      lastDetectRef.current = now;

      if (key === stableKeyRef.current) {
        stableCountRef.current++;
      } else {
        stableCountRef.current = 1;
        stableKeyRef.current = key;
        smoothCentsRef.current = n.cents;
      }

      if (stableCountRef.current >= 3) {
        setNoteName(n.note);
        smoothCentsRef.current = smoothCentsRef.current * 0.6 + n.cents * 0.4;
        setCents(Math.round(smoothCentsRef.current));
        setStrIdx(closestString(f));
      }
    } else {
      if (now - lastDetectRef.current > 800) {
        setNoteName(null);
        stableCountRef.current = 0;
        stableKeyRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(detect);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: false, echoCancellation: false, autoGainControl: false },
        video: false,
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 4096;
      src.connect(an);
      analyserRef.current = an;
      bufRef.current = new Float32Array(an.fftSize);
      setActive(true);
      rafRef.current = requestAnimationFrame(detect);
    } catch {
      setError("Не вдалося отримати доступ до мікрофона.");
    }
  }, [detect]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    stableKeyRef.current = null;
    stableCountRef.current = 0;
    smoothCentsRef.current = 0;
    lastDetectRef.current = 0;
    setActive(false);
    setNoteName(null);
    setStrIdx(null);
    setCents(0);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const inTune = noteName !== null && Math.abs(cents) <= 5;

  const noteColor = !noteName
    ? "rgba(255,255,255,0.06)"
    : inTune
      ? "#22c55e"
      : "var(--panel-text)";

  return (
    <div className="te-surface rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <p
          className="text-[9px] font-bold tracking-widest uppercase opacity-50"
          style={{ color: "var(--text-muted)" }}
        >
          Тюнер
        </p>
        <button
          onClick={() => { stop(); onClose(); }}
          className="w-5 h-5 flex items-center justify-center rounded-full opacity-40 hover:opacity-80 transition-opacity"
        >
          <X size={12} />
        </button>
      </div>

      {/* Dark LCD panel */}
      <div className="mx-2 mb-2 te-lcd" style={{ borderRadius: "0.75rem", overflow: "hidden" }}>
        {/* Gauge */}
        <div style={{ padding: "8px 4px 0" }}>
          <MiniGauge cents={cents} hasNote={!!noteName} inTune={inTune} />
        </div>

        {/* Note display */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "0 16px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              color: noteName && cents < -2 ? "var(--panel-text)" : "rgba(255,255,255,0.15)",
              transition: "color 0.15s",
            }}
          >
            b
          </span>
          <div style={{ flex: 1, height: "1px", background: inTune ? "rgba(34,197,94,0.4)" : "rgba(200,245,0,0.1)" }} />
          <span
            style={{
              fontSize: "2.8rem",
              fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              color: noteColor,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              transition: "color 0.15s",
              textShadow: noteName && inTune ? "0 0 16px rgba(34,197,94,0.4)" : "none",
            }}
          >
            {noteName ?? "—"}
          </span>
          <div style={{ flex: 1, height: "1px", background: inTune ? "rgba(34,197,94,0.4)" : "rgba(200,245,0,0.1)" }} />
          <span
            style={{
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              color: noteName && cents > 2 ? "var(--panel-text)" : "rgba(255,255,255,0.15)",
              transition: "color 0.15s",
            }}
          >
            #
          </span>
        </div>

        {/* Status */}
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 10px", minHeight: "32px" }}>
          {noteName && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: inTune ? "#22c55e" : "rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {inTune ? "В строї" : cents < 0 ? `Нижче ${Math.abs(cents)}¢` : `Вище ${cents}¢`}
              {inTune && <Check size={11} strokeWidth={3} />}
            </span>
          )}
        </div>

        {/* String indicators — horizontal */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", padding: "0 12px 12px" }}>
          {STRINGS.map((s, i) => {
            const isActive = strIdx === i && noteName !== null;
            const tuned = isActive && inTune;
            return (
              <div
                key={i}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: `2px solid ${tuned ? "#22c55e" : isActive ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: tuned ? "#22c55e" : isActive ? "white" : "rgba(255,255,255,0.2)",
                  boxShadow: tuned ? "0 0 10px rgba(34,197,94,0.4)" : "none",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                {s.name}
                {tuned && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={7} strokeWidth={3} color="white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mic button */}
      <div style={{ display: "flex", justifyContent: "center", padding: "4px 8px 10px" }}>
        <TeButton
          shape="pill"
          onClick={active ? stop : start}
          icon={active ? MicOff : Mic}
          iconSize={13}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 20px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            borderRadius: "999px",
            ...(!active ? { color: "var(--text)" } : {}),
          }}
        >
          {active ? "Вимкнути" : "Мікрофон"}
        </TeButton>
      </div>

      {error && (
        <p style={{ fontSize: "11px", color: "#ef4444", textAlign: "center", padding: "0 8px 8px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
