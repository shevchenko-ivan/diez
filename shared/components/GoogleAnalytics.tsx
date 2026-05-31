"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { readConsent } from "./CookieBanner";

/**
 * Google Analytics 4 (gtag.js) — loaded the same way as PostHog:
 * - production only (no localhost noise in the property),
 * - hard consent-gate: nothing loads until the visitor accepts analytics in
 *   the cookie banner, so GA sets no cookies and sends no hits before consent
 *   (stricter than Google Consent Mode, and consistent with PostHog here).
 *
 * SPA route changes are covered by GA4 Enhanced Measurement ("page changes
 * based on browser history events"), which is on by default for the web data
 * stream — so no manual page_view wiring is needed.
 *
 * The Measurement ID is public (it ships in the client script regardless), so
 * a hardcoded fallback is fine; NEXT_PUBLIC_GA_ID can override it per-env.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-4FXYTHE15Z";

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!GA_ID || process.env.NODE_ENV !== "production") return;
    const check = () => {
      if (readConsent()?.analytics) setEnabled(true);
    };
    // 1. Returning visitors who already consented.
    check();
    // 2. Fresh accept on this page (banner dispatches this) — start without reload.
    window.addEventListener("diez:consent-changed", check);
    return () => window.removeEventListener("diez:consent-changed", check);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
