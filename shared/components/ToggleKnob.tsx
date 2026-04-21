"use client";

// Pill toggle used across the app (playlist popover, beginner mode, etc).
// Orange fill when active, white knob that slides to the right.

interface ToggleKnobProps {
  active: boolean;
  width?: number;
  height?: number;
}

export function ToggleKnob({ active, width = 40, height = 22 }: ToggleKnobProps) {
  const W = width;
  const H = height;
  const PAD = 3;
  const KNOB = H - PAD * 2;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        position: "relative",
        width: W,
        height: H,
        flexShrink: 0,
        borderRadius: 999,
        background: active ? "var(--orange)" : "rgba(255,255,255,0.08)",
        boxShadow: "var(--sh-socket), inset 0 0 0 1px rgba(255,255,255,0.12)",
        transition: "background 150ms ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: PAD,
          left: active ? W - KNOB - PAD : PAD,
          width: KNOB,
          height: KNOB,
          borderRadius: 999,
          background: "var(--surface-hi, #ffffff)",
          boxShadow: "var(--sh-physical)",
          transition: "left 160ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </span>
  );
}
