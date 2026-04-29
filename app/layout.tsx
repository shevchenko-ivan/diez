import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/utils";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { Toaster } from "@/shared/components/Toaster";
import { PostHogProvider } from "@/shared/components/PostHogProvider";
import { ScrollbarAutoHide } from "@/shared/components/ScrollbarAutoHide";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

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
      <body className="antialiased" suppressHydrationWarning>
        <Script
          id="ld-json-website"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
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
          </ThemeProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
