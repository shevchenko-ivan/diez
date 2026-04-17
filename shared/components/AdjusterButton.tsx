"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { TeButton } from "@/shared/components/TeButton";

/**
 * Round ± / icon button used as an incremental adjuster
 * (transpose, capo, font size, scroll speed, etc.).
 *
 * Thin wrapper over <TeButton shape="circle" size="sm"> — kept as a separate
 * named primitive because adjusters carry semantic meaning ("incremental adjustment")
 * and pair specifically with <ControlBlock />.
 */
export function AdjusterButton({
  size = "sm",
  className = "",
  style,
  children,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <TeButton
      size={size}
      className={`text-sm font-bold ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </TeButton>
  );
}
