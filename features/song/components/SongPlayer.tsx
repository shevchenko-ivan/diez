"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TeButton } from "@/shared/components/TeButton";
import { Rewind, FastForward } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface SongPlayerProps {
  youtubeId: string;
  title: string;
  artist: string;
  /** Compact horizontal layout: play/pause + waveform + time. No LCD, no skip buttons. */
  compact?: boolean;
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getBars(seed: string, count = 42): number[] {
  return Array.from({ length: count }, (_, i) => {
    const c = seed.charCodeAt(i % seed.length) + i * 7;
    return 20 + (c % 70);
  });
}

export function SongPlayer({ youtubeId, title, artist, compact = false }: SongPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  // Animation states
  const [playBtnAnim, setPlayBtnAnim] = useState<"idle" | "press" | "launch">("idle");
  const [skipAnim, setSkipAnim] = useState<"none" | "back" | "fwd">("none");
  const [cardGlow, setCardGlow] = useState(false);

  const bars = getBars(title + artist);
  const progress = duration > 0 ? current / duration : 0;

  const initPlayer = useCallback(() => {
    if (!mountRef.current) return;
    playerRef.current = new window.YT.Player(mountRef.current, {
      videoId: youtubeId,
      width: 1,
      height: 1,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        rel: 0,
        modestbranding: 1,
        // iOS Safari: without playsinline=1 the player forces fullscreen
        // takeover. We render hidden 1×1 and only want audio.
        playsinline: 1,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      },
      events: {
        onReady: () => {
          setDuration(playerRef.current?.getDuration() ?? 0);
          setReady(true);
        },
        onStateChange: (e: any) => {
          const isPlaying = e.data === window.YT.PlayerState.PLAYING;
          setPlaying(isPlaying);
          if (isPlaying) {
            setDuration(playerRef.current?.getDuration() ?? 0);
            // Card glow on play start
            setCardGlow(true);
            setTimeout(() => setCardGlow(false), 600);
          }
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
      // Pause before destroy — destroy alone sometimes leaves audio playing
      // for a beat on mobile (iframe teardown is async).
      try { playerRef.current?.pauseVideo?.(); } catch {}
      try { playerRef.current?.stopVideo?.(); } catch {}
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
    // Press → spring back → if starting, launch glow
    setPlayBtnAnim("press");
    setTimeout(() => setPlayBtnAnim("launch"), 100);
    setTimeout(() => setPlayBtnAnim("idle"), 400);
    if (playing) {
      playerRef.current?.pauseVideo();
    } else {
      playerRef.current?.playVideo();
    }
  };

  // YouTube-like shortcuts: K play/pause, J back 10s, L forward 10s.
  // Ignored when typing in input/textarea/select/contenteditable.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const code = e.code;
      if (code !== "KeyK" && code !== "KeyJ" && code !== "KeyL") return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      }
      if (!ready) return;
      e.preventDefault();
      if (code === "KeyK") togglePlay();
      else if (code === "KeyJ") skip(-10);
      else if (code === "KeyL") skip(10);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, playing]);

  const skip = (secs: number) => {
    if (!ready) return;
    setSkipAnim(secs < 0 ? "back" : "fwd");
    setTimeout(() => setSkipAnim("none"), 350);
    const t = Math.max(0, (playerRef.current?.getCurrentTime() ?? 0) + secs);
    playerRef.current?.seekTo(t, true);
    setCurrent(t);
  };

  const seekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ready || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    playerRef.current?.seekTo(t, true);
    setCurrent(t);
  };

  const playBtnStyle = {
    idle:   { transform: "scale(1)",    transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" },
    press:  { transform: "scale(0.88)", transition: "transform 0.1s ease" },
    launch: { transform: "scale(1.08)", transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)" },
  }[playBtnAnim];

  const skipBackStyle = {
    transform: skipAnim === "back" ? "translateX(-4px) scale(0.9)" : "translateX(0) scale(1)",
    transition: skipAnim === "back"
      ? "transform 0.1s ease"
      : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
  };

  const skipFwdStyle = {
    transform: skipAnim === "fwd" ? "translateX(4px) scale(0.9)" : "translateX(0) scale(1)",
    transition: skipAnim === "fwd"
      ? "transform 0.1s ease"
      : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Hidden YouTube mount */}
        <div
          ref={mountRef}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        />
        {/* Waveform + times */}
        <div className="flex-1 min-w-0 pt-2">
          <div
            className="relative cursor-pointer"
            style={{ height: 28 }}
            onClick={seekClick}
            title="Клікни для перемотки"
          >
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {bars.map((h, i) => {
                const isPast = i / bars.length < progress;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      borderRadius: 2,
                      background: isPast ? "var(--orange)" : "var(--surface-dk)",
                      transition: "background 0.15s ease",
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono" style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>
              {formatTime(current)}
            </span>
            <span className="font-mono" style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>
        {/* Play / Pause — right side for reachable tap target */}
        <TeButton
          onClick={togglePlay}
          disabled={!ready}
          aria-label={playing ? "Пауза" : "Грати"}
          title={playing ? "Пауза — клавіша K" : "Грати — клавіша K"}
          style={{
            width: 44, height: 44,
            color: "var(--orange)",
            opacity: ready ? 1 : 0.35,
            cursor: ready ? "pointer" : "default",
            flexShrink: 0,
            ...playBtnStyle,
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </TeButton>
      </div>
    );
  }

  return (
    <div
      className="te-surface overflow-hidden"
      style={{
        borderRadius: "1.5rem",
        padding: "1.25rem",
        transition: "box-shadow 0.4s ease",
        boxShadow: cardGlow
          ? "0 0 0 2px var(--orange), var(--sh-float)"
          : undefined,
      }}
    >
      {/* Hidden YouTube mount */}
      <div
        ref={mountRef}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      {/* ── Waveform ───────────────────────────────────────── */}
      <div
        className="relative mb-2 cursor-pointer"
        style={{ height: 52 }}
        onClick={seekClick}
        title="Клікни для перемотки"
      >
        <div className="absolute inset-0 flex items-end gap-[2px]">
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
                  transition: "background 0.15s ease, height 0.15s ease",
                }}
              />
            );
          })}
        </div>
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px pointer-events-none"
          style={{
            left: `${progress * 100}%`,
            background: "var(--orange)",
            boxShadow: "0 0 8px var(--orange)",
            transition: "left 0.25s linear",
          }}
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between mb-4">
        <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
          {formatTime(current)}
        </span>
        <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* ── LCD display (full width) ───────────────────────── */}
      <div className="te-inset p-3 mb-3 w-full" style={{ borderRadius: "1rem" }}>
        <span
          className="font-mono-te tabular-nums block mb-1"
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: playing ? "var(--text)" : "var(--text-muted)",
            transition: "color 0.3s ease",
          }}
        >
          {formatTime(current)}
        </span>
        <p className="truncate" style={{ fontSize: "0.72rem", color: "var(--text)" }}>
          <span className="font-bold">{title}</span>
          <span style={{ color: "var(--text-muted)" }}> — {artist}</span>
        </p>
      </div>

      {/* ── Controls row ───────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">

          {/* Skip back −10s */}
          <TeButton
            shape="circle"
            size="sm"
            onClick={() => skip(-10)}
            disabled={!ready}
            aria-label="Назад 10с"
            title="Назад 10с — клавіша J"
            style={{
              width: 36, height: 36,
              opacity: ready ? 1 : 0.35,
              cursor: ready ? "pointer" : "default",
              ...skipBackStyle,
            }}
          >
            <SkipBackIcon />
          </TeButton>

          {/* Play / Pause */}
          <TeButton
            onClick={togglePlay}
            disabled={!ready}
            aria-label={playing ? "Пауза" : "Грати"}
            title={playing ? "Пауза — клавіша K" : "Грати — клавіша K"}
            style={{
              width: 56, height: 56,
              color: "var(--orange)",
              opacity: ready ? 1 : 0.35,
              cursor: ready ? "pointer" : "default",
              ...playBtnStyle,
            }}
          >
            <span
              style={{
                display: "flex",
                transition: "opacity 0.15s ease, transform 0.15s ease",
                opacity: 1,
              }}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </span>
          </TeButton>

          {/* Skip forward +10s */}
          <TeButton
            shape="circle"
            size="sm"
            onClick={() => skip(10)}
            disabled={!ready}
            aria-label="Вперед 10с"
            title="Вперед 10с — клавіша L"
            style={{
              width: 36, height: 36,
              opacity: ready ? 1 : 0.35,
              cursor: ready ? "pointer" : "default",
              ...skipFwdStyle,
            }}
          >
            <SkipForwardIcon />
          </TeButton>
        </div>
      </div>
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
  return <Rewind size={16} strokeWidth={2} fill="currentColor" style={{ color: "var(--text-mid)" }} />;
}
function SkipForwardIcon() {
  return <FastForward size={16} strokeWidth={2} fill="currentColor" style={{ color: "var(--text-mid)" }} />;
}
