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
const HEADER_COLON_RE = /^([^[\]]+):\s*$/;
const HEADER_PIPE_RE = /^\|([^|]+)\|\s*$/;
const HEADER_BRACKETS_RE = /^\[([^\]]+)\]\s*$/;
const TAB_LINE_RE = /^[eEBGDA]\|[-0-9h p/\\~x().^sbt\s|]+$/;

function isChordToken(s: string): boolean {
  return CHORD_TOKEN_RE.test(s);
}

function isChordOnlyBareLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  return tokens.every((t) => CHORD_TOKEN_RE.test(t));
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
      if (isChordToken(m[1])) results.push({ chord: m[1], col: m.index });
    }
  } else {
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (isChordToken(m[0])) results.push({ chord: m[0], col: m.index });
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
          chords.push({ chord: inner, col: lyricsCol + out.length });
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
function mergeChordOverLyric(chordLine: string, lyricLine: string): ChordLine {
  const chords = extractChordPositions(chordLine);
  const leadingMatch = lyricLine.match(/^(\s*)/);
  const lyricsCol = leadingMatch ? leadingMatch[1].length : 0;
  const lyrics = lyricLine.slice(lyricsCol).replace(/\s+$/, "");
  return { chords, lyrics, lyricsCol };
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
      colonLabel.split(/\s+/).length <= 4;
    if (colonIsHeader || pipeMatch || bracketIsHeader) {
      if (currentGroup) groups.push(currentGroup);
      const label = (colonIsHeader ? colonLabel : pipeMatch ? pipeMatch[1] : bracketMatch![1]).trim();
      currentGroup = { label, dataLines: [] };
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
      lines.push({ chords: curr.chords, lyrics: curr.lyrics, lyricsCol: curr.lyricsCol });
    }

    return { label: group.label, lines, ...(tab ? { tab } : {}) };
  });

  return { sections, chords: Array.from(allChords) };
}
