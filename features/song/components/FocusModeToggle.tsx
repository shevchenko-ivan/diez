"use client";

import { PanelsTopLeft, Maximize2 } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { useFocusMode } from "@/shared/hooks/useFocusMode";

export function FocusModeToggle() {
  const [enabled, , toggle] = useFocusMode();
  const { trigger } = useHaptics();
  const Icon = enabled ? PanelsTopLeft : Maximize2;

  return (
    <TeButton
      icon={Icon}
      iconSize={13}
      iconColor={enabled ? "var(--orange)" : "var(--text-mid)"}
      title={enabled ? "Показати бокові панелі" : "Приховати бокові панелі"}
      aria-label={enabled ? "Показати бокові панелі" : "Приховати бокові панелі"}
      style={{ width: 36, height: 36 }}
      onClick={() => {
        trigger("light");
        toggle();
      }}
    />
  );
}
