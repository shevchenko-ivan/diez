import { Suspense } from "react";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSongsPage, type SongsPageArgs } from "@/features/song/services/songs";
import { getSavedSlugs } from "@/features/playlist/actions/playlists";
import { getInstrumentBySlug, INSTRUMENTS } from "@/features/song/data/instruments";
import { PageShell } from "@/shared/components/PageShell";
import { LoadingState } from "@/shared/components/LoadingState";
import { SortSelect } from "../../SortSelect";
import { SongsInfiniteList } from "../../SongsInfiniteList";
import { SearchSubmitButton } from "../../SearchSubmitButton";
import { siteUrl, jsonLdScript } from "@/lib/utils";

// Per-instrument landing pages at /songs/instrument/<slug>. Every song is
// playable on every instrument (the chord toggle just changes the fingering
// drawn), so these list the full catalogue — the value is the instrument-
// specific framing that captures "акорди для укулеле" / "акорди для піаніно".
//
// `force-static`: only 2 hubs, neither depends on the current user, the list
// is rebuilt on `revalidate`. Pre-rendered HTML on first byte for Googlebot.
export const dynamic = "force-static";
export const revalidate = 3600;

export function generateStaticParams() {
  return INSTRUMENTS.map((i) => ({ slug: i.slug }));
}

interface RouteProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const inst = getInstrumentBySlug(slug);
  if (!inst) return {};
  const canonical = `/songs/instrument/${inst.slug}`;
  return {
    title: `${inst.pageHeading} — пісні з акордами | Diez`,
    description: inst.description,
    keywords: inst.keywords,
    alternates: { canonical },
    openGraph: {
      title: `${inst.pageHeading} — Diez`,
      description: inst.description,
      type: "website",
      url: canonical,
    },
  };
}

async function InstrumentContent({ params, searchParams }: RouteProps) {
  const { slug } = await params;
  const inst = getInstrumentBySlug(slug);
  if (!inst) notFound();

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
  // No instrument filter — the whole catalogue is playable on every
  // instrument. The hub differentiates from /songs via copy + framing.
  const queryArgs: Omit<SongsPageArgs, "offset" | "limit"> = {
    q: q || undefined,
    sortBy: sortMap[sort] ?? "source_views",
  };
  const [{ songs, total }, savedSet] = await Promise.all([
    getSongsPage({ ...queryArgs, offset: 0, limit: 50 }),
    getSavedSlugs(),
  ]);
  const savedSlugs = Array.from(savedSet);

  const heading = `${inst.emoji} ${inst.pageHeading}`;

  // Structured data — CollectionPage + BreadcrumbList.
  const pageUrl = `${siteUrl}/songs/instrument/${inst.slug}`;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: inst.pageHeading,
    description: inst.description,
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
      { "@type": "ListItem", position: 3, name: inst.pageHeading, item: pageUrl },
    ],
  };

  // Cross-link row: guitar (= /songs catalogue) + the sibling instrument hub.
  // Funnels link-equity between the instrument pages and /songs so Google
  // reads them as one connected cluster, not orphan pages.
  const otherInstruments = INSTRUMENTS.filter((i) => i.slug !== inst.slug);

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
          {inst.description}
        </p>

        {/* Long-form intro — hidden once the user starts searching, to keep
            the search view clean. */}
        {!q && (
          <p
            className="mb-6 max-w-3xl"
            style={{ fontSize: "0.9rem", lineHeight: 1.65, color: "var(--text-mid)" }}
          >
            {inst.seoIntro}
          </p>
        )}

        <form
          method="GET"
          action={`/songs/instrument/${inst.slug}`}
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
              placeholder="Шукати пісню…"
              className="flex-1 bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
          <SearchSubmitButton />
        </form>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-semibold" style={{ fontSize: "1.125rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
          {q ? `Результати для "${rawQ}"` : "Усі пісні"}
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

      {/* ── Other instruments — internal linking ───────────────────────── */}
      <nav
        aria-label="Інші інструменти"
        className="mt-16 pt-8"
        style={{ borderTop: "1px solid var(--surface-dk)" }}
      >
        <h2
          className="font-bold mb-5"
          style={{ fontSize: "1rem", letterSpacing: "-0.01em", color: "var(--text)" }}
        >
          Акорди для інших інструментів
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Guitar = the main /songs catalogue */}
          <Link
            href="/songs"
            className="te-surface te-pressable p-4 flex flex-col justify-between"
            style={{ borderRadius: "1rem", minHeight: 86 }}
          >
            <span style={{ fontSize: "1.3rem" }}>🎸</span>
            <div>
              <p className="font-medium text-sm" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
                Акорди для гітари
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Увесь каталог пісень
              </p>
            </div>
          </Link>
          {otherInstruments.map((i) => (
            <Link
              key={i.slug}
              href={`/songs/instrument/${i.slug}`}
              className="te-surface te-pressable p-4 flex flex-col justify-between"
              style={{ borderRadius: "1rem", minHeight: 86 }}
            >
              <span style={{ fontSize: "1.3rem" }}>{i.emoji}</span>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
                  {i.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {i.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function InstrumentPage(props: RouteProps) {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <InstrumentContent {...props} />
      </Suspense>
    </PageShell>
  );
}
