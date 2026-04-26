// ── Themed song collections ─────────────────────────────────────────────────
//
// Single source of truth for the homepage "Підбірки за тематикою" cards and
// for the /songs?topic=<slug> filter. Each topic resolves to a concrete query:
//
//   • { kind: "slugs", slugs }     — explicit curated list of song slugs
//   • { kind: "artists", artists } — every published song by any of these
//                                    canonical artist names (alias-resolved
//                                    by import; if multiple variants exist,
//                                    list each name explicitly)
//   • { kind: "no-barre" }         — runtime filter: no barre/sharp chords
//                                    in the song's chord array
//
// When growing a curated slug list, prefer slugs that actually exist in the
// catalogue (verify against the songs table). Stale slugs are filtered out
// silently by the in() query — they just don't show up.

export type TopicMatch =
  | { kind: "slugs"; slugs: string[] }
  | { kind: "artists"; artists: string[] }
  | { kind: "no-barre" };

export interface Topic {
  /** URL slug used in /songs?topic=<slug> */
  slug: string;
  emoji: string;
  /** Card title on the homepage */
  title: string;
  /** Card subtitle */
  subtitle: string;
  /** H1 on the topic landing page (and metadata title prefix) */
  pageHeading: string;
  /** Short SEO description */
  description: string;
  match: TopicMatch;
}

// Chord names treated as "barre / hard for beginners" — used to gate the
// `no-barre` topic. F and B are barre on standard tuning; sharps/flats almost
// always require a barre or partial-barre shape on a beginner's instrument.
const BARRE_CHORDS = new Set([
  "F", "B", "Bb", "F#", "C#", "G#", "D#", "Eb", "Ab", "Db",
  "Bm", "F#m", "C#m", "G#m", "D#m", "A#m", "Ebm", "Bbm",
]);

export function isBarreChord(c: string): boolean {
  // Match the root chord even when it has a quality suffix (m7, sus4, etc.).
  // Strip everything after the first non-letter/sharp/flat.
  const root = c.replace(/^([A-G][#b]?m?).*$/, "$1");
  return BARRE_CHORDS.has(root) || BARRE_CHORDS.has(c);
}

export function isNoBarreSong(chords: string[] | null | undefined): boolean {
  if (!chords || chords.length === 0) return false;
  return !chords.some(isBarreChord);
}

export const TOPICS: Topic[] = [
  {
    slug: "beginner",
    emoji: "🎸",
    title: "Без баре",
    subtitle: "Для початківців",
    pageHeading: "Пісні без баре акордів",
    description: "Прості пісні для гітаристів-початківців — без баре та складних акордів.",
    match: { kind: "no-barre" },
  },
  {
    slug: "campfire",
    emoji: "🔥",
    title: "Біля вогнища",
    subtitle: "Класика для посиденьок",
    pageHeading: "Пісні біля вогнища",
    description: "Українська класика для співу в компанії — народні, ОЕ, Скрябін, Бумбокс.",
    match: {
      kind: "slugs",
      slugs: [
        "chervona-ruta",
        "nese-halya-vodu",
        "nich-yaka-misyachna-narodna",
        "oy-u-luzi-chervona-kalyna-striletska-cover-khlyvnyuk",
        "tsvite-teren-narodna",
        "oy-chyy-to-kin-stoyit-narodna",
        "horila-sosna",
        "dva-kolory",
        "obiymy",
        "choven-odyn-v-kanoe",
        "bez-boyu",
        "ya-ne-zdamsya-bez-boyu",
        "fayne-misto-ternopil",
        "stari-fotohrafiyi",
        "spy-sobi-sama",
        "mama-odyn-v-kanoe",
        "kvity-v-volossi",
        "ta4to",
        "kholodno",
        "trymay",
      ],
    },
  },
  {
    slug: "ukrainian",
    emoji: "🇺🇦",
    title: "Українська класика",
    subtitle: "Пісні, які знає кожен",
    pageHeading: "Українська класика",
    description: "Найвідоміші виконавці української сцени: Океан Ельзи, Скрябін, Бумбокс, Брати Гадюкіни та інші.",
    match: {
      kind: "artists",
      artists: [
        "Океан Ельзи",
        "Скрябін",
        "Бумбокс",
        "Один в каное",
        "Брати Гадюкіни",
        "Плач Єремії",
        "Володимир Івасюк",
        "Піккардійська Терція",
        "ТНМК",
        "Воплі Відоплясова",
      ],
    },
  },
  {
    slug: "folk",
    emoji: "🪕",
    title: "Народні",
    subtitle: "Українські народні",
    pageHeading: "Українські народні пісні",
    description: "Колекція українських народних пісень — від лемківських до гуцульських.",
    match: { kind: "artists", artists: ["Народна", "Українські народні"] },
  },
  {
    slug: "romantic",
    emoji: "💕",
    title: "Романтичні",
    subtitle: "Про кохання",
    pageHeading: "Романтичні пісні",
    description: "Пісні про кохання — від класики Океану Ельзи до сучасних хітів.",
    match: {
      kind: "slugs",
      slugs: [
        "obiymy",
        "moye-sertse",
        "kokhannya",
        "istoriya-kokhannya-ystoryya-lyubvy",
        "bez-kokhannya",
        "moya-lyubov",
        "moye-kokhannya",
        "trymay-khrystyna-soloviy",
        "kokhana",
        "kokhana-1776692398486",
        "kokhannya-artem-pyvovarov",
        "sertse-artem-pyvovarov",
        "sertse-yaktak",
        "shche-odna-pisnya-pro-lyubov",
        "aryfmetyka-kokhannya",
        "upiymay-moye-sertse-feat-kalush",
        "planeta-lyubov",
        "stilnykove-kokhannya",
        "polamana-lyubov",
      ],
    },
  },
  {
    slug: "summer",
    emoji: "🌻",
    title: "Літні вайби",
    subtitle: "Сонце, море, тепло",
    pageHeading: "Літні пісні",
    description: "Сонячні треки про море, літо й добрий настрій.",
    match: {
      kind: "slugs",
      slugs: [
        "to-moye-more",
        "more",
        "more-1776692599579",
        "sontse-zamist-shapky",
        "sontse",
        "sontse-sidaye",
        "litokamon",
        "lito-1776692864602",
        "ukrayinske-sontse",
        "taka-yak-lito",
        "tse-lito",
        "sontse-zhara",
        "chornomorets",
        "pikkardiyska-tertsiya-i-oksana-mukha-nad-morem",
      ],
    },
  },
  {
    slug: "modern",
    emoji: "🎤",
    title: "Сучасні хіти",
    subtitle: "Що звучить зараз",
    pageHeading: "Сучасні українські хіти",
    description: "Артисти, які формують звучання української сцени просто зараз.",
    match: {
      kind: "artists",
      artists: [
        "Артем Пивоваров",
        "Jerry Heil",
        "KAZKA",
        "Христина Соловій",
        "KOLA",
        "YAKTAK",
        "alyona alyona",
        "Klavdia Petrivna",
        "Wellboy",
        "Skofka",
        "Kalush",
        "KHAYAT",
        "DOROFEEVA",
        "MamaRika",
        "TAYANNA",
        "Latexfauna",
        "SadSvit",
      ],
    },
  },
  {
    slug: "patriotic",
    emoji: "🪖",
    title: "Патріотичні",
    subtitle: "Україна понад усе",
    pageHeading: "Патріотичні та військові пісні",
    description: "Пісні, які підтримують і нагадують, за що ми боремось.",
    match: {
      kind: "slugs",
      slugs: [
        "oy-u-luzi-chervona-kalyna-striletska-cover-khlyvnyuk",
        "ya-ne-zdamsya-bez-boyu",
        "ne-tvoya-viyna",
        "sosny",
        "vse-bude-dobre",
        "peremoha",
        "ukrayina",
        "ukrayintsi",
        "lyuby-ty-ukrayinu",
        "i-dzhaveliny-i-bayraktary-za-ukrayinu-b-yut-rusnyu",
        "ukrayina-rok-n-rol",
        "yak-vidhrymyt-viyna",
        "ukrayinske-sontse",
        "molytva-za-ukrayinu",
        "yikhav-strilets-na-viynonku",
        "tam-za-nebokrayem-striletska-pisnya",
        "zavtra-vrantsi-v-ostanniy-biy",
        "pam-yati-heroyiv-krut",
        "strilyay",
      ],
    },
  },
];

export function getTopicBySlug(slug: string | undefined | null): Topic | undefined {
  if (!slug) return undefined;
  return TOPICS.find((t) => t.slug === slug);
}
