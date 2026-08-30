"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import { getSavedSlugsList } from "@/features/home/actions";

// Client-side saved-hearts hydration for static pages. Pages rendered with
// `dynamic = "force-static"` (home, topic/instrument listings) can't read the
// auth cookie at render time, so their SaveHeartButtons start unsaved. This
// provider fetches the user's saved slugs once per page load and
// SaveHeartButton upgrades itself to "saved" when its slug is in the set.
//
// Guests never trigger the request: the Supabase auth cookie (sb-…-auth-token)
// is the cheap client-side tell for "somebody is logged in".
export const SavedSlugsContext = createContext<ReadonlySet<string> | null>(null);

export function SavedSlugsProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<ReadonlySet<string> | null>(null);

  useEffect(() => {
    if (!document.cookie.includes("-auth-token")) return;
    let disposed = false;
    getSavedSlugsList()
      .then((list) => { if (!disposed && list.length) setSlugs(new Set(list)); })
      .catch(() => { /* personalization is best-effort */ });
    return () => { disposed = true; };
  }, []);

  return <SavedSlugsContext.Provider value={slugs}>{children}</SavedSlugsContext.Provider>;
}
