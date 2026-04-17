"use client";

import { Heart, Share2 } from "lucide-react";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { TeButton } from "@/shared/components/TeButton";

export function SongActions() {
  const { trigger } = useHaptics();

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <TeButton
        icon={Heart}
        iconSize={14}
        iconColor="var(--text-mid)"
        title="Зберегти"
        style={{ width: 36, height: 36 }}
        onMouseDown={() => trigger("medium")}
        onTouchStart={() => trigger("medium")}
      />
      <TeButton
        icon={Share2}
        iconSize={13}
        iconColor="var(--text-mid)"
        title="Поділитися"
        style={{ width: 36, height: 36 }}
        onMouseDown={() => trigger("light")}
        onTouchStart={() => trigger("light")}
      />
    </div>
  );
}
