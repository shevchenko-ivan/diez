"use client";

import { useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { useInstallApp } from "@/shared/hooks/useInstallApp";
import { TeButton } from "@/shared/components/TeButton";

interface Props {
  onAfterAction?: () => void;
}

/**
 * Install-app affordance for the mobile burger menu.
 * - Android: invokes the captured beforeinstallprompt.
 * - iOS: opens a sheet with Share → Home Screen instructions (no API on iOS).
 * - Hidden when already installed or on desktop without a prompt.
 */
export function InstallAppButton({ onAfterAction }: Props) {
  const { canShow, platform, hasNativePrompt, promptInstall } = useInstallApp();
  const [showIOSSheet, setShowIOSSheet] = useState(false);

  if (!canShow) return null;

  async function handleClick() {
    if (hasNativePrompt) {
      await promptInstall();
      onAfterAction?.();
    } else if (platform === "ios") {
      setShowIOSSheet(true);
    }
  }

  return (
    <>
      <TeButton
        shape="pill"
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-left"
        style={{ color: "var(--text-mid)" }}
      >
        <Download size={14} aria-hidden="true" />
        Додати на робочий стіл
      </TeButton>

      {showIOSSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIOSSheet(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowIOSSheet(false);
          }}
          className="fixed inset-0 z-[200] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="te-surface w-full max-w-md p-6 m-3 relative"
            style={{ borderRadius: "1.5rem" }}
          >
            <button
              type="button"
              onClick={() => setShowIOSSheet(false)}
              aria-label="Закрити"
              className="absolute top-4 right-4 p-1 opacity-60 hover:opacity-100"
              style={{ color: "var(--text)" }}
            >
              <X size={18} />
            </button>

            <h2
              id="ios-install-title"
              className="text-lg font-bold tracking-tight mb-1"
              style={{ color: "var(--text)" }}
            >
              Додати Diez на робочий стіл
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Кілька кроків — і ярлик з’явиться поруч з іншими застосунками.
            </p>

            <ol className="space-y-3">
              <li
                className="flex items-start gap-3 te-inset p-3 rounded-2xl"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "var(--orange)" }}
                >
                  1
                </span>
                <span className="flex-1 text-sm flex items-center gap-2 flex-wrap">
                  Натисни кнопку
                  <Share
                    size={16}
                    aria-label="Поділитися"
                    style={{ color: "var(--orange)" }}
                  />
                  <span style={{ color: "var(--text-muted)" }}>
                    у нижній панелі Safari
                  </span>
                </span>
              </li>

              <li
                className="flex items-start gap-3 te-inset p-3 rounded-2xl"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "var(--orange)" }}
                >
                  2
                </span>
                <span className="flex-1 text-sm flex items-center gap-2 flex-wrap">
                  Обери
                  <span className="font-semibold inline-flex items-center gap-1">
                    <Plus size={14} /> На екран «Початок»
                  </span>
                </span>
              </li>

              <li
                className="flex items-start gap-3 te-inset p-3 rounded-2xl"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "var(--orange)" }}
                >
                  3
                </span>
                <span className="flex-1 text-sm" style={{ color: "var(--text)" }}>
                  Натисни{" "}
                  <span className="font-semibold">Додати</span> у правому
                  верхньому куті.
                </span>
              </li>
            </ol>

            <p
              className="text-xs mt-5 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              Якщо не бачиш кнопки «Поділитися» — відкрий сайт у Safari, а не в
              іншому браузері.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
