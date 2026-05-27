import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { siteUrl, jsonLdScript } from "@/lib/utils";
import { CookieBanner } from "@/shared/components/CookieBanner";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { Toaster } from "@/shared/components/Toaster";
import { PostHogProvider } from "@/shared/components/PostHogProvider";
import { LiteModeProvider } from "@/shared/components/LiteModeProvider";
import { ScrollbarAutoHide } from "@/shared/components/ScrollbarAutoHide";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Diez — Акорди для гітари",
  description:
    "Дієз — українська платформа гітарних акордів. Шукайте акорди для гітари, тексти пісень з акордами, підбір акордів українських та зарубіжних пісень.",
  keywords: [
    "акорди",
    "гітарні акорди",
    "акорди для гітари",
    "пісні з акордами",
    "тексти пісень",
    "українські пісні",
    "гітара",
    "Дієз",
    "підбір акордів",
    "табулатури",
    "музика",
    "guitar chords",
  ],
  twitter: {
    card: "summary_large_image",
    title: "Diez — Акорди для гітари",
    description: "Дієз — українська платформа гітарних акордів. Пісні з акордами, підбір акордів, тексти пісень.",
  },
  // `app/icon.svg` and `app/apple-icon.png` are picked up automatically by
  // Next's file-convention metadata — no `icons` field needed here. The
  // SVG is sharp at every screen density; overriding via `icons` would
  // force PNGs instead.
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover lets the layout extend under the iOS Safari bottom
  // toolbar so `position: fixed; bottom: 0` lands at the physical screen
  // bottom and `env(safe-area-inset-bottom)` returns the home-indicator inset.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `Save-Data: on` — Chrome / Edge / Opera send this when the user enables
  // data-saver in browser settings. Read it server-side so the first render
  // already skips cover images (preload links etc. never even ship).
  const h = await headers();
  const initialLite = h.get("save-data")?.toLowerCase() === "on";

  // Resolve the PostHog ingest origin from env so the preconnect points at
  // the right CDN (eu vs us). Falls back to the EU default that matches
  // PostHogProvider's own fallback.
  const phOrigin = new URL(
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
  ).origin;

  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        {/* Preload the two Stolzl weights actually used above the fold
            (Regular 400 for body/UI text, Bold 700 for h1 + nav). Without
            these the browser only discovers them after parsing the CSS, by
            which time it has already rendered fallback text — then a swap
            shifts everything below it. Was a primary contributor to CLS
            0.45 on the home page (per Speed Insights). */}
        <link
          rel="preload"
          href="/fonts/Stolzl-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Stolzl-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        {/* Preconnect to third-party origins that ship JS on every page
            (PostHog after idle, Vercel Analytics + Speed Insights at the
            bottom of <body>). Establishes the TLS handshake early so when
            these scripts actually fetch their requests aren't waiting on
            DNS + handshake. Saves ~100-300ms per request on slow networks.
            Capped at 3 preconnects — Lighthouse warns above 4. */}
        <link rel="preconnect" href={phOrigin} crossOrigin="anonymous" />
        <link rel="preconnect" href="https://va.vercel-scripts.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://vitals.vercel-insights.com" crossOrigin="anonymous" />

        {/* dns-prefetch (lighter than preconnect — only DNS, no TLS) for
            YouTube. The iframe API is only loaded when the user taps play
            on a song page, so a full preconnect would waste a handshake on
            home/index views. DNS resolution alone shaves ~20-100ms when the
            user does click play. */}
        <link rel="dns-prefetch" href="https://www.youtube-nocookie.com" />

        {/* hreflang self-reference. Site is Ukrainian-only, but declaring
            it explicitly lets Google read the language signal (in addition
            to `<html lang="uk">`) and silences "hreflang missing" warnings
            in third-party SEO auditors. Rendered directly in <head> because
            Next's `alternates.languages` metadata is overridden whenever a
            page sets its own `alternates.canonical` — which every page does. */}
        <link rel="alternate" hrefLang="uk" href={siteUrl} />
        <link rel="alternate" hrefLang="x-default" href={siteUrl} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* WebSite schema with SearchAction makes Google show a sitelinks
            search box under our brand result. Rendered inline in SSR (not via
            next/script afterInteractive) so it lands in the initial HTML — many
            crawlers don't execute JS reliably enough for structured data. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: jsonLdScript({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Diez",
              alternateName: "Дієз",
              url: siteUrl,
              description: "Українська платформа гітарних акордів — пісні з акордами, підбір акордів, тексти пісень.",
              inLanguage: "uk",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteUrl}/songs?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <ScrollbarAutoHide />
        <PostHogProvider>
          <LiteModeProvider initialLite={initialLite}>
            <ThemeProvider>
              {/* Skip link — first focusable element on every page (WCAG 2.4.1).
                  Visually hidden until focused, then anchored to the top-left. */}
              <a href="#main-content" className="skip-to-content">
                Перейти до основного вмісту
              </a>
              {children}
              <Toaster />
              <CookieBanner />
            </ThemeProvider>
          </LiteModeProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
