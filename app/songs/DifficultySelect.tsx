"use client";

import { useRouter, useSearchParams } from "next/navigation";

const DIFFICULTY_OPTIONS = [
  { value: "",       label: "Будь-яка" },
  { value: "easy",   label: "Легка" },
  { value: "medium", label: "Середня" },
  { value: "hard",   label: "Складна" },
];

export function DifficultySelect({ value, basePath = "/songs" }: { value: string; basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(next: string) {
    const p = new URLSearchParams(params);
    if (next) p.set("difficulty", next);
    else p.delete("difficulty");
    const qs = p.toString();
    router.push(basePath + (qs ? "?" + qs : ""));
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
        Складність
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="te-inset px-3 py-2 text-xs font-bold outline-none bg-transparent"
        style={{ borderRadius: "0.75rem", color: "var(--text)" }}
      >
        {DIFFICULTY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
