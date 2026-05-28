import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

/** Tip box for a key takeaway inside an article. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div
      className="not-prose flex gap-3 my-6 p-4"
      style={{
        borderRadius: "1rem",
        background: "rgba(255,140,60,0.08)",
        border: "1px solid rgba(255,140,60,0.25)",
      }}
    >
      <Lightbulb size={18} style={{ color: "var(--orange)", flexShrink: 0, marginTop: 2 }} />
      <div className="text-sm" style={{ color: "var(--text-mid)", lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}
