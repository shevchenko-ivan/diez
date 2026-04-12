const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: "Опубліковано", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  draft:     { label: "Чернетка",     color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  archived:  { label: "Архів",        color: "#9ca3af", bg: "rgba(156,163,175,0.1)" },
  pending:   { label: "На перевірці", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  rejected:  { label: "Відхилено",    color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

export function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, color: "#6b7280", bg: "rgba(107,114,128,0.1)" };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ color: info.color, background: info.bg }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: info.color, display: "inline-block" }} />
      {info.label}
    </span>
  );
}
