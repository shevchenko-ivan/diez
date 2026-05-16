import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteUrl, jsonLdScript } from "@/lib/utils";
import { CookieBanner } from "@/shared/components/CookieBanner";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { Toaster } from "@/shared/components/Toaster";
import { PostHogProvider } from "@/shared/components/PostHogProvider";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover lets the layout extend under the iOS Safari bottom
  // toolbar so `position: fixed; bottom: 0` lands at the physical screen
  // bottom and `env(safe-area-inset-bottom)` returns the home-indicator inset.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
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
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
