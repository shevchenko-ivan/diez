import { type Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/shared/components/PageShell";
import { TeButton } from "@/shared/components/TeButton";
import { HeroSearch } from "@/features/song/components/SongCard";

// Explicit canonical so Google doesn't index 404 with the broken URL.
// `robots: noindex` is the bigger lever — even if the 404 leaks a cached
// canonical somehow, Google still drops it.
export const metadata: Metadata = {
  title: "404 — Сторінку не знайдено · Diez",
  robots: { index: false, follow: true },
};

// Quick-access tiles below the search. Same set the user has on hand from
// the Navbar — gives a fast escape route from a dead URL.
const QUICK_LINKS: { href: string; label: string; emoji: string }[] = [
  { href: "/songs",    label: "Пісні",         emoji: "🎵" },
  { href: "/artists",  label: "Виконавці",     emoji: "🎤" },
  { href: "/chords",   label: "Визначити акорд", emoji: "🎸" },
  { href: "/tuner",    label: "Тюнер",         emoji: "🎚" },
];

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center px-4">
        <div
          className="te-lcd font-mono-te text-7xl font-bold mb-6 px-8 py-4"
          style={{ letterSpacing: "-0.04em" }}
        >
          404
        </div>
        <h1
          className="text-3xl font-bold uppercase tracking-tighter mb-3"
          style={{ color: "var(--text)" }}
        >
          Сторінку не знайдено
        </h1>
        <p
          className="text-sm font-medium mb-8 opacity-60 max-w-md"
          style={{ color: "var(--text-muted)" }}
        >
          Можливо, посилання застаріло або сторінки більше не існує. Спробуйте знайти
          потрібне через пошук.
        </p>

        {/* HeroSearch is the same combobox as on the homepage — handles
            songs, artists, and full-text lyrics. Far more useful than a
            plain "Back to home" button as a 404 escape hatch. */}
        <div className="w-full max-w-lg mb-10">
          <HeroSearch />
        </div>

        {/* Tiles instead of a single button so a user who's lost can pick
            their actual destination instead of being bounced to a generic
            home page. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mb-8">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="te-surface te-pressable px-4 py-4 flex flex-col items-center justify-center gap-1.5"
              style={{ borderRadius: "1rem" }}
            >
              <span style={{ fontSize: "1.5rem" }}>{link.emoji}</span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text)" }}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        <TeButton shape="pill" href="/" className="px-6 py-3 text-xs font-bold tracking-widest">
          НА ГОЛОВНУ
        </TeButton>
      </div>
    </PageShell>
  );
}
