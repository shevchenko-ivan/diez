// Language gate for user-submitted songs.
//
// Two signals:
//  1. Script-exclusive letters — Russian has ы/ъ/э/ё which Ukrainian never uses;
//     Ukrainian has ґ/є/і/ї/ʼ which Russian never uses.
//  2. Russian function words with no Ukrainian-equivalent spelling (что, сейчас,
//     тебя, …) — catches Russian text that happens to avoid ы/ъ/э/ё (e.g.
//     "Я тебя люблю, что было — прошло"). These are picked to never appear in
//     normal Ukrainian, so they don't false-positive on Ukrainian lyrics.
//
// Counting both and comparing auto-rejects obvious Russian and auto-approves
// confident Ukrainian, while routing ambiguous/mixed text to manual review.

export type Lang = "uk" | "ru" | "mixed" | "other";

const RU_ONLY = /[ыъэё]/gi;       // exclusive to Russian
const UA_ONLY = /[ґєіїʼ']/gi;     // exclusive to Ukrainian (incl. apostrophe)
const CYRILLIC = /[Ѐ-ӿ]/g;

// Russian-only function/common words (no Ukrainian counterpart with this exact
// spelling). Bounded by Unicode non-letters via lookarounds — JS `\b` is
// ASCII-only and never fires between Cyrillic letters, so it can't be used here.
// Deliberately excludes words spelled identically in Ukrainian (просто, хочу,
// знаю, уже, люблю, …) to avoid false positives on Ukrainian lyrics.
const RU_WORDS = new RegExp(
  "(?<!\\p{L})(" + [
    "что", "чтобы", "это", "этот", "эта", "эти", "этого", "этой",
    "когда", "сейчас", "очень", "если", "тебя", "меня", "себя",
    "ничего", "никогда", "всегда", "конечно", "вообще", "потому",
    "был", "была", "было", "были", "будет", "только", "здесь", "сегодня",
    "сердце", "любовь", "счастье", "своё", "своих", "нашей", "вашей",
    "теперь", "снова", "опять", "может", "делать", "нравится", "хорошо",
  ].join("|") + ")(?!\\p{L})",
  "giu",
);

function counts(text: string) {
  return {
    ru: (text.match(RU_ONLY) || []).length,
    ua: (text.match(UA_ONLY) || []).length,
    cyr: (text.match(CYRILLIC) || []).length,
    ruWords: (text.match(RU_WORDS) || []).length,
  };
}

export function detectLang(text: string): Lang {
  const { ru, ua, cyr, ruWords } = counts(text);
  if (cyr < 20) return "other"; // too little Cyrillic to judge (latin / instrumental / very short)
  // Strong Russian markers (exclusive letters or function words) with no
  // Ukrainian-exclusive letters → Russian, even without ы/ъ/э/ё.
  if ((ru > 0 || ruWords > 0) && ua === 0) return "ru";
  if (ua > 0 && ru === 0 && ruWords === 0) return "uk";
  if (ua > ru * 2 && ruWords === 0) return "uk";
  if (ru + ruWords > ua * 2) return "ru";
  return "mixed";
}

export type RussianLevel = "none" | "soft" | "hard";

/**
 * Graded Russian check for live UI feedback and the submit gate (no cyr≥20
 * minimum, so pasted/typed Russian flags immediately). Chord brackets are
 * stripped first.
 *
 *   none — no Russian markers.
 *   soft — a few Russian words/phrases (≤3) sprinkled into clearly-Ukrainian
 *          text (Ukrainian-exclusive letters dominate ≥2×). Just a nudge — the
 *          song can still be submitted; it goes to manual review.
 *   hard — substantially Russian (4+ markers, or Russian not in the minority).
 *          Blocked: won't be published.
 */
export function russianLevel(textWithChords: string): RussianLevel {
  const text = textWithChords.replace(/\[[^\]]*\]/g, " ");
  const { ru, ua, ruWords } = counts(text);
  const sig = ru + ruWords;
  if (sig === 0) return "none";
  // A couple of Russian words inside text that is otherwise clearly Ukrainian.
  if (sig <= 3 && ua >= sig * 2) return "soft";
  return "hard";
}

/**
 * Classify a submission's lyrics into a moderation outcome.
 *
 *   reject  — clearly Russian: блокуємо на сабміті.
 *   publish — confidently Ukrainian: автопаблиш.
 *   review  — mixed / mostly-latin / too short: у чергу pending.
 *
 * Chord brackets ([Am], [C/G]) are stripped first so chord letters don't skew
 * the Cyrillic/letter counts.
 */
export function classifySubmission(lyricsWithChords: string): "reject" | "publish" | "review" {
  const text = lyricsWithChords.replace(/\[[^\]]*\]/g, " ");
  const level = russianLevel(text);
  if (level === "hard") return "reject";       // substantially Russian → block
  if (level === "soft") return "review";        // a few words → manual review, not blocked
  const lang = detectLang(text);
  if (lang === "ru") return "reject";
  if (lang === "uk") return "publish";
  return "review"; // mixed | other
}
