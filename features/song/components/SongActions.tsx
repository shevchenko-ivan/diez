"use client";

import { Share2 } from "lucide-react";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { TeButton } from "@/shared/components/TeButton";
import { SaveHeartButton } from "./SaveHeartButton";

export function SongActions({ slug, isSaved }: { slug: string; isSaved?: boolean }) {
  const { trigger } = useHaptics();

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <SaveHeartButton slug={slug} initialSaved={isSaved} variant="bare" />
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
