"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft } from "lucide-react";

interface Props {
  fallback?: string;
  label?: string;
  /** Subtle inline text link (arrow + label) instead of the round icon button. */
  inline?: boolean;
}

export function BackButton({ fallback = "/", label = "Назад", inline = false }: Props) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  if (inline) {
    return (
      <button
        onClick={handleClick}
        aria-label={label}
        title={label}
        className="inline-flex items-center gap-1 text-xs mb-8 transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
      >
        <ArrowLeft size={14} /> {label}
      </button>
    );
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
