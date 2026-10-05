import { Suspense } from "react";
import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { SongsSkeleton } from "./SongsSkeleton";
import { SongsCatalog } from "./SongsCatalog";

// The bare catalogue is the same for everyone, so it is served from the ISR
// cache like the topic pages (30-day backstop, refreshed by every catalogue
// change via the "songs" tag). It used to read searchParams and render on
// every request — the last public page doing so (~35K renders/month).
// Requests WITH ?q / ?sort are rewritten in next.config.ts to
// app/songs-search, which renders per request as before; saved hearts are
// filled in on the client (SavedSlugsProvider), as on the topic pages.
export const dynamic = "force-static";
export const revalidate = 2592000;

export const metadata: Metadata = {
  title: "Каталог пісень — Акорди для гітари | Diez",
  description:
    "Тисячі пісень з акордами для гітари, укулеле та піаніно. Українські та зарубіжні виконавці. Фільтруйте за складністю та жанром.",
  keywords: [
    "акорди для гітари",
    "акорди для укулеле",
    "акорди для піаніно",
    "пісні з акордами",
    "каталог пісень",
  ],
  alternates: { canonical: "/songs" },
  openGraph: {
    title: "Каталог пісень — Diez",
    description: "Акорди для гітари, укулеле та піаніно. Знаходьте пісні та грайте разом.",
    type: "website",
    url: "/songs",
  },
};

export default function SongsPage() {
  return (
    <PageShell>
      <Suspense fallback={<SongsSkeleton />}>
        <SongsCatalog params={{}} />
      </Suspense>
    </PageShell>
  );
}
