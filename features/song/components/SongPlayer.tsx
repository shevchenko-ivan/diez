"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

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
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SongPlayer({ youtubeId, title, artist }: SongPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const initPlayer = useCallback(() => {
    if (!containerRef.current) return;
    playerRef.current = new window.YT.Player(containerRef.current, {
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
          const s = e.data;
          setPlaying(s === window.YT.PlayerState.PLAYING);
          if (s === window.YT.PlayerState.PLAYING) {
            setDuration(playerRef.current?.getDuration() ?? 0);
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
      playerRef.current?.destroy();
    };
  }, [initPlayer]);

  // Progress ticker
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrent(playerRef.current?.getCurrentTime() ?? 0);
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  const togglePlay = () => {
    if (!ready) return;
    playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo();
  };

  const toggleMute = () => {
    if (!ready) return;
    if (muted) { playerRef.current?.unMute(); setMuted(false); }
    else { playerRef.current?.mute(); setMuted(true); }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    playerRef.current?.seekTo(t, true);
    setCurrent(t);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="te-surface flex items-center gap-3 px-4 py-3" style={{ borderRadius: "1rem" }}>
      {/* Hidden YouTube player mount */}
      <div ref={containerRef} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        disabled={!ready}
        className="te-knob flex items-center justify-center shrink-0 transition-opacity"
        style={{ width: 40, height: 40, color: "var(--orange)", opacity: ready ? 1 : 0.4 }}
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>

      {/* Info + progress */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold leading-tight" style={{ fontSize: "0.78rem", color: "var(--text)" }}>
          {artist} — {title}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          {/* Seek bar */}
          <div className="relative flex-1 h-1.5 rounded-full" style={{ background: "var(--surface-dk)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${progress}%`, background: "var(--orange)" }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={current}
              onChange={seek}
              disabled={!ready}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Time */}
          <span className="font-mono shrink-0" style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Mute */}
      <button
        onClick={toggleMute}
        disabled={!ready}
        className="shrink-0 transition-opacity"
        style={{ color: "var(--text-muted)", opacity: ready ? 1 : 0.4 }}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
}
