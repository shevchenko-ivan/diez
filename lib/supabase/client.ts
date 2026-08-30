import type { SupabaseClient } from "@supabase/supabase-js";

export type BrowserClient = SupabaseClient;

// supabase-js is ~60 KB gzip and was 81% unused on first paint, yet sat in
// the critical bundle of every page because Navbar/PostHogProvider (layout)
// import this module. The dynamic import moves it into its own lazily-fetched
// chunk: the value import above is type-only (erased at build), and every
// consumer already talks to the client from an effect or an async handler, so
// awaiting the getter costs nothing extra. The promise is memoized — all
// callers share one client instance, same as the old sync factory.
let clientPromise: Promise<BrowserClient> | null = null;

export function getClient(): Promise<BrowserClient> {
  clientPromise ??= import("@supabase/ssr").then((m) =>
    m.createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    ),
  );
  return clientPromise;
}
