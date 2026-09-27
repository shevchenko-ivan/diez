"use client";

import type { ReactNode } from "react";
import { markBeginnerEntry } from "../lib/beginner-entry";

/** Wraps the «Для початківців» song list: any song opened from inside it
 *  opens on its easiest variant, with the beginner toggle on if needed. Capture phase, so it sees the click
 *  before the card's own <Link> navigates. */
export function BeginnerEntryZone({
  children,
  variants,
}: {
  children: ReactNode;
  /** slug → the easier variant to open instead of the primary one. */
  variants: Record<string, string>;
}) {
  return (
    <div
      onClickCapture={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        const m = a?.getAttribute("href")?.match(/^\/songs\/([a-z0-9-]+)(?:[?#].*)?$/);
        if (m) markBeginnerEntry(m[1], variants[m[1]]);
      }}
    >
      {children}
    </div>
  );
}
