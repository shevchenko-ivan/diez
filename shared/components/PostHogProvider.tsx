"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { createClient } from "@/lib/supabase/client";

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
      <AuthIdentifier />
      {children}
    </PHProvider>
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
function AuthIdentifier() {
  useEffect(() => {
    if (!posthog.__loaded) return;
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
  }, []);

  return null;
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
