// Column-preserving parser for lyrics + chords.
//
// Output preserves the exact column positions the user typed, so the renderer
// can display chords directly above the character where they were placed,
// instead of snapping them to word boundaries.
//
// Supports:
//   • [Am]text inline notation  — chord's col = its index in the stripped lyrics
//   • UG-style chord-line over lyric-line — chord cols come from the raw chord line
//   • bare chord-only lines (Am Dm F) — rendered as a chord line, no lyrics
//   • ASCII tab blocks (e|--, B|--, ...)
//
// Section headers: "Куплет 1:" or "|Приспів|". Empty lines do NOT split sections.

import type { ChordLine, SongSection } from "../types";

// Whitelist of known chord qualities — kept in sync with the voicing database
// (features/song/data/chord-templates.ts). Sorted longest-first so patterns
// like "maj7#11" match before "maj7" under regex alternation semantics.
// Using a whitelist instead of a permissive `[a-z0-9#b]*` suffix avoids false
// positives on English words that happen to start with A–H (e.g. "Add", "Beg",
// "Face") appearing inside lyrics.
const CHORD_QUALITIES = [
  "maj7#11", "13sus4", "mMaj7", "7sus4", "9sus4",
  "maj13", "maj9", "maj7", "m7b5", "add9", "add11",
  "aug7", "dim7", "dim9", "sus2", "sus4",
  "7b5", "7#5", "7b9", "7#9", "7#11",
  "m6", "m7", "m9", "m11",
  "13", "11",
  "m", "maj", "min", "dim", "aug", "sus", "add",
  "5", "6", "7", "9",
].map(q => q.replace(/[#+]/g, "\\$&")).join("|");
// H is the Ukrainian/German B — accept it alongside A-G so that chords like
// "H", "Hm" written in Cyrillic-style songbooks resolve to the same voicing.
const CHORD_TOKEN_RE = new RegExp(
  `^[A-H][b#]?(${CHORD_QUALITIES})?(\\/[A-H][b#]?)?$`,
);
// `:` or `.` as terminator — songbooks write both "Приспів:" and "Приспів.".
// The isSectionLabel whitelist still prevents lyric lines that happen to end
// with these punctuation marks from being promoted to headers.
const HEADER_COLON_RE = /^([^[\]]+)[:.]\s*$/;
// Known section-label keywords (uk + en). A "text:" line is treated as a
// section header only if it starts with one of these — otherwise lyric lines
// that happen to end with ":" (e.g. "Сумну пісню вигравав:") get wrongly
// promoted to headers.
const SECTION_KEYWORDS = [
  "куплет", "приспів", "приспiв", "бридж", "вступ", "інтро", "интро",
  "програш", "проигрыш", "кода", "соло", "вставка", "аутро",
  "пре-приспів", "передприспів", "перед-приспів", "предприпев",
  "фінал", "финал", "заспів",
  "intro", "verse", "chorus", "bridge", "outro", "coda", "solo",
  "pre-chorus", "prechorus", "interlude", "break", "hook",
];
// Strip leading non-letter glyphs (emoji, digits, keycap modifiers, arrows,
// brackets, whitespace, punctuation) so labels like "1️⃣Куплет", "⬇️Приспів",
// "➡️Програш 1 раз", "►Куплет" still match the keyword whitelist.
const LEADING_NON_LETTER_RE =
  /^[^\p{L}]+/u;
function isSectionLabel(text: string): boolean {
  const stripped = text.trim().replace(LEADING_NON_LETTER_RE, "").toLowerCase();
  const first = stripped.split(/[\s\d]/)[0];
  return SECTION_KEYWORDS.includes(first);
}

// Handle one-liner headers that also carry data on the same row, e.g.
// "[Вступ]: A7 Dm }x2" or "Програш: Am Dm". Split into {label, rest} so the
// section opens with the label and `rest` becomes its first data line.
function tryInlineHeader(line: string): { label: string; rest: string } | null {
  const bracketMatch = line.match(/^\s*\[([^\]]+)\]\s*:?\s*(.+)$/);
  if (bracketMatch) {
    const label = bracketMatch[1].trim();
    const rest = bracketMatch[2].trim();
    if (rest && isSectionLabel(label)) return { label, rest };
  }
  // Piped label + colon + piped data. Two orderings seen in songbooks:
  //   "| Вступ |: | Cm Fm G G | } 2"  — colon AFTER closing pipe
  //   "|Вступ : | Cm Fm G G | } 2"    — colon INSIDE pipes
  const pipedColon = line.match(
    /^\s*\|\s*([^|:]+?)\s*(?:\|\s*:\s*\||:\s*\|)\s*(.+?)\s*$/,
  );
  if (pipedColon) {
    const label = pipedColon[1].trim();
    const rest = pipedColon[2].trim();
    if (rest && isSectionLabel(label)) return { label, rest };
  }
  const colonMatch = line.match(/^\s*([^[\]:]+):\s*(.+)$/);
  if (colonMatch) {
    const label = colonMatch[1].trim();
    const rest = colonMatch[2].trim();
    if (
      rest &&
      label.length > 0 &&
      label.length <= 30 &&
      label.split(/\s+/).length <= 4 &&
      isSectionLabel(label)
    ) {
      return { label, rest };
    }
  }
  return null;
}
const HEADER_PIPE_RE = /^\|([^|]+)\|\s*:?\s*$/;
const HEADER_BRACKETS_RE = /^\[([^\]]+)\]\s*:?\s*$/;
const TAB_LINE_RE = /^[eEBGDA]\|[-0-9h p/\\~x().^sbt\s|]+$/;

// Cyrillic→Latin homoglyph map — songbooks frequently mix layouts and
// "Аm" (Cyrillic А) vs "Am" (Latin A) are visually identical. Without this
// normalization the token fails the chord regex and the whole chord-only line
// falls back to plain-lyrics rendering (no orange highlight).
const HOMOGLYPHS: Record<string, string> = {
  "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "М": "M",
  "а": "a", "в": "b", "с": "c", "е": "e", "н": "h", "м": "m",
};
function normalizeChordToken(s: string): string {
  let out = "";
  for (const ch of s) out += HOMOGLYPHS[ch] ?? ch;
  return out;
}

function isChordToken(s: string): boolean {
  return CHORD_TOKEN_RE.test(normalizeChordToken(s));
}

// Strip a trailing repeat marker like " - 2 рази", " — 3 раза", " x2", "} 2".
// Used so chord-progression lines such as "|Bbm Bbm|F F| - 2 рази" still
// classify as chord-only.
function stripTrailingRepeat(text: string): string {
  return text
    .replace(/\s*[}\]]\s*\d+\s*$/u, "")
    .replace(/\s*[-—]\s*\d+\s*раз[іиаo]?в?\s*\.?\s*$/iu, "")
    .replace(/\s*[xхX×]\s*\d+\s*$/iu, "");
}

function isChordOnlyBareLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  return tokens.every((t) => isChordToken(t));
}

function isChordOnlyBracketedLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.includes("[")) return false;
  return trimmed.replace(/\[[^\]]+\]/g, "").trim() === "";
}

// Extract each chord with its column index in the source line.
// Bare tokens: column = their offset in the string.
// Bracketed:   column = offset of the `[` (so chord hovers over whatever is under the bracket).
function extractChordPositions(line: string): { chord: string; col: number }[] {
  const results: { chord: string; col: number }[] = [];
  if (line.includes("[")) {
    const re = /\[([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (isChordToken(m[1])) results.push({ chord: normalizeChordToken(m[1]), col: m.index });
    }
  } else {
    // Split on whitespace AND pipe characters. Progressions like
    // "|Bbm Bbm|F F|" tokenize as Bbm/Bbm/F/F with their original column
    // positions preserved (the regex tracks index per match).
    const re = /[^\s|]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (isChordToken(m[0])) results.push({ chord: normalizeChordToken(m[0]), col: m.index });
    }
  }
  return results;
}

// Parse a single line that uses inline [Am]text notation.
// Returns lyrics with brackets stripped, and chord positions measured against
// the stripped output (so "[Am]Мила [Dm]моя" → lyrics "Мила моя", Am@0, Dm@5).
function parseInlineBracketsLine(line: string): ChordLine {
  const leadingMatch = line.match(/^(\s*)/);
  const lyricsCol = leadingMatch ? leadingMatch[1].length : 0;
  const body = line.slice(lyricsCol);

  const chords: { chord: string; col: number }[] = [];
  let out = "";
  let i = 0;
  while (i < body.length) {
    if (body[i] === "[") {
      const close = body.indexOf("]", i + 1);
      if (close !== -1) {
        const inner = body.slice(i + 1, close);
        if (isChordToken(inner)) {
          chords.push({ chord: normalizeChordToken(inner), col: lyricsCol + out.length });
          i = close + 1;
          continue;
        }
      }
    }
    out += body[i];
    i++;
  }

  return { chords, lyrics: out, lyricsCol };
}

// Build a ChordLine when a chord-line and a lyric-line are paired (UG-style).
//
// When the chord-line is wider than the lyric-line, or any chord sits past the
// end of the lyric, the chord positions are very likely misaligned (this is a
// known side-effect of the mychords scraper, which can drop a few spaces when
// walking nested chord-row markup). In that case we snap each chord to the
// start of the word it falls within in the lyric — that's what mychords does
// visually anyway. Lines that look OK (chord row fits inside the lyric line
// and every chord position lands on a non-space character) are left alone, so
// hand-authored songs with intentional mid-word chord placement aren't
// affected.
function mergeChordOverLyric(chordLine: string, lyricLine: string): ChordLine {
  const chords = extractChordPositions(chordLine);
  const leadingMatch = lyricLine.match(/^(\s*)/);
  const lyricsCol = leadingMatch ? leadingMatch[1].length : 0;
  const lyrics = lyricLine.slice(lyricsCol).replace(/\s+$/, "");

  const lyricLineLen = lyricsCol + lyrics.length;
  // Chords are split into two buckets:
  //   in-lyric  — col is inside the lyric range. May get snapped to fix
  //               legacy mis-alignment when the chord row is much wider than
  //               the lyric (the classic mychords-import bug).
  //   past-end  — col is at or past the lyric end. mychords intentionally
  //               renders trailing turn-around chords past the last word
  //               (e.g. row 1 of Latexfauna's «Сьогодні в мене …морщин» has
  //               A floating ~10 chars past "морщин"). Snapping them back
  //               onto the last word collapses that visual gap.
  // Past-end chords are NEVER snapped. In-lyric chords get the legacy snap
  // only if the IN-LYRIC chords themselves indicate corruption — i.e. one
  // lands on whitespace. Trailing past-end chords don't count.
  const inLyric = chords.filter((c) => c.col < lyricLineLen);
  const pastEnd = chords.filter((c) => c.col >= lyricLineLen);
  const needsSnap =
    inLyric.some((c) => {
      const ch = lyricLine[c.col];
      return ch === undefined || ch === " " || ch === "\t";
    });
  const snappedInLyric = needsSnap
    ? snapChordsToWordStarts(inLyric, lyricLine)
    : inLyric;
  // Concatenate without re-sorting — extractChordPositions returns chords in
  // source order already, and renderer doesn't care about array order.
  const snapped = [...snappedInLyric, ...pastEnd];

  return { chords: snapped, lyrics, lyricsCol };
}

// For each chord, find the start of the word in `lyricLine` that the chord
// column falls within (or before). If the column is past the lyric end, snap
// to the last word start.
//
// When two chords would land on the same word (e.g. four chords above
// "Дума:" — same source col, different chord names), each subsequent chord
// is bumped to the next available word start (or, if there is no next word,
// to the previous chord's right edge + 1) so the absolute-positioned chord
// spans don't visually stack on top of each other.
function snapChordsToWordStarts(
  chords: { chord: string; col: number }[],
  lyricLine: string,
): { chord: string; col: number }[] {
  if (chords.length === 0) return chords;

  // Indices in `lyricLine` where a new word begins (transition from
  // whitespace → non-whitespace, or at column 0 if the line starts with a
  // word).
  const wordStarts: number[] = [];
  for (let i = 0; i < lyricLine.length; i++) {
    const cur = lyricLine[i];
    if (cur === " " || cur === "\t") continue;
    const prev = i === 0 ? " " : lyricLine[i - 1];
    if (prev === " " || prev === "\t") wordStarts.push(i);
  }
  if (wordStarts.length === 0) return chords;

  // Single-word lyric lines (e.g. an indented "Ау!" or "Ой!" exclamation) —
  // the chord row above usually encodes a 3-4 chord progression played
  // during that one syllable. Snapping all of them to the single word
  // collapses meaningful timing information. Leave chord positions
  // untouched — chord-row's own spacing is the source of truth here, the
  // way mychords renders it too.
  if (wordStarts.length === 1) return chords;

  // Process chords in source-col order so the "bump to next word" logic can
  // track which word slots are already taken.
  const ordered = chords
    .map((c, srcIdx) => ({ ...c, srcIdx }))
    .sort((a, b) => a.col - b.col);

  const placed: { chord: string; col: number; srcIdx: number }[] = [];
  let minNextCol = -1; // earliest col the next chord may take

  for (const { chord, col, srcIdx } of ordered) {
    // If the chord sits BEFORE the first word (i.e. in the lyric's leading
    // whitespace), preserve its position — that's how mychords renders an
    // intro chord that's read just before the line starts ("C#m / ⏎ Я скінчу
    // страждання"). Snapping it forward onto the first word loses that
    // pre-lyric anchor and visually merges chord+word.
    if (col < wordStarts[0]) {
      // Still respect collisions with previously placed chords.
      const safe = col > minNextCol ? col : minNextCol + 1;
      placed.push({ chord, col: safe, srcIdx });
      minNextCol = safe + chord.length;
      continue;
    }

    // Candidate: NEAREST wordStart to `col`. Snapping to the previous word
    // start is wrong when the source position is in the gap between two words
    // — e.g. mychords renders C#m on the space after "він" (col 14) inside
    // "Без упину, він летів, летів". Previous-only snap pulls C#m back onto
    // "він" (col 11), losing the "after він" anchor; nearest-snap correctly
    // moves it forward to "летів" (col 15), matching mychords' visual.
    let snapIdx = 0;
    let bestDist = Infinity;
    for (let k = 0; k < wordStarts.length; k++) {
      const d = Math.abs(wordStarts[k] - col);
      if (d < bestDist) { bestDist = d; snapIdx = k; }
    }
    let snapped = wordStarts[snapIdx];

    // If this would land on or before the previous placed chord, bump
    // forward to the next word start until we find a free one.
    while (snapped <= minNextCol && snapIdx + 1 < wordStarts.length) {
      snapIdx++;
      snapped = wordStarts[snapIdx];
    }

    // Still colliding (no more words available) — place chord immediately
    // after the previous one with a single-char gap. Better than stacking.
    if (snapped <= minNextCol) {
      snapped = minNextCol + 1;
    }

    placed.push({ chord, col: snapped, srcIdx });
    minNextCol = snapped + chord.length;
  }

  // Restore original source order so callers that depend on input order
  // (e.g. some downstream styling) don't see a reshuffle.
  placed.sort((a, b) => a.srcIdx - b.srcIdx);
  return placed.map(({ chord, col }) => ({ chord, col }));
}

// Chord-only line, rendered by itself (no lyrics).
function parseChordOnlyLine(line: string): ChordLine {
  const chords = extractChordPositions(line);
  return { chords, lyrics: "", lyricsCol: 0 };
}

// Plain text line with no chords.
function parsePlainLine(line: string): ChordLine {
  const leadingMatch = line.match(/^(\s*)/);
  const lyricsCol = leadingMatch ? leadingMatch[1].length : 0;
  return { chords: [], lyrics: line.slice(lyricsCol).replace(/\s+$/, ""), lyricsCol };
}

// Line that mixes text labels and chord tokens on the same row
// (e.g. "вст. Am", "Solo: G D Em C"). Chords are lifted out to the chord row,
// and the lyric row keeps the non-chord text — columns preserved by padding
// the lifted chord positions with spaces so following text doesn't shift.
// A line qualifies as a "mixed label + chord" row only when the chord tokens
// it contains are unambiguous — i.e. either ≥2 chord tokens, or at least one
// token is ≥2 chars long (like "Am", "G7", "Dm"). A single 1-letter token
// (A/B/C/D/E/F/G/H) alone inside prose is almost always just a Cyrillic word
// letter ("А гуцулку чорноброву", "Е ти ж мене"), not a chord label.
function hasAnyChordToken(line: string): boolean {
  const trimmed = stripTrailingRepeat(line.trim());
  if (!trimmed) return false;
  // Split on whitespace AND pipe characters so progressions written as
  // "|Bbm Bbm|F F|" tokenize cleanly.
  const chordTokens = trimmed.split(/[\s|]+/).filter(Boolean).filter((t) => isChordToken(t));
  if (chordTokens.length === 0) return false;
  if (chordTokens.length >= 2) return true;
  return chordTokens.some((t) => t.length >= 2);
}
function parseMixedLine(line: string): ChordLine {
  const leadingMatch = line.match(/^(\s*)/);
  const lyricsCol = leadingMatch ? leadingMatch[1].length : 0;
  const body = line.slice(lyricsCol);
  const chords: { chord: string; col: number }[] = [];
  // Match chord tokens delimited by whitespace OR pipe characters, so
  // "|Bbm Bbm|F F|" yields four chord placements at their original columns.
  const re = /[^\s|]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (isChordToken(m[0])) {
      chords.push({ chord: normalizeChordToken(m[0]), col: lyricsCol + m.index });
    }
  }
  // Keep the original text as lyrics — the renderer will color chord spans inline.
  return { chords, lyrics: body.replace(/\s+$/, ""), lyricsCol, inlineChords: true };
}

export function parseLyricsWithChords(raw: string): {
  sections: SongSection[];
  chords: string[];
} {
  const allChords = new Set<string>();
  const allLines = raw.split("\n");

  // Split into section groups by explicit headers only.
  const groups: { label: string; dataLines: string[] }[] = [];
  let currentGroup: { label: string; dataLines: string[] } | null = null;

  for (const line of allLines) {
    const trimmed = line.trim();

    const colonMatch = trimmed.match(HEADER_COLON_RE);
    const pipeMatch = trimmed.match(HEADER_PIPE_RE);
    const bracketMatch = trimmed.match(HEADER_BRACKETS_RE);
    // [Vstup] alone on a line is a section header only when it's not a chord.
    const bracketIsHeader = bracketMatch && !isChordToken(bracketMatch[1].trim());
    // "text:" is a header only when it's short — lyrics often end with ":".
    // Real section labels ("Куплет 1:", "Приспів:", "Бридж:") are ≤4 words.
    const colonLabel = colonMatch ? colonMatch[1].trim() : "";
    const colonIsHeader =
      !!colonMatch &&
      colonLabel.length > 0 &&
      colonLabel.length <= 30 &&
      colonLabel.split(/\s+/).length <= 4 &&
      isSectionLabel(colonLabel);
    // Standalone label line (no `:` or `.` terminator) — short emoji/digit-
    // prefixed labels like "➡️Програш 1 раз", "►Куплет 2", "🎵Бридж" still
    // need to be promoted to section headers.
    const standaloneIsHeader =
      !colonIsHeader && !pipeMatch && !bracketIsHeader &&
      trimmed.length > 0 && trimmed.length <= 30 &&
      trimmed.split(/\s+/).length <= 4 &&
      isSectionLabel(trimmed);
    if (colonIsHeader || pipeMatch || bracketIsHeader || standaloneIsHeader) {
      if (currentGroup) groups.push(currentGroup);
      const label = (
        colonIsHeader ? colonLabel
        : pipeMatch ? pipeMatch[1]
        : bracketIsHeader ? bracketMatch![1]
        : trimmed
      ).trim();
      currentGroup = { label, dataLines: [] };
      continue;
    }

    // Inline header with data on same line, e.g. "[Вступ]: A7 Dm }x2".
    const inlineHeader = tryInlineHeader(trimmed);
    if (inlineHeader) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { label: inlineHeader.label, dataLines: [inlineHeader.rest] };
      continue;
    }

    if (!trimmed) continue; // empty lines are just visual padding

    if (!currentGroup) currentGroup = { label: "", dataLines: [] };
    currentGroup.dataLines.push(line);
  }
  if (currentGroup) groups.push(currentGroup);

  const sections: SongSection[] = groups.map((group) => {
    // Extract tab blocks (≥4 consecutive standard-tuning string lines).
    const tabBlocks: string[] = [];
    const nonTabLines: string[] = [];
    let tabAccum: string[] = [];
    for (const line of group.dataLines) {
      if (TAB_LINE_RE.test(line.trim())) {
        tabAccum.push(line.trimEnd());
      } else {
        if (tabAccum.length >= 4) tabBlocks.push(tabAccum.join("\n"));
        else nonTabLines.push(...tabAccum);
        tabAccum = [];
        nonTabLines.push(line);
      }
    }
    if (tabAccum.length >= 4) tabBlocks.push(tabAccum.join("\n"));
    else nonTabLines.push(...tabAccum);
    const tab = tabBlocks.length > 0 ? tabBlocks.join("\n\n") : undefined;

    // Classify each line: inline-brackets, chord-only, or plain.
    type ParsedLine = ChordLine & { kind: "inline" | "chord-only" | "plain" };
    const parsed: ParsedLine[] = nonTabLines.map((line) => {
      // Pipe marker like "|Приспів| x2" — performer instruction to repeat a
      // previously-defined section. Rendered as a compact label chip inline,
      // does NOT open a new section (the bare "|Label|" form is handled by
      // the grouping stage above).
      const pipeMarker = line.match(/^\s*\|([^|:]+)\|\s*(.+?)\s*$/);
      if (pipeMarker && isSectionLabel(pipeMarker[1].trim())) {
        const label = pipeMarker[1].trim();
        const suffix = pipeMarker[2].trim();
        const marker = suffix ? `${label} ${suffix}` : label;
        return { chords: [], lyrics: "", lyricsCol: 0, marker, kind: "inline" };
      }
      const bare = isChordOnlyBareLine(line);
      const bracketed = isChordOnlyBracketedLine(line);
      if (bare || bracketed) {
        const cl = parseChordOnlyLine(line);
        cl.chords.forEach((c) => allChords.add(c.chord));
        return { ...cl, kind: "chord-only" };
      }
      if (line.includes("[")) {
        const cl = parseInlineBracketsLine(line);
        cl.chords.forEach((c) => allChords.add(c.chord));
        return { ...cl, kind: "inline" };
      }
      // Mixed row: text tokens + ≥1 chord token (e.g. "вст. Am").
      // Chords stay embedded in `lyrics`; renderer colors them in place.
      if (hasAnyChordToken(line)) {
        const cl = parseMixedLine(line);
        cl.chords.forEach((c) => allChords.add(c.chord));
        return { ...cl, kind: "inline" };
      }
      return { ...parsePlainLine(line), kind: "plain" };
    });

    // Merge chord-only + following plain line into one ChordLine (UG-style).
    const lines: ChordLine[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const curr = parsed[i];
      const next = parsed[i + 1];
      if (curr.kind === "chord-only" && next && next.kind === "plain" && next.lyrics) {
        const merged = mergeChordOverLyric(nonTabLines[i], nonTabLines[i + 1]);
        merged.chords.forEach((c) => allChords.add(c.chord));
        lines.push(merged);
        i++;
        continue;
      }
      // If a bare chord-only row is directly above a mixed-content row
      // (text + inline chords), drop the bare row — its chord is already
      // represented in-place within the next line.
      if (curr.kind === "chord-only" && next?.kind === "inline" && (next as ChordLine).inlineChords) {
        continue;
      }
      lines.push({
        chords: curr.chords,
        lyrics: curr.lyrics,
        lyricsCol: curr.lyricsCol,
        ...(curr.inlineChords ? { inlineChords: true } : {}),
        ...(curr.marker ? { marker: curr.marker } : {}),
      });
    }

    return { label: group.label, lines, ...(tab ? { tab } : {}) };
  });

  return { sections, chords: Array.from(allChords) };
}
