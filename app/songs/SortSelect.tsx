"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "",    label: "За популярністю" },
  { value: "new", label: "За датою: спочатку нові" },
  { value: "old", label: "За датою: спочатку старі" },
  { value: "az",  label: "За алфавітом" },
];

export function SortSelect({ value, basePath = "/songs" }: { value: string; basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(next: string) {
    const p = new URLSearchParams(params);
    if (next) p.set("sort", next);
    else p.delete("sort");
    const qs = p.toString();
    router.push(basePath + (qs ? "?" + qs : ""));
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
        Сорт
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="te-inset px-3 py-2 text-xs font-bold outline-none bg-transparent"
        style={{ borderRadius: "0.75rem", color: "var(--text)" }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
