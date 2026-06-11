import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { GuitarTuner } from "@/features/tuner/components/GuitarTuner";
import { jsonLdScript } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Тюнер — Diez",
  description: "Хроматичний тюнер для гітари. Увімкніть мікрофон і настройте гітару за стандартним строєм EADGBE.",
  alternates: { canonical: "/tuner" },
  openGraph: {
    title: "Тюнер — Diez",
    description: "Настройте гітару через мікрофон за стандартним строєм EADGBE.",
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

export default function TunerPage() {
  return (
    <PageShell maxWidth="4xl">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdScript(howToLd) }}
      />
      <PageHeader
        title="Тюнер"
        subtitle="Стандартний стрій EADGBE — увімкніть мікрофон і грайте"
      />
      <GuitarTuner />
    </PageShell>
  );
}
