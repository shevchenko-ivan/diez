"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Lite-mode = skip non-essential network fetches (cover images mainly).
// Server seeds the initial value from the `Save-Data` request header
// (browsers send this when the user enables data-saver). Client then
// also checks Network Information API for slow-2g/2g effectiveType.
// Either trigger flips the flag — there's no UI toggle yet.
const LiteCtx = createContext<boolean>(false);

export function useLiteMode() {
  return useContext(LiteCtx);
}

type NetworkInfo = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  addEventListener?: (event: "change", cb: () => void) => void;
  removeEventListener?: (event: "change", cb: () => void) => void;
};

function detect(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as unknown as { connection?: NetworkInfo }).connection;
  if (!c) return false;
  if (c.saveData) return true;
  return c.effectiveType === "slow-2g" || c.effectiveType === "2g" || c.effectiveType === "3g";
}

export function LiteModeProvider({
  initialLite,
  children,
}: {
  initialLite: boolean;
  children: React.ReactNode;
}) {
  const [lite, setLite] = useState(initialLite);

  useEffect(() => {
    const update = () => setLite(detect() || initialLite);
    update();
    const c = (navigator as unknown as { connection?: NetworkInfo }).connection;
    c?.addEventListener?.("change", update);
    return () => c?.removeEventListener?.("change", update);
  }, [initialLite]);

  return <LiteCtx.Provider value={lite}>{children}</LiteCtx.Provider>;
}
