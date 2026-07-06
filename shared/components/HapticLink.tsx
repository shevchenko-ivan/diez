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
      // Haptic fires on click ONLY. An earlier version also fired on
      // pointerdown "for snappier feel" — but pointerdown triggers on every
      // touch, including the start of a scroll gesture, so phones buzzed on
      // each carousel swipe (user-reported). Click fires only on a real tap.
      onClick={(e) => {
        handleHaptic();
        onClick?.(e as React.MouseEvent<HTMLAnchorElement>);
      }}
    >
      {children}
    </Link>
  );
}
