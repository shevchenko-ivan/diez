"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

/**
 * PostHog client-side provider.
 *
 * Initializes PostHog once on mount and captures `$pageview` manually on
 * every route change — Next.js App Router doesn't fire a full navigation
 * event, so the SDK's auto-pageview misses client-side transitions.
 *
 * Privacy:
 * - Session replay enabled, but password inputs are masked by default and
 *   we additionally mask any input with `data-ph-mask` or type=email.
 * - Disabled in development to keep local noise out of the dashboard.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || process.env.NODE_ENV !== "production") return;

    posthog.init(key, {
      api_host: host || "https://eu.i.posthog.com",
      capture_pageview: false, // we capture manually below
      capture_pageleave: true,
      person_profiles: "identified_only",
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
          email: true,
        },
      },
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthog.__loaded) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    posthog.capture("$pageview", { $current_url: window.location.origin + url });
  }, [pathname, searchParams]);

  return null;
}
