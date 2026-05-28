import type { ReactNode } from "react";

export interface ArticleFaqItem {
  q: string;
  a: string;
}

export interface ArticleSource {
  label: string;
  url?: string;
}

export interface ArticleMeta {
  /** URL slug under /learn/. */
  slug: string;
  /** H1 + base of the SEO <title>. */
  title: string;
  /** Meta description (~150 chars). */
  description: string;
  /** Short blurb for the index card. */
  excerpt: string;
  /** Small emoji shown on the index card (decorative). */
  emoji: string;
  /** Sort order in the index (lower first). */
  order: number;
  /** Visible FAQ + FAQPage structured data. */
  faq?: ArticleFaqItem[];
  /**
   * Attribution. List here only if the article reuses substantial text/figures
   * from an external source (Wikipedia-style citation to stay copyright-clean).
   * Leave empty for fully original material.
   */
  sources?: ArticleSource[];
}

export interface Article {
  meta: ArticleMeta;
  /** Article body — server-renderable JSX (may embed client islands). */
  Body: () => ReactNode;
}
