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
        className="te-inset pl-3 py-2 text-xs font-bold outline-none bg-transparent appearance-none"
        style={{
          borderRadius: "0.75rem",
          color: "var(--text)",
          paddingRight: "2rem",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
