import { Suspense } from "react";
import { type Metadata } from "next";
import { getSongsPage, type SongsPageArgs } from "@/features/song/services/songs";
import { getSavedSlugs } from "@/features/playlist/actions/playlists";
import { getTopicBySlug } from "@/features/song/data/topics";
import { PageShell } from "@/shared/components/PageShell";
import { LoadingState } from "@/shared/components/LoadingState";
import { SortSelect } from "./SortSelect";
import { SongsInfiniteList } from "./SongsInfiniteList";
import { SearchSubmitButton } from "./SearchSubmitButton";
import { siteUrl, jsonLdScript } from "@/lib/utils";

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
      "Шукайте акорди для гітари. Тисячі пісень українських та зарубіжних виконавців. Фільтруйте за складністю та жанром.",
    alternates: { canonical: "/songs" },
    openGraph: {
      title: "Каталог пісень — Diez",
      description: "Акорди для гітари. Знаходьте пісні та грайте разом.",
      type: "website",
      url: "/songs",
    },
  };
}

interface SearchProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function SongsContent({ searchParams }: SearchProps) {
  const resolvedParams = await searchParams;
  const rawQ = resolvedParams.q;
  const q = typeof rawQ === "string" ? rawQ.toLowerCase() : "";
  const sort = typeof resolvedParams.sort === "string" ? resolvedParams.sort : "";
  const topicSlug = typeof resolvedParams.topic === "string" ? resolvedParams.topic : undefined;
  const topic = getTopicBySlug(topicSlug);

  const sortMap: Record<string, "views" | "created_at_desc" | "created_at_asc" | "source_views" | "title_asc"> = {
    new: "created_at_desc",
    old: "created_at_asc",
    popular: "source_views",
    az: "title_asc",
    views: "views",
  };
  const queryArgs: Omit<SongsPageArgs, "offset" | "limit"> = {
    q: q || undefined,
    sortBy: sortMap[sort] ?? "source_views",
    topic: topic?.slug,
  };
  const [{ songs, total }, savedSet] = await Promise.all([
    getSongsPage({ ...queryArgs, offset: 0, limit: 50 }),
    getSavedSlugs(),
  ]);
  const savedSlugs = Array.from(savedSet);

  const heading = topic ? `${topic.emoji} ${topic.pageHeading}` : "Каталог пісень";
  const subheading = topic
    ? topic.description
    : "Тисячі пісень. Шукайте за назвою або виконавцем.";

  // Structured data for the catalog/topic index. CollectionPage tells Google
  // this is a list page (not a single article), and the BreadcrumbList lets
  // SERPs render "Diez › Пісні › <topic>" trails. We don't enumerate every
  // song into itemListElement here — there are thousands, and Google's
  // crawler will discover them via the sitemap + on-page links anyway.
  const pageUrl = topic ? `${siteUrl}/songs?topic=${topic.slug}` : `${siteUrl}/songs`;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: heading,
    description: subheading,
    url: pageUrl,
    inLanguage: "uk",
    isPartOf: { "@type": "WebSite", name: "Diez", url: siteUrl },
    numberOfItems: total,
  };
  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Diez", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Пісні", item: `${siteUrl}/songs` },
      ...(topic
        ? [{ "@type": "ListItem", position: 3, name: topic.pageHeading, item: pageUrl }]
        : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(collectionLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsLd) }}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
          {heading}
        </h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          {subheading}
        </p>

        {/* Long-form intro paragraph — only on topic landing pages, and only
            on the unfiltered view (no `q`). When the user starts searching
            in a topic the intro becomes irrelevant noise and we hide it.
            Critical for SEO: without ~120+ words of body text these topic
            pages get classified as thin content by Google. */}
        {topic && !q && (
          <p
            className="mb-6 max-w-3xl"
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.65,
              color: "var(--text-mid)",
            }}
          >
            {topic.seoIntro}
          </p>
        )}

        <form method="GET" action="/songs" className="flex items-center gap-3 w-full">
          {sort && <input type="hidden" name="sort" value={sort} />}
          {topic && <input type="hidden" name="topic" value={topic.slug} />}
          <div className="te-inset flex-1 flex items-center gap-3 px-4 py-3" style={{ borderRadius: "999px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              name="q"
              type="text"
              defaultValue={typeof rawQ === "string" ? rawQ : ""}
              placeholder={topic ? "Шукати в підбірці…" : "Пісня або виконавець..."}
              className="flex-1 bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
          <SearchSubmitButton />
        </form>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-semibold" style={{ fontSize: "1.125rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
          {q ? `Результати для "${rawQ}"` : topic ? topic.title : sort === "new" ? "Нові підбори" : sort === "popular" ? "Топ популярних" : "Всі пісні"}
          {total > 0 && (
            <span className="ml-2 text-sm font-normal" style={{ color: "var(--text-muted)" }}>
              {total}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <SortSelect value={sort} />
        </div>
      </div>

      <SongsInfiniteList
        initialSongs={songs}
        initialTotal={total}
        savedSlugs={savedSlugs}
        query={queryArgs}
      />
    </>
  );
}

export default function SongsPage({ searchParams }: SearchProps) {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <SongsContent searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
