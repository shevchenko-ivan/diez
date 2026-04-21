"use client";

import { Share2 } from "lucide-react";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { TeButton } from "@/shared/components/TeButton";
import { SaveHeartButton } from "./SaveHeartButton";
import { toast } from "@/shared/components/Toaster";

export function SongActions({ slug, isSaved, variantId }: { slug: string; isSaved?: boolean; variantId?: string }) {
  const { trigger } = useHaptics();

  const handleShare = async () => {
    trigger("light");
    const url = variantId
      ? `${window.location.origin}/songs/${slug}?v=${variantId}`
      : `${window.location.origin}/songs/${slug}`;
    const shareData = { title: document.title, url };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    toast("Посилання скопійовано");
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <SaveHeartButton slug={slug} initialSaved={isSaved} variant="bare" variantId={variantId} />
      <TeButton
        icon={Share2}
        iconSize={13}
        iconColor="var(--text-mid)"
        title="Поділитися"
        aria-label="Поділитися"
        style={{ width: 36, height: 36 }}
        onClick={handleShare}
      />
    </div>
  );
}
