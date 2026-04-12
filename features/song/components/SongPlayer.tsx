"use client";

import { useState } from "react";
import { Play } from "lucide-react";

interface SongPlayerProps {
  youtubeId: string;
  title: string;
  artist: string;
}

export function SongPlayer({ youtubeId, title, artist }: SongPlayerProps) {
  const [active, setActive] = useState(false);

  return (
    <div
      className="te-inset flex items-center gap-3 overflow-hidden"
      style={{ borderRadius: "1rem", padding: "0 0.75rem" }}
    >
      {/* Play button */}
      {!active && (
        <button
          onClick={() => setActive(true)}
          className="te-knob flex items-center justify-center shrink-0"
          style={{ width: 36, height: 36, color: "var(--orange)" }}
          aria-label="Слухати"
        >
          <Play size={14} fill="currentColor" />
        </button>
      )}

      <div className="flex-1 min-w-0" style={{ height: 48 }}>
        {active ? (
          /* YouTube iframe — cropped to show only controls bar */
          <div style={{ position: "relative", height: 48, overflow: "hidden" }}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
              allow="autoplay; encrypted-media"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: 120,
                border: "none",
              }}
            />
          </div>
        ) : (
          /* Idle state — song info */
          <div className="flex flex-col justify-center h-full">
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {artist}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text)", fontWeight: 600 }} className="truncate">
              {title}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
