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
      aria-label={label}
      title={label}
      className="te-icon-btn"
      style={{ width: 36, height: 36, color: "var(--text-muted)" }}
    >
      <ChevronLeft size={16} strokeWidth={2.2} />
    </button>
  );
}
