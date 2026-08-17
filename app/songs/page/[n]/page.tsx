import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSongsPage } from "@/features/song/services/songs";
import { PageShell } from "@/shared/components/PageShell";
import { SongCover } from "@/shared/components/SongCover";
import { siteUrl, jsonLdScript } from "@/lib/utils";

/**
 * Crawlable catalogue pagination.
 *
 * `/songs` uses infinite scroll (IntersectionObserver + a server action), so
 * only the first 50 songs ever appear as <a href> in the SSR HTML. Everything
 * past that was reachable only through sitemap.xml — orphan pages with no
 * internal links, which is the classic profile of GSC's «Проскановано —
 * наразі не проіндексовано».
 *
 * These pages give every song a real, crawlable link. Ordering is
 * alphabetical (`title_asc` → the stable `title_sort` column) on purpose:
 * popularity sorts reshuffle between crawls, which would move songs across
 * page boundaries and let some slip through the cracks entirely.
 *
 * Ordering is deliberately different from /songs (popularity-sorted), so page
 * 1 is a real page rather than a redirect — the first 100 songs alphabetically
 * are not the 100 most popular ones.
 *
 * Humans keep the infinite scroll; they reach these pages from the footer
 * link, the index row under /songs, or straight from search.
 */

const PER_PAGE = 100;

// Alphabetical order is stable, so a page's content only changes when the
// catalogue itself does — safe to cache for an hour.
export const revalidate = 3600;

function parsePageNumber(raw: string): number | null {
  if (!/^[1-9]\d{0,3}$/.test(raw)) return null;
  return Number.parseInt(raw, 10);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const pageNum = parsePageNumber(n);
  if (!pageNum) return {};

  const { total } = await getSongsPage({ sortBy: "title_asc", offset: 0, limit: 1 });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (pageNum > totalPages) return {};

  const from = (pageNum - 1) * PER_PAGE + 1;
  const to = Math.min(pageNum * PER_PAGE, total);

  return {
    title: `Усі пісні з акордами — сторінка ${pageNum} з ${totalPages} | Diez`,
    description:
      `Повний каталог пісень з акордами й текстами на Diez, за абеткою — ` +
      `позиції ${from}–${to} з ${total}. Акорди для гітари, укулеле та піаніно.`,
    alternates: { canonical: `/songs/page/${pageNum}` },
    openGraph: {
      title: `Усі пісні — сторінка ${pageNum} | Diez`,
      description: `Каталог пісень з акордами, позиції ${from}–${to} з ${total}.`,
      type: "website",
      url: `/songs/page/${pageNum}`,
    },
  };
}

/**
 * Full numbered index. Every page links to every other page, so a crawler
 * that lands on any one of them reaches the whole catalogue in two hops.
 */
function PageIndex({ current, totalPages }: { current: number; totalPages: number }) {
  return (
    <nav aria-label="Сторінки каталогу" className="mt-10">
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Сторінки каталогу:
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          const isCurrent = p === current;
          return (
            <li key={p}>
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="inline-flex items-center justify-center te-inset text-xs font-bold"
                  style={{ minWidth: 34, padding: "0.4rem 0.6rem", borderRadius: "0.75rem", color: "var(--orange)" }}
                >
                  {p}
                </span>
              ) : (
                <Link
                  href={`/songs/page/${p}`}
                  className="inline-flex items-center justify-center te-surface text-xs hover:opacity-100 transition-opacity"
                  style={{ minWidth: 34, padding: "0.4rem 0.6rem", borderRadius: "0.75rem", color: "var(--text-muted)", opacity: 0.75 }}
                >
                  {p}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default async function SongsPaginatedPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const pageNum = parsePageNumber(n);
  if (!pageNum) notFound();

  const { songs, total } = await getSongsPage({
    sortBy: "title_asc",
    offset: (pageNum - 1) * PER_PAGE,
    limit: PER_PAGE,
  });
  if (songs.length === 0) notFound();

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = (pageNum - 1) * PER_PAGE + 1;
  const to = Math.min(pageNum * PER_PAGE, total);

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Diez", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Пісні", item: `${siteUrl}/songs` },
      {
        "@type": "ListItem",
        position: 3,
        name: `Сторінка ${pageNum}`,
        item: `${siteUrl}/songs/page/${pageNum}`,
      },
    ],
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsLd) }}
      />

      <div className="mb-6">
        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
          <Link href="/songs" className="hover:underline">
            Каталог пісень
          </Link>
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
          Усі пісні — сторінка {pageNum}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Повний каталог за абеткою, позиції {from}–{to} з {total}.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {songs.map((song) => (
          <li
            key={song.slug}
            className="te-surface flex items-center gap-3 p-3"
            style={{ borderRadius: "1rem", contentVisibility: "auto", containIntrinsicSize: "auto 80px" }}
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
              <SongCover
                src={song.coverImage}
                alt={`Обкладинка пісні «${song.title}» — ${song.artist}`}
                title={`${song.title} — ${song.artist}`}
                width={56}
                height={56}
                iconSize={22}
              />
            </div>
            <Link href={`/songs/${song.slug}`} className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate" style={{ color: "var(--text)" }}>
                {song.title}
              </div>
              <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                {song.artist}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Prev / next — the crawl path a search engine follows step by step. */}
      <div className="flex items-center justify-between gap-3 mt-6">
        {pageNum > 1 ? (
          <Link
            href={`/songs/page/${pageNum - 1}`}
            className="te-surface px-4 py-2.5 text-xs font-bold"
            style={{ borderRadius: "999px", color: "var(--text-mid)" }}
          >
            ← Попередня
          </Link>
        ) : (
          <span />
        )}
        {pageNum < totalPages ? (
          <Link
            href={`/songs/page/${pageNum + 1}`}
            className="te-surface px-4 py-2.5 text-xs font-bold"
            style={{ borderRadius: "999px", color: "var(--text-mid)" }}
          >
            Наступна →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <PageIndex current={pageNum} totalPages={totalPages} />
    </PageShell>
  );
}
