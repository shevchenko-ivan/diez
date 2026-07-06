import type { CSSProperties } from "react";

// Publication status shown to the author on their own songs. Pure (no hooks),
// so it works in both server and client components — profile cards, the add /
// edit form banner, etc.

export type SongStatus = "draft" | "pending" | "published" | "rejected" | "archived";

const META: Record<SongStatus, { label: string; fg: string; bg: string }> = {
  draft:     { label: "Чернетка",     fg: "#7A7A7A", bg: "rgba(120,120,120,0.14)" },
  pending:   { label: "На перевірці", fg: "#B26A00", bg: "rgba(255,140,60,0.16)" },
  published: { label: "Опубліковано", fg: "#2E7D32", bg: "rgba(60,170,80,0.16)" },
  rejected:  { label: "Відхилено",    fg: "#C0392B", bg: "rgba(200,60,60,0.14)" },
  archived:  { label: "В архіві",     fg: "#7A7A7A", bg: "rgba(120,120,120,0.14)" },
};

export function statusLabel(status: string): string {
  return META[(status as SongStatus)]?.label ?? status;
}

/** Accent (foreground) colour for a status — used for card framing. */
export function statusAccent(status: string): string {
  return (META[(status as SongStatus)] ?? META.draft).fg;
}

export function SongStatusBadge({ status, style }: { status: string; style?: CSSProperties }) {
  const meta = META[(status as SongStatus)] ?? META.draft;
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest"
      style={{
        padding: "3px 8px",
        borderRadius: "999px",
        color: meta.fg,
        background: meta.bg,
        backdropFilter: "blur(2px)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {meta.label}
    </span>
  );
}
