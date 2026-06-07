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
  /** Long-form intro paragraph rendered on the topic landing page.
      Each topic page has ~50 words of UI chrome and a song list — without
      a real body Google sees these as "thin content" and de-prioritises.
      Aim for ~120–180 words, natural Ukrainian, mentioning the kind of
      songs and what the visitor can actually do here. */
  seoIntro: string;
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
    seoIntro:
      "Якщо ви тільки починаєте грати на гітарі, баре акорди — головний бар'єр між вами й улюбленими піснями. F, B, F♯m і всі похідні з ними потребують сили в пальцях і чистої постановки руки, до якої треба звикнути. У цій підбірці зібрані пісні, які грають лише на відкритих акордах — Am, C, D, Em, G, A — тих, з яких починає кожен гітарист. Ви зможете повноцінно зіграти й заспівати ці треки навіть на першому тижні навчання. Це українська й зарубіжна класика, сучасні хіти й народні пісні, де композитор сам обійшовся без баре. Обирайте будь-яку пісню зі списку нижче — у кожному пісеннику акорди розставлені прямо над відповідним текстом, є зручне транспонування на пів-тону вгору або вниз, і кнопка «зіграти» з оригіналом для звіряння темпу й тональності.",
    match: { kind: "no-barre" },
  },
  {
    slug: "campfire",
    emoji: "🔥",
    title: "Біля вогнища",
    subtitle: "Класика для посиденьок",
    pageHeading: "Пісні біля вогнища",
    description: "Українська класика для співу в компанії — народні, ОЕ, Скрябін, Бумбокс.",
    seoIntro:
      "Класика українських посиденьок: народні пісні, хіти Океану Ельзи, Скрябіна, Бумбоксу — все, що береться чотирма акордами і знайоме кожному. Акорди адаптовані під зручну тональність для співу, з можливістю транспонувати і змінювати капо.",
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
    seoIntro:
      "Українська рок- і поп-класика — це фундамент репертуару кожного гітариста, який грає вдома, у дворі або на сцені. Океан Ельзи, Скрябін, Бумбокс, Один в каное, Брати Гадюкіни, Плач Єремії, Володимир Івасюк, ТНМК, Воплі Відоплясова — у цій підбірці зібрана творчість артистів, що сформували звучання української сцени. Більшість пісень тримаються на 4–6 акордах, які вже стали стандартом для покоління гітаристів: ходи Am–F–C–G, Em–C–G–D, прості бої й бренькання. Тут є і повільні балади для тихого вечора, і драйвові треки, з яких добре розігрітись на репетиції. Кожна сторінка містить повний текст із розставленими акордами, ключ оригіналу й можливість швидко перенести пісню в зручну тональність — корисно, коли гітарист грає, а співає інша людина.",
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
    seoIntro:
      "Українська народна пісня — це жанр, у якому кожна композиція переживала десятки поколінь і дійшла до нас із власною мелодикою, фразеологією й гармонією. У цій підбірці ми зібрали народні пісні з різних регіонів: лемківські, бойківські, гуцульські, поліські й степові. Серед них — застільні, обрядові, козацькі, лірико-побутові, веснянки й колядки. Більшість з них тримаються на простих гармонічних послідовностях, добре звучать як на гітарі, так і на бандурі, цимбалах, фортепіано — гармонізація легко переноситься між інструментами. Народна пісня — це також безкінечний матеріал для авторських переспівів: треки на основі народних мотивів регулярно з'являються у програмах сучасних виконавців, від «Червоної калини» в кавері Хлівнюка до інтерпретацій ДахаБраха. Обирайте пісню зі списку — кожна йде з акордами над текстом і можливістю транспонувати тональність.",
    match: { kind: "artists", artists: ["Народна", "Українські народні"] },
  },
  {
    slug: "romantic",
    emoji: "💕",
    title: "Романтичні",
    subtitle: "Про кохання",
    pageHeading: "Романтичні пісні",
    description: "Пісні про кохання — від класики Океану Ельзи до сучасних хітів.",
    seoIntro:
      "Романтичні пісні — універсальний інструмент: серенада під балконом, посвята на дні народження, виступ на весіллі, перший танець або просто вечір удвох із гітарою. У підбірці зібрані треки про кохання різних епох: «Обійми» Океану Ельзи й «Кохана» Скрябіна — для тих, хто любить класику; «Тримай» Христини Соловій, «Серце» YAKTAK й Артема Пивоварова, «Стільникове кохання» — для шанувальників сучасного звучання. Більшість пісень тримаються на повільних, ліричних гармоніях у мажорі або теплому мінорі. Якщо тональність оригіналу не лягає на ваш голос — є зручне транспонування на пів-тону вгору або вниз без перенабору акордів. Для пісень із плеєром можна одночасно дивитися на акорди й чути оригінал — це найкращий спосіб вивчити нову річ за один вечір.",
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
    seoIntro:
      "Літо — найкращий сезон для гри на гітарі: пляж, тераса, посиденьки до ночі. У цій підбірці зібрані пісні, в яких звучить літо, сонце, море й безтурботний настрій. Тут є українська класика на кшталт «Сонця» Скрябіна, «Моє море» Кузьми, «Чорноморець» Океану Ельзи, а також сучасні літні хіти «Літо» Latexfauna, «Літо» Wellboy, треки YAKTAK і Артема Пивоварова. Більшість пісень зіграні на простих акустичних патернах, які звучать однаково добре і на пляжі, і на терасі — гітара тут грає роль камертону для голосу й ритму, а не сольного інструменту. Якщо ви плануєте кемпінг або пікнік — додайте ці пісні в плейлист, і ваша компанія матиме що поспівати під вечір. Акорди транспонуються одним кліком — підбирайте тональність під свій голос.",
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
    seoIntro:
      "Українська музична сцена зараз переживає один із найактивніших періодів за всю свою історію. Артем Пивоваров, Jerry Heil, KAZKA, Христина Соловій, KOLA, YAKTAK, alyona alyona, Klavdia Petrivna, Wellboy, Skofka, Kalush, KHAYAT, DOROFEEVA, TAYANNA, Latexfauna, SadSvit — у цій підбірці зібрана творчість артистів, які формують звучання сьогоднішньої української поп- і рок-сцени. Серед них — переможці нацвідборів «Євробачення», виконавці-мільйонники Spotify і автори треків, що звучать у кожному кафе чи маршрутці. Гармонічно більшість сучасних хітів простіша за класичний рок: 4 акорди, повторювана структура, ритм, який легко тримати. Це робить такі треки ідеальними для вивчення — за один вечір реально опанувати свіжу пісню й здивувати друзів. Кожна пісня тут із повним текстом і акордами, із транспонуванням тональності й можливістю звіритися з оригіналом через вбудований плеєр.",
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
    seoIntro:
      "Патріотична й військова пісня — це окремий шар української культури, який роками тримав націю в часи випробувань. Тут зібрані стрілецькі пісні часів УНР («Ой у лузі червона калина», «Їхав стрілець на війноньку», «Там за небокраєм»), пісні часів другої світової й повоєнних повстанських загонів, а також сучасні треки, написані вже після 2014 року й, особливо, після повномасштабного вторгнення 2022-го. «Я не здамся без бою» Океану Ельзи, «Не твоя війна» Скрябіна, «Сосни», «Все буде добре», «Україна», «Молитва за Україну», «І джавеліни, і байрактари», «Як відгримить війна» — пісні, які звучать на концертах, благодійних зборах, прощаннях із загиблими й святкуваннях перемог. Акорди до більшості — прості, тримаються на 3–5 базових позиціях. Грати їх — простий спосіб бути ближче до своєї країни в будь-якому куточку світу.",
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
