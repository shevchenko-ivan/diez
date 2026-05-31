"use client";

import Script from "next/script";
import { useEffect } from "react";
import { readConsent } from "./CookieBanner";

/**
 * Google Analytics 4 (gtag.js) with Google Consent Mode v2.
 *
 * Unlike a hard consent-gate, the tag loads for everyone (so Google's "tag
 * detected" check passes and Ads/modelling works), but consent defaults to
 * DENIED — GA sets no cookies and sends only cookieless modelling pings until
 * the visitor accepts analytics in the cookie banner. We only ever toggle
 * `analytics_storage`; the ad_* signals stay denied (the banner has no
 * marketing opt-in and the site runs no Google Ads).
 *
 * - The inline script sets the denied default, then reads the stored choice
 *   and grants `analytics_storage` immediately for returning consenters —
 *   all before `config`, so ordering is correct.
 * - The effect handles a fresh accept/decline made this session (the banner
 *   dispatches `diez:consent-changed`).
 *
 * SPA route changes are covered by GA4 Enhanced Measurement (history events).
 * Measurement ID is overridable via NEXT_PUBLIC_GA_ID.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-4FXYTHE15Z";
const PROD = process.env.NODE_ENV === "production";

export function GoogleAnalytics() {
  useEffect(() => {
    if (!PROD) return;
    const onChange = () => {
      const granted = readConsent()?.analytics === true;
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      gtag?.("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
    };
    window.addEventListener("diez:consent-changed", onChange);
    return () => window.removeEventListener("diez:consent-changed", onChange);
  }, []);

  if (!PROD) return null;

  return (
    <>
      {/* Consent default (denied) + grant-if-already-consented + config. All in
          one inline script so the denied default is queued before config. The
          localStorage key/shape mirror CookieBanner's STORAGE_KEY. */}
      <Script id="ga-consent" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
          try {
            var c = JSON.parse(localStorage.getItem('diez:cookie-consent') || 'null');
            if (c && c.analytics === true) {
              gtag('consent', 'update', { analytics_storage: 'granted' });
            }
          } catch (e) {}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
