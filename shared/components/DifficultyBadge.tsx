const DIFFICULTY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  easy:   { label: "Легка",   color: "#30D158", bg: "rgba(48,209,88,0.1)" },
  medium: { label: "Середня", color: "#FF9F0A", bg: "rgba(255,159,10,0.1)" },
  hard:   { label: "Складна", color: "#FF453A", bg: "rgba(255,69,58,0.1)" },
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const d = DIFFICULTY_MAP[difficulty] ?? { label: difficulty, color: "var(--text-muted)", bg: "transparent" };
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"
      style={{ color: d.color, background: d.bg }}
    >
      {d.label}
    </span>
  );
}
