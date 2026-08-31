import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { ChordDiagram } from "@/features/song/components/ChordDiagram";
import { PianoDiagram } from "@/features/song/components/PianoDiagram";
import {
  lookupChord,
  lookupNoBarreVoicing,
  NOTES,
  type ChordDef,
} from "@/features/song/data/chord-templates";
import { lookupChordUke, UKE_OPEN_FREQS } from "@/features/song/data/chord-templates-ukulele";
import { lookupChordPiano } from "@/features/song/data/chord-templates-piano";
import { CHORD_PAGES, getChordPage, UKR_NOTE } from "@/features/song/data/chord-pages";
import { getSongsSharingChords } from "@/features/song/services/songs";
import { siteUrl, jsonLdScript } from "@/lib/utils";

// ── Chord dictionary page (/chords/<slug>) ───────────────────────────────────
//
// One landing page per common chord — «акорд am на гітарі» class queries.
// Everything on the page is generated from the same voicing data that powers
// the song-page diagram panel (chord-templates*), so the dictionary can never
// drift from what the rest of the site teaches. The songs block doubles as
// internal linking: every dictionary page links real catalogue pages and
// every song page links back here (see SongViewer).

// Songs rotate slowly; regenerate every 6 hours.
export const revalidate = 21600;

export function generateStaticParams() {
  return CHORD_PAGES.map((p) => ({ chord: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chord: string }>;
}): Promise<Metadata> {
  const { chord } = await params;
  const page = getChordPage(chord);
  if (!page) return {};
  const { name, ukr } = page;
  const title = `Акорд ${name} (${ukr}) на гітарі — аплікатура | Diez`;
  const description =
    `Як затиснути акорд ${name} на гітарі: схеми аплікатури з пальцями, ` +
    `ноти акорду, варіанти для укулеле й піаніно та пісні з ${name} у каталозі Diez.`;
  return {
    title,
    description,
    keywords: [
      `акорд ${name.toLowerCase()}`,
      `акорд ${name.toLowerCase()} на гітарі`,
      `${name} акорд`,
      `як затиснути ${name}`,
      `${name} аплікатура`,
      `акорд ${ukr}`,
    ],
    alternates: { canonical: `/chords/${page.slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/chords/${page.slug}`,
      type: "website",
    },
  };
}

// ── Copy generated from voicing data ─────────────────────────────────────────

const GUITAR_LABELS = ["6-та", "5-та", "4-та", "3-тя", "2-га", "1-ша"];
const UKE_LABELS = ["4-та (соль)", "3-тя (до)", "2-га (мі)", "1-ша (ля)"];

/** Human fingering description for one voicing — string by string. */
function fingeringText(def: ChordDef, labels: string[]): string {
  const muted: string[] = [];
  const open: string[] = [];
  const pressed: string[] = [];
  def.strings.forEach((f, i) => {
    const label = labels[i] ?? `${i + 1}-та`;
    if (f < 0) muted.push(label);
    else if (f === 0) open.push(label);
    // Strings sounding through the barre itself are covered by the barre
    // sentence — list only the notes fretted above it.
    else if (!def.barre || f > def.barre) pressed.push(`${label} — ${f}-й лад`);
  });
  const parts: string[] = [];
  if (def.barre) {
    parts.push(`Вказівний палець кладеться повним баре на ${def.barre}-му ладу.`);
  }
  if (pressed.length > 0) parts.push(`Затисніть: ${pressed.join(", ")}.`);
  if (open.length > 0) {
    parts.push(`${open.join(", ")} ${open.length > 1 ? "струни звучать відкритими" : "струна звучить відкритою"}.`);
  }
  if (muted.length > 0) {
    parts.push(`${muted.join(" і ")} ${muted.length > 1 ? "не звучать" : "не звучить"} — не зачіпайте ${muted.length > 1 ? "їх" : "її"} або приглушіть.`);
  }
  return parts.join(" ");
}

const QUALITY_INTRO: Record<string, string> = {
  major: "мажорний тризвук — звучить світло, стійко і впевнено",
  minor: "мінорний тризвук — м'якший і ліричніший за мажорний",
  dom7: "домінантсептакорд — акорд із внутрішнім тяжінням, який «просить» розв'язання і додає гармонії руху",
};

export default async function ChordPage({
  params,
}: {
  params: Promise<{ chord: string }>;
}) {
  const { chord } = await params;
  const page = getChordPage(chord);
  if (!page) notFound();
  const { name, ukr, quality } = page;

  const guitarDefs = (lookupChord(name) ?? []).slice(0, 3);
  const mainDef = guitarDefs[0];
  const noBarreAlt = mainDef?.barre ? lookupNoBarreVoicing(name) : null;
  const ukeDef = lookupChordUke(name)?.[0];
  const pianoDef = lookupChordPiano(name)?.[0];
  const songs = await getSongsSharingChords([name], { excludeSlug: "", limit: 12 });

  // Notes that make up the chord, from the piano intervals (root is first).
  const noteNames = (pianoDef?.notes ?? []).map((s) => NOTES[((s % 12) + 12) % 12]);
  const uniqueNotes = Array.from(new Set(noteNames));
  const notesText = uniqueNotes.length > 0
    ? `${uniqueNotes.join("–")} (${uniqueNotes.map((n) => UKR_NOTE[n] ?? n).join(", ")})`
    : "";

  const sameRoot = CHORD_PAGES.filter((p) => p.slug !== page.slug && p.name.replace(/m$|7$/, "") === name.replace(/m$|7$/, ""));

  const faq = [
    ...(mainDef
      ? [{
          q: `Як затиснути акорд ${name} на гітарі?`,
          a: fingeringText(mainDef, GUITAR_LABELS),
        }]
      : []),
    {
      q: `Чи потрібне баре для акорду ${name}?`,
      a: mainDef?.barre
        ? `Так, у класичній аплікатурі ${name} береться з баре на ${mainDef.barre}-му ладу.` +
          (noBarreAlt
            ? " Є і спрощений варіант без баре — його схема нижче на сторінці."
            : " Якщо баре поки не дається — транспонуйте пісню або поставте капо: на Diez це робиться одним дотиком на сторінці пісні.")
        : `Ні, ${name} грається на відкритих струнах без баре — це акорд, який підходить початківцям.`,
    },
    ...(notesText
      ? [{
          q: `З яких нот складається ${name}?`,
          a: `${name} (${ukr}) складається з нот ${notesText}. На піаніно чи клавішах достатньо натиснути ці ноти одночасно.`,
        }]
      : []),
    ...(songs.length > 0
      ? [{
          q: `У яких піснях зустрічається акорд ${name}?`,
          a: `Наприклад: ${songs.slice(0, 3).map((s) => `«${s.title}» (${s.artist})`).join(", ")}. Повний список пісень з ${name} — на цій сторінці, кожна відкривається з акордами над текстом.`,
        }]
      : []),
  ];

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Diez", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Акорди", item: `${siteUrl}/chords` },
      { "@type": "ListItem", position: 3, name: `Акорд ${name}`, item: `${siteUrl}/chords/${page.slug}` },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <PageShell maxWidth="4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }} />

      <nav aria-label="Хлібні крихти" className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        <Link href="/chords" className="hover:underline">Акорди</Link>
        <span aria-hidden="true"> › </span>
        <span>{name}</span>
      </nav>

      <PageHeader
        title={`Акорд ${name}`}
        subtitle={`${ukr} — аплікатури для гітари, укулеле й піаніно`}
      />

      <div className="learn-prose">
        <p>
          <strong>{name}</strong> — це {ukr}, {QUALITY_INTRO[quality]}.
          {notesText && <> Складається з нот {notesText}.</>}{" "}
          {mainDef?.barre ? (
            <>
              Це баре-акорд: якщо прийом ще не дається, скористайтеся варіантом
              без баре нижче або прочитайте розбір у статті{" "}
              <Link href="/learn/shcho-take-bare">«Що таке баре»</Link>.
            </>
          ) : (
            <>
              Акорд береться без баре, тож підходить для перших тижнів гри —
              інші базові форми зібрані в статті{" "}
              <Link href="/learn/pershi-akordy">«Перші акорди»</Link>.
            </>
          )}
        </p>

        <h2>Як затиснути {name} на гітарі</h2>
        {mainDef ? (
          <>
            <div className="not-prose flex flex-wrap gap-3 my-5">
              {guitarDefs.map((def, i) => (
                <span
                  key={i}
                  className="te-surface inline-flex flex-col items-center"
                  style={{ padding: "8px 10px", borderRadius: "0.9rem" }}
                >
                  <ChordDiagram name={name} def={def} width={96} height={120} />
                  <span className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                    {i === 0 ? "основна" : `варіант ${i + 1}`}
                  </span>
                </span>
              ))}
            </div>
            <p>{fingeringText(mainDef, GUITAR_LABELS)}</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Порада: натисніть на діаграму, щоб почути, як акорд має звучати.
            </p>
          </>
        ) : (
          <p>Схема для цього акорду тимчасово недоступна.</p>
        )}

        {noBarreAlt && (
          <>
            <h2>Варіант без баре</h2>
            <div className="not-prose flex flex-wrap gap-3 my-5">
              <span
                className="te-surface inline-flex flex-col items-center"
                style={{ padding: "8px 10px", borderRadius: "0.9rem" }}
              >
                <ChordDiagram name={name} def={noBarreAlt} width={96} height={120} />
              </span>
            </div>
            <p>
              Спрощена аплікатура для тих, хто ще не опанував баре:{" "}
              {fingeringText(noBarreAlt, GUITAR_LABELS)} Звучання трохи менш
              повне, але для акомпанементу цього достатньо.
            </p>
          </>
        )}

        {ukeDef && (
          <>
            <h2>{name} на укулеле</h2>
            <div className="not-prose flex flex-wrap gap-3 my-5">
              <span
                className="te-surface inline-flex flex-col items-center"
                style={{ padding: "8px 10px", borderRadius: "0.9rem" }}
              >
                <ChordDiagram name={name} def={ukeDef} width={96} height={120} openFreqs={UKE_OPEN_FREQS} />
              </span>
            </div>
            <p>Стрій GCEA (стандартний для сопрано/концертного укулеле): {fingeringText(ukeDef, UKE_LABELS)}</p>
          </>
        )}

        {pianoDef && (
          <>
            <h2>{name} на піаніно</h2>
            <div className="not-prose my-5">
              <PianoDiagram name={name} def={pianoDef} width={200} height={117} />
            </div>
            <p>
              На клавішах {name} — це одночасне натискання нот {notesText}. Ліва
              рука зазвичай грає басову ноту {uniqueNotes[0]}
              {UKR_NOTE[uniqueNotes[0] ?? ""] ? ` (${UKR_NOTE[uniqueNotes[0]]})` : ""}.
            </p>
          </>
        )}

        {songs.length > 0 && (
          <>
            <h2>Пісні з акордом {name}</h2>
            <p>
              Найкращий спосіб закріпити акорд — одразу зіграти його в пісні.
              У цих піснях з каталогу Diez {name} звучить у супроводі:
            </p>
            <ul>
              {songs.map((s) => (
                <li key={s.slug}>
                  <Link href={`/songs/${s.slug}`}>{s.title}</Link>
                  <span style={{ color: "var(--text-muted)" }}> — {s.artist}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {faq.length > 0 && (
        <section className="mt-12">
          <h2 className="font-bold mb-5" style={{ fontSize: "1.3rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
            Часті запитання
          </h2>
          <dl className="space-y-5">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="font-bold mb-1.5" style={{ fontSize: "0.95rem", color: "var(--text)" }}>{f.q}</dt>
                <dd style={{ fontSize: "0.9rem", lineHeight: 1.65, color: "var(--text-mid)" }}>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {sameRoot.length > 0 && (
        <aside className="mt-10 text-sm" style={{ color: "var(--text-muted)" }}>
          Той самий тон:{" "}
          {sameRoot.map((p, i) => (
            <span key={p.slug}>
              {i > 0 && " · "}
              <Link href={`/chords/${p.slug}`} className="hover:underline" style={{ color: "var(--orange-text)" }}>
                {p.name} ({p.ukr})
              </Link>
            </span>
          ))}
        </aside>
      )}

      <aside className="mt-10 pt-6" style={{ borderTop: "1px solid var(--border, rgba(0,0,0,0.08))" }}>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
          Усі акорди довідника
        </h2>
        <div className="flex flex-wrap gap-2">
          {CHORD_PAGES.map((p) =>
            p.slug === page.slug ? (
              <span key={p.slug} aria-current="page" className="te-surface px-2.5 py-1 rounded-lg text-xs font-bold" style={{ color: "var(--text)" }}>
                {p.name}
              </span>
            ) : (
              <Link
                key={p.slug}
                href={`/chords/${p.slug}`}
                className="te-surface px-2.5 py-1 rounded-lg text-xs hover:underline"
                style={{ color: "var(--text-mid)" }}
              >
                {p.name}
              </Link>
            ),
          )}
        </div>
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          Не знаєте, що за акорд у вас під пальцями? Скористайтеся{" "}
          <Link href="/chords" className="hover:underline" style={{ color: "var(--orange-text)" }}>
            визначником акордів
          </Link>
          .
        </p>
      </aside>
    </PageShell>
  );
}
