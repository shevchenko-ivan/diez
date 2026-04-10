"use client";

import Link, { LinkProps } from "next/link";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { ReactNode } from "react";

interface HapticLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hapticType?: "light" | "medium" | "heavy" | "strum";
}

export function HapticLink({ children, hapticType = "light", ...props }: HapticLinkProps) {
  const { trigger, strum } = useHaptics();

  const handleHaptic = () => {
    if (hapticType === "strum") {
      strum();
    } else {
      trigger(hapticType);
    }
  };

  return (
    <Link
      {...props}
      onMouseDown={handleHaptic}
      onTouchStart={handleHaptic}
    >
      {children}
    </Link>
  );
}
