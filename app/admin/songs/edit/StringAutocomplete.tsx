"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  name: string;
  defaultValue: string;
  suggestions: string[];
  required?: boolean;
  placeholder?: string;
}

export function StringAutocomplete({ name, defaultValue, suggestions, required, placeholder }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [value, suggestions]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const showDropdown = open && filtered.length > 0;
  const exactMatch = filtered.some((s) => s.toLowerCase() === value.trim().toLowerCase());

  const pick = (name: string) => {
    setValue(name);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
        <input
          name={name}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showDropdown) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && activeIndex >= 0) {
              e.preventDefault();
              pick(filtered[activeIndex]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          autoComplete="off"
          className="field-input w-full"
          style={{ color: "var(--text)" }}
        />
      </div>
      {showDropdown && !(filtered.length === 1 && exactMatch) && (
        <div
          className="absolute left-0 right-0 mt-2 te-surface overflow-hidden text-left z-50 py-1"
          style={{
            borderRadius: "1.25rem",
            boxShadow: "0 12px 36px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActiveIndex(i)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
              style={{
                background: i === activeIndex ? "rgba(0,0,0,0.04)" : "transparent",
                color: "var(--text)",
              }}
            >
              <span className="text-sm font-medium truncate">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
