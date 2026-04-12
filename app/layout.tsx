import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  // metadataBase resolves relative URLs in alternates.canonical and openGraph.url.
  // siteUrl prefers NEXT_PUBLIC_SITE_URL so previews never emit production canonicals.
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
        {children}
      </body>
    </html>
  );
}
