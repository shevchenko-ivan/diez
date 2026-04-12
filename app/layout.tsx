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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
