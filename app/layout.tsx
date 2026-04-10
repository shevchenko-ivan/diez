import type { Metadata } from "next";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Diez — Guitar Chords Platform",
  description:
    "Search, view, and share guitar chords for thousands of songs. The best platform for guitarists.",
  keywords: ["guitar chords", "tabs", "songs", "music", "guitar"],
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
