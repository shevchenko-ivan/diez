import { type Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/shared/components/Navbar";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { ARTICLES } from "@/features/learn/articles";
import { siteUrl, jsonLdScript } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Навчання гри на гітарі — Diez",
  description:
    "Прості статті для початківців: будова гітари, що таке акорди й баре, як читати схеми, які акорди вчити першими. Усе зрозумілою мовою.",
  keywords: [
    "навчання гри на гітарі",
    "акорди для початківців",
    "що таке баре",
    "як читати акорди",
    "гітара з нуля",
  ],
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "Навчання гри на гітарі — Diez",
    description:
      "Прості статті для початківців: будова гітари, акорди, баре, схеми акордів.",
    url: `${siteUrl}/learn`,
    type: "website",
  },
};

export default function LearnPage() {
  // ItemList structured data — helps Google show the section as a collection.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Навчання гри на гітарі",
    itemListElement: ARTICLES.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.meta.title,
      url: `${siteUrl}/learn/${a.meta.slug}`,
    })),
  };

  return (
    <div className="min-h-screen min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListLd) }}
      />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-4xl mx-auto w-full px-6 pt-6 pb-12 md:py-16">
        <header className="mb-10">
          <h1
            className="font-bold mb-3"
            style={{ fontSize: "2.25rem", letterSpacing: "-0.03em", color: "var(--text)", textWrap: "balance" }}
          >
            Навчання
          </h1>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "var(--text-mid)", maxWidth: "42ch" }}>
            Коротко й зрозуміло про основи гри на гітарі — для тих, хто тільки починає.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ARTICLES.map((a) => (
            <Link
              key={a.meta.slug}
              href={`/learn/${a.meta.slug}`}
              className="te-card-thick te-pressable flex flex-col"
              style={{ borderRadius: "1.25rem", padding: "1.25rem 1.35rem" }}
            >
              <span aria-hidden="true" style={{ fontSize: "1.75rem", lineHeight: 1 }}>{a.meta.emoji}</span>
              <h2 className="font-bold mt-3 mb-1.5" style={{ fontSize: "1.05rem", letterSpacing: "-0.01em", color: "var(--text)" }}>
                {a.meta.title}
              </h2>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
                {a.meta.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
