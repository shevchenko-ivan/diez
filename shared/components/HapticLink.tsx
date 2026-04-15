"use client";

import Link, { LinkProps } from "next/link";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { ReactNode } from "react";

interface HapticLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hapticType?: "light" | "medium" | "heavy" | "strum";
}

export function HapticLink({ children, hapticType = "light", onClick, ...props }: HapticLinkProps) {
  const { trigger, strum } = useHaptics();

  const handleHaptic = () => {
    // We do NOT call e.preventDefault() here
    if (hapticType === "strum") {
      strum();
    } else {
      trigger(hapticType);
    }
  };

  return (
    <Link
      {...props}
      onClick={(e) => {
        handleHaptic();
        onClick?.(e as React.MouseEvent<HTMLAnchorElement>);
      }}
      onPointerDown={() => {
        // Trigger on pointer down for snappier feel, still doesn't block click
        if (hapticType === "strum") strum();
        else trigger(hapticType);
      }}
    >
      {children}
    </Link>
  );
}
