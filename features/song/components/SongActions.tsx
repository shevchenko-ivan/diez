"use client";

import { Heart, Share2 } from "lucide-react";
import { useHaptics } from "@/shared/hooks/useHaptics";

export function SongActions() {
  const { trigger } = useHaptics();

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <button
        className="te-knob flex items-center justify-center"
        style={{ width: 44, height: 44 }}
        title="Зберегти"
        onMouseDown={() => trigger("medium")}
        onTouchStart={() => trigger("medium")}
      >
        <Heart size={16} style={{ color: "var(--text-mid)" }} />
      </button>
      <button
        className="te-knob flex items-center justify-center"
        style={{ width: 44, height: 44 }}
        title="Поділитися"
        onMouseDown={() => trigger("light")}
        onTouchStart={() => trigger("light")}
      >
        <Share2 size={15} style={{ color: "var(--text-mid)" }} />
      </button>
    </div>
  );
}
