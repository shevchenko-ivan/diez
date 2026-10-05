import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { User, Music, Layers } from "lucide-react";
import { PageShell } from "@/shared/components/PageShell";
import { coverThumb } from "@/lib/utils";
import { getPublicProfile } from "@/features/profile/services/public-profile";

// Public contributor page — who added which songs and variants. Static per
// profile (ISR, built on first visit); refreshed daily and whenever the
// catalogue changes (the data cache carries the "songs" tag).
export const revalidate = 86400;
export function generateStaticParams(): { id: string }[] {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) return {};
  return {
    title: `${profile.name} — пісні та варіанти на Diez`,
    description: `${profile.name} на Diez: ${plural(profile.songs.length, "пісня", "пісні", "пісень")} і ${plural(profile.variants.length, "варіант", "варіанти", "варіантів")} акордів.`,
    alternates: { canonical: `/u/${id}` },
    // Thin by nature (a list of links to pages that live elsewhere); keep it
    // out of the index but let the links pass equity to the songs.
    robots: { index: false, follow: true },
  };
}

// Genitive month names: «з червня 2026» (toLocaleDateString gives the
// nominative «червень» when the day is omitted).
const MONTHS_GEN = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];

function joined(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  return `${n} ${word}`;
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) notFound();
  const since = joined(profile.joinedAt);

  return (
    <PageShell>
      <header className="flex items-center gap-4 mb-10">
        <div
          className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{ background: profile.avatarUrl ? "var(--surface-dk)" : "var(--orange)" }}
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverThumb(profile.avatarUrl, 160) as string} alt="" width={64} height={64} className="w-full h-full object-cover" />
          ) : (
            <User size={28} color="#fff" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-bold truncate" style={{ fontSize: "1.5rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
            {profile.name}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {since ? `На Diez з ${since} · ` : ""}
            {plural(profile.songs.length, "пісня", "пісні", "пісень")} ·{" "}
            {plural(profile.variants.length, "варіант", "варіанти", "варіантів")}
          </p>
        </div>
      </header>

      {profile.songs.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bold mb-4 flex items-center gap-2" style={{ fontSize: "1.0625rem", color: "var(--text)" }}>
            <Music size={16} style={{ color: "var(--orange)" }} /> Додані пісні
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {profile.songs.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/songs/${s.slug}`}
                  className="te-surface te-pressable flex items-center gap-3 p-3"
                  style={{ borderRadius: "1rem" }}
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--surface-dk)" }}>
                    {s.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverThumb(s.cover, 120) as string} alt="" width={44} height={44} loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{s.title}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.artist}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.variants.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bold mb-4 flex items-center gap-2" style={{ fontSize: "1.0625rem", color: "var(--text)" }}>
            <Layers size={16} style={{ color: "var(--orange)" }} /> Варіанти акордів
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {profile.variants.map((v) => (
              <li key={v.variantId}>
                <Link
                  href={`/songs/${v.slug}?v=${v.variantId}`}
                  className="te-surface te-pressable flex items-center justify-between gap-3 p-3"
                  style={{ borderRadius: "1rem" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{v.title}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{v.artist}</p>
                  </div>
                  <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: "var(--orange-text)" }}>{v.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.songs.length === 0 && profile.variants.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Поки що без опублікованих пісень.</p>
      )}
    </PageShell>
  );
}
