import { Suspense } from "react";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSongsPage, type SongsPageArgs } from "@/features/song/services/songs";
import { getSavedSlugs } from "@/features/playlist/actions/playlists";
import { getTopicBySlug, TOPICS } from "@/features/song/data/topics";
import { PageShell } from "@/shared/components/PageShell";
import { LoadingState } from "@/shared/components/LoadingState";
import { SortSelect } from "../../SortSelect";
import { SongsInfiniteList } from "../../SongsInfiniteList";
import { SearchSubmitButton } from "../../SearchSubmitButton";
import { siteUrl, jsonLdScript } from "@/lib/utils";

// Topic landing pages live at /songs/topic/<slug>. Path-based URLs rank
// better than query-string equivalents (the old /songs?topic=<slug>
// shape is 301-redirected to here via next.config.ts).
//
// `force-static` is intentional: there are only 8 topics, none of them
// depend on the current user, and the song list is rebuilt on `revalidate`.
// Pre-rendering gives Googlebot a fully-rendered HTML on first byte.
export const dynamic = "force-static";
export const revalidate = 3600;

// Pre-generate the 8 known topic slugs at build time so Next emits them as
// static .html files. Unknown slugs fall through to notFound() at request
// time.
export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

interface RouteProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) return {};
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

async function TopicContent({ params, searchParams }: RouteProps) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  const resolvedParams = await searchParams;
  const rawQ = resolvedParams.q;
  const q = typeof rawQ === "string" ? rawQ.toLowerCase() : "";
  const sort = typeof resolvedParams.sort === "string" ? resolvedParams.sort : "";

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
    topic: topic.slug,
  };
  const [{ songs, total }, savedSet] = await Promise.all([
    getSongsPage({ ...queryArgs, offset: 0, limit: 50 }),
    getSavedSlugs(),
  ]);
  const savedSlugs = Array.from(savedSet);

  const heading = `${topic.emoji} ${topic.pageHeading}`;
  const subheading = topic.description;

  // Structured data — CollectionPage + BreadcrumbList.
  const pageUrl = `${siteUrl}/songs/topic/${topic.slug}`;
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
      { "@type": "ListItem", position: 3, name: topic.pageHeading, item: pageUrl },
    ],
  };

  // Other topics — internal-linking row at the bottom so each topic page
  // funnels link equity to its siblings. Google reads this as "this is one
  // of N curated collections", which is a stronger signal than 8 isolated
  // pages.
  const otherTopics = TOPICS.filter((t) => t.slug !== topic.slug);

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

        {/* Long-form intro paragraph — hidden once the user starts searching
            inside the topic, to keep the search view clean. */}
        {!q && (
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

        <form
          method="GET"
          action={`/songs/topic/${topic.slug}`}
          className="flex items-center gap-3 w-full"
        >
          {sort && <input type="hidden" name="sort" value={sort} />}
          <div className="te-inset flex-1 flex items-center gap-3 px-4 py-3" style={{ borderRadius: "999px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              name="q"
              type="text"
              defaultValue={typeof rawQ === "string" ? rawQ : ""}
              placeholder="Шукати в підбірці…"
              className="flex-1 bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
          <SearchSubmitButton />
        </form>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-semibold" style={{ fontSize: "1.125rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
          {q ? `Результати для "${rawQ}"` : topic.title}
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

      {/* ── Related topics — internal linking ──────────────────────────
          Concentrates link-equity between the 8 topic pages so Google
          treats them as a connected cluster rather than orphan pages. */}
      <nav
        aria-label="Інші підбірки"
        className="mt-16 pt-8"
        style={{ borderTop: "1px solid var(--surface-dk)" }}
      >
        <h2
          className="font-bold mb-5"
          style={{ fontSize: "1rem", letterSpacing: "-0.01em", color: "var(--text)" }}
        >
          Інші підбірки
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {otherTopics.map((t) => (
            <Link
              key={t.slug}
              href={`/songs/topic/${t.slug}`}
              className="te-surface te-pressable p-4 flex flex-col justify-between"
              style={{ borderRadius: "1rem", minHeight: 86 }}
            >
              <span style={{ fontSize: "1.3rem" }}>{t.emoji}</span>
              <div>
                <p
                  className="font-medium text-sm"
                  style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
                >
                  {t.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {t.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function TopicPage(props: RouteProps) {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <TopicContent {...props} />
      </Suspense>
    </PageShell>
  );
}
