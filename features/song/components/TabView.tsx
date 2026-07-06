"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Guitar tablature renderer — classic monospace ASCII look.
 * Input: raw ASCII tab string (section.tab), e.g.
 *   e|--0--3--5------|
 *   B|--1--3--5------|
 *   ...
 *
 * Renders the actual dash characters (not solid staff lines) so it reads like
 * the tab you'd paste from a text file, with fret numbers, bar lines and
 * techniques colour-coded. Kept strictly monospace so columns stay aligned.
 */

// Special technique chars rendered in accent color
const TECHNIQUE_RE = /[hHpPbrs~\\/^]/;

type Token =
  | { t: "note"; v: string }   // fret number (1-2 digits)
  | { t: "bar" }               // |
  | { t: "dash"; n: number }   // run of -
  | { t: "tech"; ch: string }  // h p b r ~ / \ ^
  | { t: "other"; ch: string };

function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (/\d/.test(ch)) {
      let v = ch;
      while (i + 1 < content.length && /\d/.test(content[i + 1])) v += content[++i];
      tokens.push({ t: "note", v });
    } else if (ch === "|") {
      tokens.push({ t: "bar" });
    } else if (ch === "-") {
      let n = 1;
      while (i + 1 < content.length && content[i + 1] === "-") { n++; i++; }
      tokens.push({ t: "dash", n });
    } else if (TECHNIQUE_RE.test(ch)) {
      tokens.push({ t: "tech", ch });
    } else {
      tokens.push({ t: "other", ch });
    }
    i++;
  }
  return tokens;
}

// Colours for the ASCII grid. Weight is kept uniform (400) across every token
// so each glyph occupies exactly one monospace cell — columns (and therefore
// the rhythm) stay perfectly aligned. Tokens differ by colour only.
const DASH = "color-mix(in srgb, var(--text) 30%, transparent)";
const BAR = "color-mix(in srgb, var(--text) 55%, transparent)";

function StringRow({
  name,
  content,
  rowH,
  gapTop = 0,
}: {
  name: string;
  content: string;
  rowH: number;
  /** Extra space above — used to separate stacked tab systems (E → e). */
  gapTop?: number;
}) {
  const tokens = tokenize(content);

  // Single monospace line — label, nut and content all sit on the SAME grid
  // (like a real "e|----" tab line). No flex box widths to knock cells off.
  return (
    <div style={{ whiteSpace: "pre", lineHeight: `${rowH}px`, marginTop: gapTop }}>
      <span style={{ color: "var(--text-muted)" }}>{name}</span>
      <span style={{ color: BAR }}>|</span>
      {tokens.map((tok, idx) => {
        if (tok.t === "dash") {
          return <span key={idx} style={{ color: DASH }}>{"-".repeat(tok.n)}</span>;
        }
        if (tok.t === "bar") {
          return <span key={idx} style={{ color: BAR }}>|</span>;
        }
        if (tok.t === "note") {
          return <span key={idx} style={{ color: "var(--text)" }}>{tok.v}</span>;
        }
        if (tok.t === "tech") {
          return <span key={idx} style={{ color: "var(--orange)" }}>{tok.ch}</span>;
        }
        // other (x, parentheses, etc.)
        return <span key={idx} style={{ color: "var(--text-muted)" }}>{tok.ch}</span>;
      })}
    </div>
  );
}

interface ParsedLine {
  name: string;
  content: string;
}

function parseTabBlock(block: string): { label: string | null; chords: string[] | null; lines: ParsedLine[] } {
  const rows = block.split("\n");
  let label: string | null = null;
  let chords: string[] | null = null;
  const lines: ParsedLine[] = [];

  for (const row of rows) {
    if (row.charCodeAt(0) === 1) {
      // -prefixed chord header from the parser — chords for this block.
      chords = row.slice(1).trim().split(/\s+/).filter(Boolean);
      continue;
    }
    const m = row.match(/^([A-Ha-h][#b]?|[1-6])\|(.*)/);
    if (m) {
      lines.push({ name: m[1], content: m[2] });
    } else if (lines.length === 0 && row.trim()) {
      label = row.trim();
    }
  }
  return { label, chords, lines };
}

// Column (in the tab CONTENT, i.e. after the label + nut) where each chord
// sits. The source's exact per-chord columns aren't preserved (they're stored
// compact), so we place each chord over the FIRST fretted note of its measure —
// the note it actually accompanies — which reads far more naturally than
// pinning it to the bar line. Returning content-relative columns (not a padded
// string) lets the same positions survive slicing when a system wraps.
function chordPositions(chords: string[], lines: ParsedLine[]): { chord: string; col: number }[] {
  const sample = lines[0].content;
  const L = sample.length;
  const barCols: number[] = [];
  for (let i = 0; i < L; i++) if (sample[i] === "|") barCols.push(i);
  // First column in [a, b) where any string has a fret digit — the note the
  // chord accompanies. Falls back to `a` when the span is all rests.
  const firstNoteIn = (a: number, b: number): number => {
    for (let j = a; j < b; j++) if (lines.some((l) => /\d/.test(l.content[j] || ""))) return j;
    return a;
  };
  // No bar lines (a through-composed riff) — the compact source has no columns
  // to hang chords on, so distributing them all over the first note collapses
  // them into one garbled cluster. Spread them evenly across the width instead.
  if (barCols.length === 0) {
    const n = chords.length;
    return chords.map((ch, i) => ({
      chord: ch,
      col: firstNoteIn(Math.round((i * L) / n), Math.round(((i + 1) * L) / n)),
    }));
  }
  return chords.map((ch, i) => {
    const measStart = (barCols[i] ?? -1) + 1;
    const measEnd = barCols[i + 1] ?? L;
    return { chord: ch, col: firstNoteIn(measStart, measEnd) };
  });
}

// Render the chord row for one wrapped slice [start, end) of the content.
// Chords whose column falls in the slice are placed at (col - start); the row
// is padded on the left by (nameLen + 1) so it lines up with StringRow's label
// and nut bar. Returns "" when no chord lands in this slice.
function buildChordRowSlice(
  positions: { chord: string; col: number }[],
  start: number,
  end: number,
  nameLen: number,
): string {
  const width = end - start;
  const arr = new Array<string>(width).fill(" ");
  let any = false;
  for (const { chord, col } of positions) {
    if (col < start || col >= end) continue;
    for (let k = 0; k < chord.length && col - start + k < width; k++) {
      arr[col - start + k] = chord[k];
      any = true;
    }
  }
  if (!any) return "";
  return " ".repeat(nameLen + 1) + arr.join("").replace(/\s+$/, "");
}

// Break a system's columns into wrapped slices so each fits `maxCols` display
// columns, splitting only at bar lines so whole measures stay together. When
// maxCols is generous (desktop) the whole system fits in one slice → no wrap.
function wrapRanges(lines: ParsedLine[], maxCols: number): [number, number][] {
  const L = Math.max(...lines.map((l) => l.content.length));
  // Union of every bar-line column across the strings (they share columns, but
  // a shorter trailing string may omit some — union keeps boundaries complete).
  const barSet = new Set<number>();
  for (const l of lines) for (let i = 0; i < l.content.length; i++) if (l.content[i] === "|") barSet.add(i);
  const starts = [0, ...[...barSet].map((b) => b + 1)]
    .filter((s) => s < L)
    .sort((a, b) => a - b);
  const uniqStarts = [...new Set(starts)];
  const measures: [number, number][] = uniqStarts.map((s, i) => [s, uniqStarts[i + 1] ?? L]);

  const ranges: [number, number][] = [];
  let curStart: number | null = null;
  let curEnd = 0;
  const flush = () => {
    if (curStart !== null) { ranges.push([curStart, curEnd]); curStart = null; }
  };
  for (const [ms, me] of measures) {
    if (me - ms > maxCols) {
      // A single measure wider than the screen (or a bar-less riff) — flush what
      // we have, then hard-split it into screen-width chunks so nothing ever
      // needs sideways scrolling. The break isn't at a bar, but it fits.
      flush();
      for (let s = ms; s < me; s += maxCols) ranges.push([s, Math.min(s + maxCols, me)]);
      continue;
    }
    if (curStart === null) { curStart = ms; curEnd = me; }
    else if (me - curStart <= maxCols) { curEnd = me; }
    else { flush(); curStart = ms; curEnd = me; }
  }
  flush();
  return ranges.length > 0 ? ranges : [[0, L]];
}

// How many string rows make one tab "system", so stacked measures get a gap
// between them. Detects the repeating period of the string-name sequence (e.g.
// [E,H,G,D,A,E] repeated → 6). Robust when the top and bottom strings share a
// letter (…E over E…), where a naive "name === first" check would misfire.
function systemSize(names: string[]): number {
  const n = names.length;
  for (let p = 2; p <= n / 2; p++) {
    if (n % p !== 0) continue;
    let ok = true;
    for (let i = p; i < n; i++) {
      if (names[i] !== names[i - p]) { ok = false; break; }
    }
    if (ok) return p;
  }
  return n; // single system — no internal boundaries
}

// One tab block (label + optional chord row + string rows). Measures its own
// available width and, on a narrow screen, wraps each system onto new lines at
// bar boundaries so a wide tab fits without sideways scrolling. On a wide
// screen the whole system fits in one slice, so nothing wraps.
function TabBlock({
  label,
  chords,
  lines,
  fontSize,
  rowH,
}: {
  label: string | null;
  chords: string[] | null;
  lines: ParsedLine[];
  fontSize: number;
  rowH: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [maxCols, setMaxCols] = useState<number | null>(null);
  const nameLen = lines[0]?.name.length ?? 1;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Width of one monospace cell, measured in this exact font/size context.
      const span = document.createElement("span");
      span.style.cssText = "position:absolute;visibility:hidden;white-space:pre;pointer-events:none;";
      span.textContent = "0".repeat(40);
      el.appendChild(span);
      const charW = span.getBoundingClientRect().width / 40;
      el.removeChild(span);
      const w = el.clientWidth;
      if (charW > 0 && w > 0) {
        // Subtract the label + nut columns; leave 1 cell of slack.
        setMaxCols(Math.max(8, Math.floor(w / charW) - (nameLen + 1) - 1));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fontSize, nameLen]);

  const sz = systemSize(lines.map((l) => l.name));
  const systems: ParsedLine[][] = [];
  for (let i = 0; i < lines.length; i += sz) systems.push(lines.slice(i, i + sz));
  const positions = chords && chords.length > 0 ? chordPositions(chords, lines) : null;

  const L = Math.max(...lines.map((l) => l.content.length));
  const ranges: [number, number][] = maxCols === null ? [[0, L]] : wrapRanges(lines, maxCols);

  // Flatten systems × wrap-ranges into vertically stacked sub-systems.
  const subSystems: { sysIndex: number; range: [number, number]; sysLines: ParsedLine[] }[] = [];
  systems.forEach((sysLines, si) => {
    for (const range of ranges) subSystems.push({ sysIndex: si, range, sysLines });
  });

  return (
    <div>
      {label && (
        <div style={{ fontSize: fontSize - 1, color: "var(--text-muted)", marginBottom: 4, fontFamily: "inherit" }}>
          {label}
        </div>
      )}
      <div ref={ref}>
        {subSystems.map(({ sysIndex, range, sysLines }, idx) => {
          const [start, end] = range;
          const chordRow =
            sysIndex === 0 && positions ? buildChordRowSlice(positions, start, end, nameLen) : "";
          return (
            <div key={idx} style={{ marginTop: idx === 0 ? 0 : Math.round(rowH * 0.8) }}>
              {sysIndex === 0 && positions && (
                <div style={{ whiteSpace: "pre", lineHeight: `${rowH}px`, color: "var(--orange)", fontWeight: 700 }}>
                  {chordRow || " "}
                </div>
              )}
              {sysLines.map((line, li) => (
                <StringRow key={li} name={line.name} content={line.content.slice(start, end)} rowH={rowH} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TabView({
  tab,
  fontSize = 12,
}: {
  tab: string;
  fontSize?: number;
  /** @deprecated kept for call-site compatibility; no longer used. */
  bg?: string;
}) {
  // A single section.tab may contain multiple blocks separated by blank lines
  const blocks = tab.split(/\n{2,}/);
  const rowH = Math.round(fontSize * 1.5);

  return (
    <div
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize,
        lineHeight: 1,
        fontWeight: 400,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: 0,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {blocks.map((block, bi) => {
        const { label, chords, lines } = parseTabBlock(block);
        if (lines.length === 0) return null;
        return <TabBlock key={bi} label={label} chords={chords} lines={lines} fontSize={fontSize} rowH={rowH} />;
      })}
    </div>
  );
}
