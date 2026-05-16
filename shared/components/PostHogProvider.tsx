"use client";

import { useEffect, Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type posthogJsType from "posthog-js";
import { createClient } from "@/lib/supabase/client";

/**
 * PostHog client-side provider.
 *
 * Initializes PostHog **lazily** — the SDK (~100 KB minified, plus the
 * session-recorder which is even heavier) is dynamically imported only
 * after the first paint / idle moment, so it doesn't enter the critical
 * JS bundle and blow up TBT (PageSpeed flagged 850ms blocking time on
 * desktop before this change).
 *
 * Captures `$pageview` manually on every route change — Next.js App Router
 * doesn't fire a full navigation event, so the SDK's auto-pageview misses
 * client-side transitions.
 *
 * Privacy:
 * - Session replay enabled, but password and email inputs are masked.
 * - Disabled in development to keep local noise out of the dashboard.
 */
type PostHogClient = typeof posthogJsType;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [ph, setPh] = useState<PostHogClient | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || process.env.NODE_ENV !== "production") return;

    // Defer SDK load until the browser is idle. requestIdleCallback is the
    // standard "low-priority work" scheduler; the setTimeout fallback covers
    // Safari (which still lacks it as of 2026).
    const schedule =
      (typeof window !== "undefined" &&
        (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback) ||
      ((cb: () => void) => setTimeout(cb, 1));

    let cancelled = false;
    schedule(() => {
      if (cancelled) return;
      void import("posthog-js").then(({ default: posthog }) => {
        if (cancelled) return;
        posthog.init(key, {
          api_host: host || "https://eu.i.posthog.com",
          capture_pageview: false, // captured manually below
          capture_pageleave: true,
          person_profiles: "identified_only",
          // Auto-capture uncaught exceptions and unhandled promise rejections,
          // surfacing them in PostHog's Error Tracking view. Without this, a
          // user encountering a broken page is invisible until they email us.
          // Zero perf cost — only fires when an error actually throws.
          capture_exceptions: true,
          session_recording: {
            maskAllInputs: false,
            maskInputOptions: { password: true, email: true },
          },
        });
        setPh(posthog);
      });
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker posthog={ph} />
      </Suspense>
      <AuthIdentifier posthog={ph} />
      {children}
    </>
  );
}

/**
 * Bridges Supabase auth state to PostHog.
 *
 * - On login → `identify(userId, { email })` so the anonymous session merges
 *   with the named person. Also stamps the email as a Person property so the
 *   "Internal & Test users" cohort can target by email.
 * - On logout → `reset()` so the next visit gets a fresh anonymous id and
 *   doesn't leak between accounts on shared devices.
 */
function AuthIdentifier({ posthog }: { posthog: PostHogClient | null }) {
  useEffect(() => {
    if (!posthog) return;
    const sb = createClient();

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        posthog.identify(session.user.id, { email: session.user.email });
      }
    });

    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        posthog.identify(session.user.id, { email: session.user.email });
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [posthog]);

  return null;
}

function PageviewTracker({ posthog }: { posthog: PostHogClient | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthog) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    posthog.capture("$pageview", { $current_url: window.location.origin + url });
  }, [pathname, searchParams, posthog]);

  return null;
}
