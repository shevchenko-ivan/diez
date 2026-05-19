import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { ChordIdentifier } from "@/features/song/components/ChordIdentifier";
import { jsonLdScript } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Визначити акорд — Diez",
  description:
    "Інтерактивний інструмент для визначення гітарних акордів. Натисніть на гриф, щоб позначити позиції пальців, і дізнайтеся назву акорду.",
  alternates: { canonical: "/chords" },
  openGraph: {
    title: "Визначити акорд — Diez",
    description:
      "Натисніть на гриф, щоб позначити позиції пальців, і дізнайтеся назву акорду.",
    type: "website",
    url: "/chords",
  },
};

// HowTo schema — for queries like «як визначити акорд», «як дізнатися
// назву акорду». Google may render the steps inline in SERP.
const howToLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Як визначити невідомий акорд за позиціями пальців на грифі",
  description:
    "Безкоштовний онлайн-інструмент для розпізнавання акорду за розташуванням пальців. Підходить для гітаристів, що знайшли акорд у нотах чи табах, але не знають його назви.",
  totalTime: "PT1M",
  tool: [
    { "@type": "HowToTool", name: "Гітара (опційно — лише для звіряння на слух)" },
  ],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Натиснути на гриф",
      text: "На інтерактивному грифі натисніть точки, що відповідають позиціям ваших пальців. Можна позначити декілька струн і ладів.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Позначити приглушені струни",
      text: "Якщо якась струна не звучить (приглушена або не використовується), натисніть кнопку «×» над відповідною струною.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Подивитися назву",
      text: "Над грифом з'явиться назва акорду в нотації (наприклад, Am, F♯m7, C/G). Якщо існує кілька варіантів — інструмент покаже всі сумісні назви.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Знайти пісні з цим акордом",
      text: "Натисніть на назву акорду, щоб перейти до каталогу пісень, у яких використовується цей акорд — це допомагає вивчати нові пісні через знайомі позиції.",
    },
  ],
};

export default function ChordsPage() {
  return (
    <PageShell maxWidth="5xl">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(howToLd) }}
      />
      <PageHeader
        title="Визначити акорд"
        subtitle="Натисніть на гриф, щоб позначити позиції пальців"
      />
      <ChordIdentifier />
    </PageShell>
  );
}
