import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { GuitarTuner } from "@/features/tuner/components/GuitarTuner";
import { jsonLdScript } from "@/lib/utils";

// Title targets the query as typed. «тюнер для гітари онлайн» has no strong
// Ukrainian-language result at all (SERP audit 31.08.2026: the top is ru/en
// tools) — but the old title «Тюнер — Diez» contained neither «гітара» nor
// «онлайн», so the page couldn't rank for the very query it answers.
export const metadata: Metadata = {
  title: "Тюнер для гітари онлайн — налаштування через мікрофон | Diez",
  description:
    "Безкоштовний хроматичний тюнер для гітари онлайн українською. Увімкніть мікрофон — і настройте гітару за строєм EADGBE прямо в браузері, без застосунків.",
  keywords: [
    "тюнер для гітари онлайн",
    "тюнер для гітари",
    "налаштувати гітару онлайн",
    "настроїти гітару через мікрофон",
    "тюнер онлайн українською",
    "гітарний тюнер",
  ],
  alternates: { canonical: "/tuner" },
  openGraph: {
    title: "Тюнер для гітари онлайн — налаштування через мікрофон | Diez",
    description: "Настройте гітару через мікрофон за стандартним строєм EADGBE — безкоштовно, у браузері.",
    type: "website",
    url: "/tuner",
  },
};

// HowTo schema — Google may render the step list directly in SERP for
// queries like «як налаштувати гітару». Pure structured data, invisible
// on the page itself.
const howToLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Як настроїти (налаштувати) гітару онлайн через мікрофон",
  description:
    "Настройте гітару за стандартним строєм EADGBE прямо в браузері — без додатків і без обладнання, лише через мікрофон ноутбука чи телефона.",
  totalTime: "PT3M",
  tool: [
    { "@type": "HowToTool", name: "Гітара" },
    { "@type": "HowToTool", name: "Пристрій з мікрофоном (ноутбук, телефон)" },
  ],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Відкрити тюнер",
      text: "Перейдіть на сторінку тюнера на Diez і натисніть кнопку «Увімкнути мікрофон». Дозвольте сайту доступ до мікрофона у спливаючому вікні браузера.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Зіграти першу струну",
      text: "Тримайте гітару біля мікрофона і зіграйте першу (тонку, нижню) струну — вона має бути E (мі першої октави).",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Підкрутити кілки",
      text: "Тюнер покаже поточну ноту і відхилення від еталону (центи). Підкручуйте кілок, поки стрілка не стане по центру і нота не покаже «E».",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Повторити для всіх 6 струн",
      text: "Послідовно для кожної струни: 6 (товста) → E, 5 → A, 4 → D, 3 → G, 2 → B, 1 (тонка) → E. Стандартний стрій EADGBE — найпоширеніший для гітари.",
    },
  ],
};

// FAQPage schema — the «як настроїти гітару …» question cluster (тюнером /
// без тюнера / на слух / через телефон) is the long tail this page and the
// /learn article share. Same invisible-JSON-LD pattern as the song pages.
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Який стрій показує тюнер?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Тюнер хроматичний — він розпізнає будь-яку ноту, тож підходить і для стандартного строю гітари EADGBE (мі-ля-ре-соль-сі-мі), і для знижених строїв. Орієнтуйтеся на назву ноти та відхилення в центах.",
      },
    },
    {
      "@type": "Question",
      name: "Чи потрібно щось встановлювати або платити?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ні. Тюнер працює безкоштовно прямо в браузері — на телефоні чи ноутбуці. Потрібен лише дозвіл на доступ до мікрофона.",
      },
    },
    {
      "@type": "Question",
      name: "Як настроїти гітару без тюнера?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Гітару можна настроїти на слух за п'ятим ладом: затиснута на 5-му ладу струна має звучати як наступна відкрита (виняток — третя струна, її тиснуть на 4-му ладу). Покроково цей і інші способи розібрані в статті «Як настроїти гітару» в розділі Навчання на Diez.",
      },
    },
    {
      "@type": "Question",
      name: "Чому гітара швидко розстроюється?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Найчастіші причини — нові струни, які ще тягнуться, перепади температури й вологості та слабкі кілки. Нові струни варто кілька разів акуратно потягнути і настроїти повторно; після цього стрій тримається значно довше.",
      },
    },
  ],
};

export default function TunerPage() {
  return (
    <PageShell maxWidth="4xl">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(howToLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }}
      />
      <PageHeader
        title="Тюнер для гітари онлайн"
        subtitle="Стандартний стрій EADGBE — увімкніть мікрофон і грайте"
      />
      <GuitarTuner />
    </PageShell>
  );
}
