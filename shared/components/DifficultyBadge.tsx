const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy:   { label: "Легка",   color: "#30D158" },
  medium: { label: "Середня", color: "#FF9F0A" },
  hard:   { label: "Складна", color: "#FF453A" },
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const d = DIFFICULTY_MAP[difficulty] ?? { label: difficulty, color: "var(--text-muted)" };
  return (
    <span
      aria-label={d.label}
      title={d.label}
      className="inline-block rounded-full align-middle"
      style={{ width: 4, height: 4, background: d.color }}
    />
  );
}
