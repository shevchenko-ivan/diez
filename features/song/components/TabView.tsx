"use client";

/**
 * Visual guitar tablature renderer.
 * Input: raw ASCII tab string (section.tab), e.g.
 *   e|--0--3--5------|
 *   B|--1--3--5------|
 *   G|--0--2--5------|
 *   D|--2--0--5------|
 *   A|--3------5-----|
 *   E|---------------|
 *
 * Renders 6 staff lines with numbers sitting on the strings.
 */

import type { CSSProperties } from "react";

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

function StringRow({
  name,
  content,
  fontSize,
  rowH,
  isOuterString,
  bg,
}: {
  name: string;
  content: string;
  fontSize: number;
  rowH: number;
  isOuterString: boolean;
  bg: string;
}) {
  const tokens = tokenize(content);

  const lineStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: isOuterString ? 1.5 : 1,
    background: isOuterString ? "var(--text-mid)" : "color-mix(in srgb, var(--text) 25%, transparent)",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", height: rowH }}>
      {/* String label */}
      <span
        style={{
          width: "1.75em",
          flexShrink: 0,
          textAlign: "right",
          paddingRight: "0.3em",
          fontWeight: 700,
          fontSize: fontSize - 1,
          color: "var(--text-muted)",
          position: "relative",
          zIndex: 1,
          lineHeight: `${rowH}px`,
        }}
      >
        {name}
      </span>

      {/* Content area */}
      <span
        style={{
          position: "relative",
          whiteSpace: "pre",
          lineHeight: `${rowH}px`,
          display: "inline-block",
        }}
      >
        {/* The string line */}
        <span aria-hidden style={lineStyle} />

        {/* Rendered tokens */}
        {tokens.map((tok, idx) => {
          if (tok.t === "dash") {
            // invisible dashes — keep width, hide color
            return (
              <span key={idx} style={{ color: "transparent", userSelect: "none" }}>
                {"-".repeat(tok.n)}
              </span>
            );
          }
          if (tok.t === "bar") {
            return (
              <span
                key={idx}
                style={{
                  color: "color-mix(in srgb, var(--text) 35%, transparent)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                |
              </span>
            );
          }
          if (tok.t === "note") {
            return (
              <span
                key={idx}
                style={{
                  color: "var(--text)",
                  fontWeight: 700,
                  background: bg,
                  position: "relative",
                  zIndex: 2,
                  padding: "0 0.5px",
                  // letter-spacing tightened so 2-digit frets don't push columns
                  letterSpacing: tok.v.length > 1 ? "-0.04em" : "0",
                }}
              >
                {tok.v}
              </span>
            );
          }
          if (tok.t === "tech") {
            return (
              <span
                key={idx}
                style={{
                  color: "var(--orange)",
                  fontWeight: 600,
                  background: bg,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {tok.ch}
              </span>
            );
          }
          // other (x, parentheses, etc.)
          return (
            <span key={idx} style={{ color: "var(--text-muted)", position: "relative", zIndex: 1 }}>
              {tok.ch}
            </span>
          );
        })}
      </span>
    </div>
  );
}

interface ParsedLine {
  name: string;
  content: string;
}

function parseTabBlock(block: string): { label: string | null; lines: ParsedLine[] } {
  const rows = block.split("\n");
  let label: string | null = null;
  const lines: ParsedLine[] = [];

  for (const row of rows) {
    const m = row.match(/^([A-Ga-g][#b]?)\|(.*)/);
    if (m) {
      lines.push({ name: m[1], content: m[2] });
    } else if (lines.length === 0 && row.trim()) {
      label = row.trim();
    }
  }
  return { label, lines };
}

export function TabView({
  tab,
  fontSize = 12,
  bg = "var(--surface)",
}: {
  tab: string;
  fontSize?: number;
  bg?: string;
}) {
  // A single section.tab may contain multiple blocks separated by blank lines
  const blocks = tab.split(/\n{2,}/);
  const rowH = Math.round(fontSize * 2.2);

  return (
    <div
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {blocks.map((block, bi) => {
        const { label, lines } = parseTabBlock(block);
        if (lines.length === 0) return null;

        return (
          <div key={bi}>
            {label && (
              <div
                style={{
                  fontSize: fontSize - 1,
                  color: "var(--text-muted)",
                  marginBottom: 4,
                  fontFamily: "inherit",
                }}
              >
                {label}
              </div>
            )}
            <div
              style={{
                display: "inline-block",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                maxWidth: "100%",
              }}
            >
              {lines.map((line, li) => (
                <StringRow
                  key={li}
                  name={line.name}
                  content={line.content}
                  fontSize={fontSize}
                  rowH={rowH}
                  isOuterString={li === 0 || li === lines.length - 1}
                  bg={bg}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
