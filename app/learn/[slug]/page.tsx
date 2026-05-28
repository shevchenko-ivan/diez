import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/shared/components/Navbar";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { BackButton } from "@/shared/components/BackButton";
import { ARTICLES, getArticle, getArticleSlugs } from "@/features/learn/articles";
import { siteUrl, jsonLdScript } from "@/lib/utils";

export function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  const { title, description } = article.meta;
  return {
    title: `${title} — Diez`,
    description,
    keywords: [title, "гітара", "акорди", "для початківців", "навчання"],
    alternates: { canonical: `/learn/${slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/learn/${slug}`,
      type: "article",
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return notFound();
  const { meta, Body } = article;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    inLanguage: "uk",
    url: `${siteUrl}/learn/${slug}`,
    mainEntityOfPage: `${siteUrl}/learn/${slug}`,
    author: { "@type": "Organization", name: "Diez", url: siteUrl },
    publisher: { "@type": "Organization", name: "Diez", url: siteUrl },
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Diez", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Навчання", item: `${siteUrl}/learn` },
      { "@type": "ListItem", position: 3, name: meta.title, item: `${siteUrl}/learn/${slug}` },
    ],
  };

  const faqLd = meta.faq && meta.faq.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: meta.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  // Other articles for the "read next" block.
  const more = ARTICLES.filter((a) => a.meta.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }} />
      )}

      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 md:py-14">
        <div className="mb-6">
          <BackButton fallback="/learn" />
        </div>

        <nav aria-label="Хлібні крихти" className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          <Link href="/learn" className="hover:underline">Навчання</Link>
          <span aria-hidden="true"> › </span>
          <span>{meta.title}</span>
        </nav>

        <article>
          <h1
            className="font-bold mb-6"
            style={{ fontSize: "1.9rem", letterSpacing: "-0.03em", color: "var(--text)", lineHeight: 1.2, textWrap: "balance" }}
          >
            {meta.title}
          </h1>

          <div className="learn-prose">
            <Body />
          </div>

          {meta.faq && meta.faq.length > 0 && (
            <section className="mt-12">
              <h2 className="font-bold mb-5" style={{ fontSize: "1.3rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
                Часті запитання
              </h2>
              <dl className="space-y-5">
                {meta.faq.map((f) => (
                  <div key={f.q}>
                    <dt className="font-bold mb-1.5" style={{ fontSize: "0.95rem", color: "var(--text)" }}>{f.q}</dt>
                    <dd style={{ fontSize: "0.9rem", lineHeight: 1.65, color: "var(--text-mid)" }}>{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>

        {/* Attribution — sources (if the article reused external material) +
            a standing note that the material is original/educational. */}
        <footer className="mt-12 pt-6 text-xs" style={{ borderTop: "1px solid var(--border, rgba(0,0,0,0.08))", color: "var(--text-muted)", lineHeight: 1.6 }}>
          {meta.sources && meta.sources.length > 0 && (
            <div className="mb-3">
              <span className="font-bold" style={{ color: "var(--text-mid)" }}>Джерела:</span>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                {meta.sources.map((s) => (
                  <li key={s.label}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "var(--orange-text)" }}>
                        {s.label}
                      </a>
                    ) : (
                      s.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>
            Матеріал підготовлено редакцією Diez і має навчальний характер. Умови
            використання — <Link href="/terms" style={{ color: "var(--orange-text)" }}>тут</Link>.
          </p>
        </footer>

        {/* Read next */}
        <aside className="mt-14 pt-8" style={{ borderTop: "1px solid var(--border, rgba(0,0,0,0.08))" }}>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            Читати далі
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {more.map((a) => (
              <Link
                key={a.meta.slug}
                href={`/learn/${a.meta.slug}`}
                className="te-surface te-pressable flex flex-col"
                style={{ borderRadius: "1rem", padding: "0.9rem 1rem" }}
              >
                <span aria-hidden="true" style={{ fontSize: "1.25rem" }}>{a.meta.emoji}</span>
                <span className="font-bold mt-2" style={{ fontSize: "0.85rem", lineHeight: 1.35, color: "var(--text)" }}>
                  {a.meta.title}
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
