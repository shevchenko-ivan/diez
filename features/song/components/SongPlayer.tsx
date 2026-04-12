"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface SongPlayerProps {
  youtubeId: string;
  title: string;
  artist: string;
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Deterministic bar heights from title string
function getBars(seed: string, count = 42): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const c = seed.charCodeAt(i % seed.length) + i * 7;
    bars.push(20 + (c % 70));
  }
  return bars;
}

export function SongPlayer({ youtubeId, title, artist }: SongPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const bars = getBars(title + artist);
  const progress = duration > 0 ? current / duration : 0;

  const initPlayer = useCallback(() => {
    if (!mountRef.current) return;
    playerRef.current = new window.YT.Player(mountRef.current, {
      videoId: youtubeId,
      width: 1,
      height: 1,
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          setDuration(playerRef.current?.getDuration() ?? 0);
          setReady(true);
        },
        onStateChange: (e) => {
          const isPlaying = e.data === window.YT.PlayerState.PLAYING;
          setPlaying(isPlaying);
          if (isPlaying) setDuration(playerRef.current?.getDuration() ?? 0);
        },
      },
    });
  }, [youtubeId]);

  useEffect(() => {
    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.getElementById("yt-api-script")) {
        const s = document.createElement("script");
        s.id = "yt-api-script";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy();
    };
  }, [initPlayer]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrent(playerRef.current?.getCurrentTime() ?? 0);
      }, 250);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  const togglePlay = () => {
    if (!ready) return;
    playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo();
  };

  const skip = (secs: number) => {
    if (!ready) return;
    const t = Math.max(0, (playerRef.current?.getCurrentTime() ?? 0) + secs);
    playerRef.current?.seekTo(t, true);
    setCurrent(t);
  };

  const seekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ready || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = ratio * duration;
    playerRef.current?.seekTo(t, true);
    setCurrent(t);
  };

  return (
    <div
      className="te-surface overflow-hidden select-none"
      style={{ borderRadius: "1.5rem", padding: "1.25rem" }}
    >
      {/* Hidden YouTube mount */}
      <div
        ref={mountRef}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      {/* ── Waveform ───────────────────────────────────────── */}
      <div
        className="relative mb-3 cursor-pointer"
        style={{ height: 56 }}
        onClick={seekClick}
      >
        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-[2px] px-0.5 pb-0">
          {bars.map((h, i) => {
            const barProgress = i / bars.length;
            const isPast = barProgress < progress;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: 2,
                  background: isPast ? "var(--orange)" : "var(--surface-dk)",
                  transition: "height 0.15s ease",
                  animation: playing ? `waveBar ${0.6 + (i % 5) * 0.13}s ease-in-out infinite alternate` : "none",
                  animationDelay: `${(i % 7) * 0.07}s`,
                }}
              />
            );
          })}
        </div>

        {/* Red playhead */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: `${progress * 100}%`,
            background: "var(--orange)",
            boxShadow: "0 0 6px var(--orange)",
            transition: "left 0.25s linear",
          }}
        />
      </div>

      {/* ── Time labels ────────────────────────────────────── */}
      <div className="flex justify-between mb-4 px-0.5">
        <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          {formatTime(current)}
        </span>
        <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* ── Bottom row ─────────────────────────────────────── */}
      <div className="flex items-center gap-4">

        {/* LCD display */}
        <div
          className="te-inset flex-1 p-3 min-w-0"
          style={{ borderRadius: "1rem" }}
        >
          {/* Time counter */}
          <div className="flex items-baseline gap-1 mb-1">
            {["MM", "SS"].map((unit, i) => {
              const val = i === 0
                ? Math.floor(current / 60).toString().padStart(2, "0")
                : Math.floor(current % 60).toString().padStart(2, "0");
              return (
                <span key={unit} className="flex items-baseline gap-0.5">
                  <span
                    className="font-mono-te tabular-nums"
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      color: "var(--text)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {val}
                  </span>
                  <span style={{ fontSize: "0.5rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    {unit}
                  </span>
                  {i === 0 && (
                    <span style={{ fontSize: "1.2rem", color: "var(--orange)", lineHeight: 1, marginBottom: 2 }}>
                      :
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          {/* Song info */}
          <p className="truncate font-bold" style={{ fontSize: "0.72rem", color: "var(--text)", letterSpacing: "-0.01em" }}>
            {title}
          </p>
          <p className="truncate" style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {artist}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Skip back */}
          <button
            onClick={() => skip(-10)}
            disabled={!ready}
            className="te-key flex items-center justify-center active:scale-95 transition-transform"
            style={{ width: 36, height: 36, borderRadius: "50%", opacity: ready ? 1 : 0.4 }}
          >
            <SkipBackIcon />
          </button>

          {/* Play / Pause — big */}
          <button
            onClick={togglePlay}
            disabled={!ready}
            className="te-knob flex items-center justify-center active:scale-95 transition-transform"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              color: "var(--orange)",
              opacity: ready ? 1 : 0.4,
              fontSize: 0,
            }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Skip forward */}
          <button
            onClick={() => skip(10)}
            disabled={!ready}
            className="te-key flex items-center justify-center active:scale-95 transition-transform"
            style={{ width: 36, height: 36, borderRadius: "50%", opacity: ready ? 1 : 0.4 }}
          >
            <SkipForwardIcon />
          </button>
        </div>

      </div>

      {/* ── CSS keyframes ──────────────────────────────────── */}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.6); }
          to   { transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-muted)" }}>
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-muted)" }}>
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
