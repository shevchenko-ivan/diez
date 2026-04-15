"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Check } from "lucide-react";
import dynamic from "next/dynamic";

const GuitarHeadstock3D = dynamic(
  () => import("./GuitarHeadstock3D").then((m) => m.GuitarHeadstock3D),
  { ssr: false },
);

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
  "C","C#","D","D#","E","F","F#","G","G#","A","A#","B",
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

/* ── Gauge SVG ─────────────────────────────────────────────────────────────── */

function TunerGauge({
  cents,
  hasNote,
  inTune,
}: {
  cents: number;
  hasNote: boolean;
  inTune: boolean;
}) {
  const TICKS = 41;
  const CX = 150;
  const CY = 132;
  const R1 = 82;

  const tickColor = (d: number) =>
    d <= 3
      ? "#22c55e"
      : d <= 7
        ? "#84cc16"
        : d <= 12
          ? "#eab308"
          : d <= 16
            ? "#f97316"
            : "#ef4444";

  const needleAngle = hasNote ? (cents / 50) * 90 : 0;

  return (
    <svg viewBox="0 0 300 142" style={{ width: "100%", display: "block" }}>
      <defs>
        <filter id="tk">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Subtle center glow */}
      <radialGradient id="bgG" cx="50%" cy="95%">
        <stop
          offset="0%"
          stopColor={inTune ? "rgba(34,197,94,0.12)" : "rgba(200,245,0,0.06)"}
        />
        <stop offset="80%" stopColor="transparent" />
      </radialGradient>
      <rect width="300" height="142" fill="url(#bgG)" />

      {/* Tick marks */}
      {Array.from({ length: TICKS }).map((_, i) => {
        const a = Math.PI * (1 - i / (TICKS - 1));
        const d = Math.abs(i - 20);
        const h = d <= 3 ? 18 : 13;
        return (
          <line
            key={i}
            x1={CX + R1 * Math.cos(a)}
            y1={CY - R1 * Math.sin(a)}
            x2={CX + (R1 + h) * Math.cos(a)}
            y2={CY - (R1 + h) * Math.sin(a)}
            stroke={tickColor(d)}
            strokeWidth={d <= 3 ? "3.5" : "2.5"}
            strokeLinecap="round"
            opacity={hasNote ? 0.9 : 0.12}
            filter={hasNote && d <= 3 ? "url(#tk)" : undefined}
          />
        );
      })}

      {/* Needle */}
      <g
        style={{
          transform: `rotate(${needleAngle}deg)`,
          transformOrigin: `${CX}px ${CY}px`,
          transition: "transform 80ms linear",
        }}
      >
        <line
          x1={CX}
          y1={CY}
          x2={CX}
          y2={CY - R1 - 22}
          stroke={hasNote ? (inTune ? "#22c55e" : "white") : "transparent"}
          strokeWidth="3"
          strokeLinecap="round"
          opacity={0.25}
          filter="url(#tk)"
        />
        <line
          x1={CX}
          y1={CY}
          x2={CX}
          y2={CY - R1 - 22}
          stroke={
            hasNote
              ? inTune
                ? "#22c55e"
                : "white"
              : "rgba(255,255,255,0.08)"
          }
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx={CX}
          cy={CY}
          r="4"
          fill={hasNote ? "white" : "rgba(255,255,255,0.1)"}
        />
      </g>
    </svg>
  );
}

/* ── String circle button ──────────────────────────────────────────────────── */

function StringCircle({
  index,
  active,
  inTune,
}: {
  index: number;
  active: boolean;
  inTune: boolean;
}) {
  const s = STRINGS[index];
  const tuned = active && inTune;
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: `2px solid ${tuned ? "#22c55e" : active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "17px",
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: tuned
            ? "#22c55e"
            : active
              ? "white"
              : "rgba(255,255,255,0.22)",
          boxShadow: tuned
            ? "0 0 14px rgba(34,197,94,0.4), inset 0 0 8px rgba(34,197,94,0.1)"
            : active
              ? "0 0 10px rgba(255,255,255,0.08)"
              : "none",
          transition: "all 0.15s ease",
        }}
      >
        {s.name}
      </div>
      {/* Checkmark badge */}
      {tuned && (
        <div
          style={{
            position: "absolute",
            top: "-2px",
            right: "-2px",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 6px rgba(34,197,94,0.6)",
          }}
        >
          <Check size={11} strokeWidth={3} color="white" />
        </div>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */

export function GuitarTuner() {
  const [active, setActive] = useState(false);
  const [noteName, setNoteName] = useState<string | null>(null);
  const [, setNoteOctave] = useState<number | null>(null);
  const [cents, setCents] = useState(0);
  const [strIdx, setStrIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bufRef = useRef<any>(null);

  // Smoothing refs — prevent flickering & hold note while string rings
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

      // Stability: require 3 consecutive frames of same note before switching
      if (key === stableKeyRef.current) {
        stableCountRef.current++;
      } else {
        stableCountRef.current = 1;
        stableKeyRef.current = key;
        smoothCentsRef.current = n.cents; // reset smoothing on note change
      }

      if (stableCountRef.current >= 3) {
        setNoteName(n.note);
        setNoteOctave(n.octave);
        // Exponential smoothing for cents — reduces jitter
        smoothCentsRef.current =
          smoothCentsRef.current * 0.6 + n.cents * 0.4;
        setCents(Math.round(smoothCentsRef.current));
        setStrIdx(closestString(f));
      }
    } else {
      // No pitch — hold display for 800ms while string still rings
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
        audio: {
          noiseSuppression: false,
          echoCancellation: false,
          autoGainControl: false,
        },
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
      setError(
        "Не вдалося отримати доступ до мікрофона. Дозвольте доступ у налаштуваннях браузера.",
      );
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
    setNoteOctave(null);
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
    <div className="flex flex-col items-center gap-5 max-w-sm mx-auto pb-12">
      {/* ── Main dark panel ────────────────────────────────────── */}
      <div
        className="te-lcd w-full"
        style={{ borderRadius: "1.5rem", overflow: "hidden" }}
      >
        {/* Gauge */}
        <div style={{ padding: "16px 8px 0" }}>
          <TunerGauge cents={cents} hasNote={!!noteName} inTune={inTune} />
        </div>

        {/* Note display row: b ── NOTE ── # */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "0 28px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              color:
                noteName && cents < -2
                  ? "var(--panel-text)"
                  : "rgba(255,255,255,0.15)",
              transition: "color 0.15s",
            }}
          >
            b
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: inTune
                ? "rgba(34,197,94,0.4)"
                : "rgba(200,245,0,0.1)",
              transition: "background 0.15s",
            }}
          />
          <span
            style={{
              fontSize: "4.5rem",
              fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              color: noteColor,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              transition: "color 0.15s",
              textShadow:
                noteName && inTune ? "0 0 20px rgba(34,197,94,0.4)" : "none",
            }}
          >
            {noteName ?? "—"}
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: inTune
                ? "rgba(34,197,94,0.4)"
                : "rgba(200,245,0,0.1)",
              transition: "background 0.15s",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              color:
                noteName && cents > 2
                  ? "var(--panel-text)"
                  : "rgba(255,255,255,0.15)",
              transition: "color 0.15s",
            }}
          >
            #
          </span>
        </div>

        {/* Status badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "10px 0 18px",
            minHeight: "44px",
          }}
        >
          {noteName && (
            <div
              style={{
                background: inTune
                  ? "rgba(34,197,94,0.14)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${inTune ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "999px",
                padding: "6px 20px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: inTune ? "#22c55e" : "rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s ease",
              }}
            >
              {inTune
                ? "В строї"
                : cents < 0
                  ? `Нижче на ${Math.abs(cents)}¢`
                  : `Вище на ${cents}¢`}
              {inTune && (
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={12} strokeWidth={3} color="white" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Headstock + string buttons ────────────────────────── */}
        <div
          style={{
            position: "relative",
            height: "320px",
            padding: "0 12px 16px",
          }}
        >
          {/* 3D model as full background */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <GuitarHeadstock3D />
          </div>

          {/* String buttons overlaid on sides */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              height: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 4px",
              pointerEvents: "none",
            }}
          >
            {/* Left: D, A, E */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                pointerEvents: "auto",
              }}
            >
              {[2, 1, 0].map((i) => (
                <StringCircle
                  key={i}
                  index={i}
                  active={strIdx === i && noteName !== null}
                  inTune={inTune}
                />
              ))}
            </div>

            {/* Right: G, B, E */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                pointerEvents: "auto",
              }}
            >
              {[3, 4, 5].map((i) => (
                <StringCircle
                  key={i}
                  index={i}
                  active={strIdx === i && noteName !== null}
                  inTune={inTune}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mic button ─────────────────────────────────────────── */}
      <button
        onClick={active ? stop : start}
        className={active ? "te-btn-orange" : "te-key"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 32px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          borderRadius: "999px",
          ...(!active ? { color: "var(--text)" } : {}),
        }}
      >
        {active ? <MicOff size={15} /> : <Mic size={15} />}
        {active ? "Вимкнути" : "Увімкнути мікрофон"}
      </button>

      {error && (
        <p
          style={{
            fontSize: "13px",
            color: "#ef4444",
            textAlign: "center",
            maxWidth: "280px",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
