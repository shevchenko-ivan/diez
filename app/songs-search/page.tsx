import { Suspense } from "react";
import { type Metadata } from "next";
import { getTopicBySlug } from "@/features/song/data/topics";
import { PageShell } from "@/shared/components/PageShell";
import { SongsSkeleton } from "../songs/SongsSkeleton";
import { SongsCatalog } from "../songs/SongsCatalog";

// /songs?q=… / ?sort=… — rewritten here by next.config.ts
// (the browser keeps the /songs URL). Search results differ per request, so
// this renders on demand; the bare /songs is the cached app/songs/page.tsx.
// Never linked directly: canonical points at /songs.

export async function generateMetadata({ searchParams }: SearchProps): Promise<Metadata> {
  const params = await searchParams;
  const topicSlug = typeof params.topic === "string" ? params.topic : undefined;
  const topic = getTopicBySlug(topicSlug);
  if (topic) {
    // Defensive: this branch normally doesn't fire because next.config
    // redirects `/songs?topic=<slug>` → `/songs/topic/<slug>` with 301
    // before this metadata runs. But if the redirect ever misfires, point
    // canonical at the new path-based URL so search engines still
    // consolidate at the right place.
    const canonical = `/songs/topic/${topic.slug}`;
    return {
      title: `${topic.pageHeading} — Акорди для гітари | Diez`,
      description: topic.description,
      alternates: { canonical },
      openGraph: {
        title: `${topic.pageHeading} — Diez`,
        description: topic.description,
        type: "website",
        url: canonical,
      },
    };
  }
  return {
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
}

interface SearchProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function SongsSearchPage({ searchParams }: SearchProps) {
  return (
    <PageShell>
      <Suspense fallback={<SongsSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function SearchResults({ searchParams }: SearchProps) {
  return <SongsCatalog params={await searchParams} />;
}
