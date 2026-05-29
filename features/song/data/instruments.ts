// ── Instrument landing hubs ─────────────────────────────────────────────────
//
// Single source of truth for the per-instrument landing pages at
// /songs/instrument/<slug>. Diez renders chord diagrams for guitar, ukulele
// and piano (see InstrumentSwitch + ChordDiagram) — every song in the
// catalogue is playable on all three, the toggle just changes which fingering
// the chords are drawn for. These hubs surface that to search engines: each is
// a real landing page targeting "акорди для укулеле" / "акорди для піаніно"
// long-tails, over the same catalogue but with instrument-specific copy.
//
// Guitar deliberately has NO hub here — /songs IS the guitar catalogue (its
// title is literally "Каталог пісень — Акорди для гітари"). The cross-link row
// on each hub points guitar back to /songs.

export interface InstrumentHub {
  /** URL slug used in /songs/instrument/<slug> */
  slug: string;
  emoji: string;
  /** Short title — cross-link cards, footer, listing H2 */
  title: string;
  /** Card subtitle */
  subtitle: string;
  /** H1 on the hub landing page (and metadata title prefix) */
  pageHeading: string;
  /** Meta description, tuned to ≤155 chars (Google snippet cap) */
  description: string;
  /** Long-form intro paragraph (~120–180 words). Without a real body Google
      treats a list-only page as thin content and de-prioritises it. */
  seoIntro: string;
  /** Per-hub keyword long-tails (low weight in Google, used by Bing/Yandex). */
  keywords: string[];
}

export const INSTRUMENTS: InstrumentHub[] = [
  {
    slug: "ukulele",
    emoji: "🪕",
    title: "Акорди для укулеле",
    subtitle: "Просто і весело",
    pageHeading: "Акорди для укулеле",
    description:
      "Акорди для укулеле до тисяч пісень. Будь-яку пісню з Diez можна грати на укулеле — аплікатури для строю GCEA, транспонування, текст під акордами.",
    seoIntro:
      "Укулеле — один із найпростіших інструментів для старту: чотири нейлонові струни, маленький гриф і акорди, які беруться двома-трьома пальцями. Чимало акордів на укулеле навіть простіші, ніж на гітарі — наприклад, до-мажор затискається однією струною. На Diez будь-яку пісню з каталогу можна грати на укулеле: натисніть перемикач інструмента над акордами, і кожен акорд покаже аплікатуру саме для укулеле (стандартний стрій GCEA), а не для гітари. Текст, послідовність акордів і тональність лишаються ті самі — змінюються лише схеми затиску. Якщо акорд зависокий або занизький для вашого голосу, транспонуйте всю пісню на пів-тону одним кліком. У каталозі — українська класика, сучасні хіти, народні та дитячі пісні, усе, що добре звучить під укулеле на пляжі, у поході чи вдома. Оберіть пісню зі списку нижче й почніть грати просто зараз.",
    keywords: [
      "акорди для укулеле",
      "укулеле акорди",
      "пісні на укулеле",
      "акорди укулеле українською",
      "ukulele акорди",
    ],
  },
  {
    slug: "piano",
    emoji: "🎹",
    title: "Акорди для піаніно",
    subtitle: "Піаніно та клавіші",
    pageHeading: "Акорди для піаніно та клавіш",
    description:
      "Акорди для піаніно та клавіш до тисяч пісень. Будь-який трек із Diez можна грати на клавішах — кожен акорд із підсвіченими нотами на клавіатурі та транспонуванням.",
    seoIntro:
      "Клавішні — піаніно, синтезатор, цифрове фортепіано — дають найнаочніше уявлення про гармонію: акорд видно як кілька клавіш, натиснутих разом. На Diez будь-яку пісню з каталогу можна грати на клавішах: натисніть перемикач інструмента над акордами, і замість гітарних схем кожен акорд покаже клавіатуру з підсвіченими нотами, які до нього входять. Це зручно і для початківців, які тільки вчать акорди, і для тих, хто підбирає партію лівої руки чи акомпанемент. Текст пісні, послідовність акордів і тональність лишаються незмінними — Diez лише показує аплікатуру під обраний інструмент. Тональність можна транспонувати на пів-тону вгору або вниз, щоб зручніше було співати або грати в потрібній позиції. У каталозі — українська й зарубіжна класика, сучасні хіти, романси та народні пісні. Оберіть пісню зі списку нижче, перемкніть інструмент на «Клавіші» — і грайте.",
    keywords: [
      "акорди для піаніно",
      "акорди для фортепіано",
      "акорди на клавішах",
      "піаніно акорди українською",
      "фортепіано акорди",
    ],
  },
];

export function getInstrumentBySlug(
  slug: string | undefined | null,
): InstrumentHub | undefined {
  if (!slug) return undefined;
  return INSTRUMENTS.find((i) => i.slug === slug);
}
