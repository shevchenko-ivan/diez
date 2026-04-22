"use client";

// Thin wrapper around <input type="number"> that blurs on wheel, so scrolling
// over the page doesn't silently decrement BPM (common browser annoyance).
export function TempoInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: number | string;
}) {
  return (
    <input
      name={name}
      type="number"
      min={40}
      max={300}
      defaultValue={defaultValue ?? ""}
      placeholder="120"
      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
      className="field-input"
      style={{ color: "var(--text)" }}
    />
  );
}
