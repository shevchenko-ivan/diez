/**
 * Karplus-Strong guitar-strum synthesis used by both the read-only viewer
 * (PatternPlayer) and the admin editor (StrumPatternsEditor).
 *
 * Each stroke = strum across 6 open strings of an Em chord (E2 B2 E3 G3 B3 E4)
 * with a small per-string offset so it sounds like a real strum. Down-stroke
 * rolls bass→treble, up-stroke treble→bass. Mute = quick decay + dampened EQ.
 * Accent = louder + slightly slower roll — only volume/dynamics change, never
 * pitch (see memory/feedback_audio_accent.md).
 */
import type { Stroke, NoteLength } from "@/features/song/types";

// Open Em — neutral, recognizable guitar tone for a generic strum widget.
const STRINGS_HZ = [82.41, 123.47, 164.81, 196.0, 246.94, 329.63];

// Cache Karplus-Strong buffers across renders/strokes. Keyed by sample-rate +
// frequency + decay so different AudioContexts (rare) coexist.
const ksCache = new Map<string, AudioBuffer>();

function ksBuffer(ctx: AudioContext, freq: number, decay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const key = `${sr}|${freq.toFixed(2)}|${decay.toFixed(4)}`;
  const cached = ksCache.get(key);
  if (cached) return cached;

  const period = Math.max(2, Math.floor(sr / freq));
  const length = Math.floor(sr * 1.6); // 1.6s tail is plenty for a strum
  const buf = ctx.createBuffer(1, length, sr);
  const data = buf.getChannelData(0);

  // Excite the delay line with white noise (the "pluck").
  for (let i = 0; i < period; i++) data[i] = Math.random() * 2 - 1;

  // Karplus-Strong: averaged feedback through a 1-period delay line.
  // Start at period+1 so we never read data[-1] (Float32Array would yield
  // `undefined` → NaN, silencing the whole buffer).
  for (let i = period + 1; i < length; i++) {
    data[i] = (data[i - period] + data[i - period - 1]) * 0.5 * decay;
  }

  ksCache.set(key, buf);
  return buf;
}

export function playStroke(audioCtx: AudioContext, stroke: Stroke) {
  const isDown = stroke.d === "D";
  const isMute = stroke.m === true;
  const isAccent = stroke.a === true;

  // Mute = faster string decay + darker tone.
  const decay = isMute ? 0.984 : 0.996;
  const filterHz = isMute ? 1400 : 4500;

  // Per-string gain. Accent only changes volume/feel, never pitch (per memory).
  const baseGain = isMute ? 0.05 : 0.11;
  const stringGain = isAccent ? Math.min(0.28, baseGain * 1.7) : baseGain;

  // Strum roll across the 6 strings — accents are rolled slightly slower so
  // the listener can hear the chord; mutes are tighter (sounds choked).
  const rollMs = isMute ? 4 : isAccent ? 16 : 9;
  const tailSec = isMute ? 0.18 : 1.3;

  const master = audioCtx.createGain();
  master.gain.value = 1;
  const eq = audioCtx.createBiquadFilter();
  eq.type = "lowpass";
  eq.frequency.value = filterHz;
  eq.Q.value = 0.4;
  master.connect(eq);
  eq.connect(audioCtx.destination);

  const order = isDown ? STRINGS_HZ : [...STRINGS_HZ].reverse();
  const dt = rollMs / 1000 / (order.length - 1);
  const t0 = audioCtx.currentTime;

  for (let i = 0; i < order.length; i++) {
    const src = audioCtx.createBufferSource();
    src.buffer = ksBuffer(audioCtx, order[i], decay);

    const g = audioCtx.createGain();
    const startAt = t0 + i * dt;
    g.gain.setValueAtTime(stringGain, startAt);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + tailSec);

    src.connect(g);
    g.connect(master);
    src.start(startAt);
    src.stop(startAt + tailSec + 0.05);
  }

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(isAccent ? 50 : isDown ? 28 : 18);
  }
}

/**
 * Metronome click — short, broadband "tick" engineered to cut through the
 * strum without dominating it. Two layers:
 *   1. Triangle oscillator at 1500/2200 Hz for the pitch component (so the
 *      downbeat is clearly distinguishable).
 *   2. Brief band-passed noise burst for the transient "tk" attack — sine
 *      tones alone get masked by Karplus-Strong string noise.
 *
 * `accent=true` is the downbeat (beat 1 of the bar) — higher pitch and a
 * little louder. Other beats are a softer woodblock-style tick.
 */
export function playMetronomeClick(audioCtx: AudioContext, accent: boolean) {
  const t0 = audioCtx.currentTime;
  const dur = 0.06;

  // Pitched layer (triangle = more harmonics than sine, easier to hear over
  // string noise but still musical).
  const osc = audioCtx.createOscillator();
  const oscG = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.value = accent ? 2200 : 1500;
  const oscPeak = accent ? 0.45 : 0.3;
  oscG.gain.setValueAtTime(0.0001, t0);
  oscG.gain.exponentialRampToValueAtTime(oscPeak, t0 + 0.002);
  oscG.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(oscG);
  oscG.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);

  // Noise transient — band-passed white noise gives the click its "tk" attack
  // that survives masking from broadband strum content.
  const sr = audioCtx.sampleRate;
  const noiseLen = Math.floor(sr * 0.015);
  const noiseBuf = audioCtx.createBuffer(1, noiseLen, sr);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = audioCtx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = accent ? 4000 : 3000;
  bp.Q.value = 1.2;
  const noiseG = audioCtx.createGain();
  const noisePeak = accent ? 0.35 : 0.25;
  noiseG.gain.setValueAtTime(noisePeak, t0);
  noiseG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.025);
  noise.connect(bp);
  bp.connect(noiseG);
  noiseG.connect(audioCtx.destination);
  noise.start(t0);
  noise.stop(t0 + 0.03);
}

/** How many strokes make up one beat for a given note length. */
export function strokesPerBeat(nl: NoteLength): number {
  switch (nl) {
    case "1/4": return 1;
    case "1/8": return 2;
    case "1/16": return 4;
    case "1/4t": return 3;
    case "1/8t": return 3;
    case "1/16t": return 6;
  }
}

/** Milliseconds between consecutive strokes for a given note length + tempo. */
export function intervalFor(nl: NoteLength, tempo: number): number {
  const quarter = 60 / tempo;
  let seconds: number;
  switch (nl) {
    case "1/4": seconds = quarter; break;
    case "1/8": seconds = quarter / 2; break;
    case "1/16": seconds = quarter / 4; break;
    case "1/4t": seconds = (quarter * 2) / 3; break;
    case "1/8t": seconds = quarter / 3; break;
    case "1/16t": seconds = quarter / 6; break;
  }
  return seconds * 1000;
}
