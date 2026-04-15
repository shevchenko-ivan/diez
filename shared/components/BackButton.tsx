"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface Props {
  fallback?: string;
  label?: string;
}

export function BackButton({ fallback = "/", label = "Назад" }: Props) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-0.5 text-xs"
      style={{ color: "var(--text-muted)", fontWeight: 400 }}
    >
      <ChevronLeft size={12} strokeWidth={2.5} />
      {label}
    </button>
  );
}
