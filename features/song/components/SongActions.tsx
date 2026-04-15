"use client";

import { Heart, Share2 } from "lucide-react";
import { useHaptics } from "@/shared/hooks/useHaptics";

export function SongActions() {
  const { trigger } = useHaptics();

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        className="te-knob flex items-center justify-center"
        style={{ width: 36, height: 36 }}
        title="Зберегти"
        onMouseDown={() => trigger("medium")}
        onTouchStart={() => trigger("medium")}
      >
        <Heart size={14} style={{ color: "var(--text-mid)" }} />
      </button>
      <button
        className="te-knob flex items-center justify-center"
        style={{ width: 36, height: 36 }}
        title="Поділитися"
        onMouseDown={() => trigger("light")}
        onTouchStart={() => trigger("light")}
      >
        <Share2 size={13} style={{ color: "var(--text-mid)" }} />
      </button>
    </div>
  );
}
