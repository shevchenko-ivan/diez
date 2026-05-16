import Link from "next/link";
import { getRankedArtists } from "@/features/artist/services/artists";

const NAV_COLUMNS = [
  {
    title: "Каталог",
    links: [
      { label: "Пісні",     href: "/songs" },
      { label: "Виконавці", href: "/artists" },
    ],
  },
  {
    title: "Відкрити",
    links: [
      { label: "Популярні пісні",  href: "/songs?sort=popular" },
      { label: "Останні додані",   href: "/songs?sort=new" },
      { label: "Для початківців",  href: "/songs?difficulty=easy" },
    ],
  },
  {
    title: "Проєкт",
    links: [
      { label: "Про Diez",         href: "/about" },
      { label: "Зворотний зв'язок", href: "mailto:hello@diez.net.ua" },
    ],
  },
];

export async function SiteFooter() {
  // Top artists row — every page footer ships ~12 crawlable links to the
  // most-played artist pages. This is the single most leveraged internal-
  // linking move on a content site: it concentrates PageRank from the long
  // tail of song pages onto the canonical artist hubs, which then rank for
  // brand-name queries ("акорди Океан Ельзи").
  // `getRankedArtists` is unstable_cache'd at 30 min so this doesn't add
  // per-request load.
  const topArtists = (await getRankedArtists()).slice(0, 12);

  return (
    <footer
      className="mt-auto px-6 pt-12 pb-8"
      style={{ borderTop: "1px solid var(--surface-dk)" }}
    >
      <div className="max-w-6xl mx-auto">

        {/* Main row */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-10">

          {/* Brand block */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center mb-3">
              <span style={{ color: "var(--orange)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.04em" }}>
                #
              </span>
              <span style={{ color: "var(--text)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.04em" }}>
                DIEZ
              </span>
            </Link>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                lineHeight: 1.55,
                maxWidth: 200,
              }}
            >
              Українські пісні, тексти й акорди для гри та співу.
            </p>
          </div>

          {/* Nav columns */}
          {NAV_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p
                className="uppercase tracking-widest mb-3"
                style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em" }}
              >
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="footer-link"
                      style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontWeight: 400 }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Top artists row — sitewide internal links to the most popular
            artist hubs. Rendered as a wrapping inline list, not a column,
            so 12 names fit in one screen-width slot without dominating. */}
        {topArtists.length > 0 && (
          <nav aria-label="Популярні виконавці" className="mb-8">
            <p
              className="uppercase tracking-widest mb-3"
              style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em" }}
            >
              Популярні виконавці
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {topArtists.map((a, i) => (
                <span key={a.slug} className="inline-flex items-center gap-3">
                  <Link
                    href={`/artists/${a.slug}`}
                    className="footer-link"
                    style={{ fontSize: "0.8rem", color: "var(--text-mid)", fontWeight: 500 }}
                  >
                    {a.name}
                  </Link>
                  {i < topArtists.length - 1 && (
                    <span aria-hidden style={{ color: "var(--text-muted)", opacity: 0.4, fontSize: "0.7rem" }}>
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
          </nav>
        )}

        {/* Bottom row */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid var(--surface-dk)" }}
        >
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            © 2026 Diez. Всі права захищені.
          </p>
          <nav className="flex items-center gap-4 flex-wrap" aria-label="Юридичні документи">
            {[
              { label: "Конфіденційність", href: "/privacy" },
              { label: "Умови використання", href: "/terms" },
              { label: "Авторські права", href: "/copyright" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="footer-link"
                style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

      </div>
    </footer>
  );
}
