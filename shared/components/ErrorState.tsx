"use client";

import { TeButton } from "@/shared/components/TeButton";

interface ErrorStateProps {
  message?: string;
  variant?: "surface" | "inset";
  onRetry?: () => void;
}

export function ErrorState({
  message = "Щось пішло не так",
  variant = "surface",
  onRetry,
}: ErrorStateProps) {
  const retryButton = onRetry && (
    <TeButton
      shape="pill"
      onClick={onRetry}
      className="mt-4 px-5 py-2 text-sm font-semibold"
    >
      Спробувати ще раз
    </TeButton>
  );

  if (variant === "inset") {
    return (
      <div
        className="te-inset rounded-2xl p-8 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        <p className="opacity-60">{message}</p>
        {retryButton}
      </div>
    );
  }

  return (
    <div
      className="te-surface p-12 text-center"
      style={{ borderRadius: "1.5rem", color: "var(--text-muted)" }}
    >
      <p className="font-medium opacity-60">{message}</p>
      {retryButton}
    </div>
  );
}
