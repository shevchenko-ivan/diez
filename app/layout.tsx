import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/utils";
import { ThemeProvider } from "@/shared/components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Diez — Акорди для гітари",
  description:
    "Шукайте, переглядайте та ділітесь акордами для тисяч пісень. Найкраща платформа для гітаристів.",
  keywords: ["акорди", "гітара", "табулатури", "пісні", "музика", "guitar chords"],
};

// Runs before paint — applies stored manual preference so there's no flash.
// CSS @media (prefers-color-scheme: dark) handles auto without JS.
const themeInitScript = `(function(){try{var s=localStorage.getItem('theme');if(s==='dark'||s==='light'){document.documentElement.setAttribute('data-theme',s)}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
