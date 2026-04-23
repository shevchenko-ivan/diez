import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/utils";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { Toaster } from "@/shared/components/Toaster";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {/* Auto-hide scrollbars: add `is-scrolling` to <html> while the user
            is actively scrolling, remove it 800ms after motion stops. CSS
            uses this class to reveal the track/thumb. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var h=document.documentElement,t;function on(){h.classList.add('is-scrolling');clearTimeout(t);t=setTimeout(function(){h.classList.remove('is-scrolling');},50);}window.addEventListener('scroll',on,{passive:true,capture:true});window.addEventListener('wheel',on,{passive:true});window.addEventListener('touchmove',on,{passive:true});})();",
          }}
        />
        <script
          type="application/ld+json"
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
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
