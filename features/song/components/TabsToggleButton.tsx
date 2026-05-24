"use client";

import { Guitar } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { useShowTabs } from "@/shared/hooks/useShowTabs";

export function TabsToggleButton() {
  const [enabled, , toggle] = useShowTabs();
  const { trigger } = useHaptics();

  return (
    <TeButton
      icon={Guitar}
      iconSize={13}
      iconColor={enabled ? "var(--orange)" : "var(--text-mid)"}
      title={enabled ? "Сховати табулатуру" : "Показати табулатуру"}
      aria-label={enabled ? "Сховати табулатуру" : "Показати табулатуру"}
      style={{ width: 36, height: 36 }}
      onClick={() => {
        trigger("light");
        toggle();
      }}
    />
  );
}
