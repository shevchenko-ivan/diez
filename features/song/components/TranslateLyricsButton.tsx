"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { BottomSheet } from "@/shared/components/BottomSheet";
import type { SongSection } from "@/features/song/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Chrome's Translator API (built-in AI). Shipped in Chrome 138 (Jun 2025).
// We feature-detect at runtime and render nothing when absent — Firefox /
// Safari users simply don't see the button, no fallback toast / cloud call.
declare global {
  interface Window {
    Translator?: {
      availability(opts: { sourceLanguage: string; targetLanguage: string }): Promise<
        "unavailable" | "downloadable" | "downloading" | "available"
      >;
      create(opts: {
        sourceLanguage: string;
        targetLanguage: string;
        monitor?: (m: EventTarget) => void;
      }): Promise<{
        translate(text: string): Promise<string>;
        translateStreaming(text: string): AsyncIterable<string>;
      }>;
    };
  }
}

type Availability = Awaited<ReturnType<NonNullable<Window["Translator"]>["availability"]>>;

interface Props {
  sections: SongSection[];
  /** Source language (BCP 47). Defaults to Ukrainian — that's >95% of Diez's
   *  catalogue today. If we later add Belarusian / Polish songs we'd want to
   *  pass the song's detected language explicitly. */
  sourceLanguage?: string;
}

// Lyrics-only plain text: drop chord-row data and section labels — the
// Translator does best with continuous prose. Section labels stay as a hint.
function extractLyrics(sections: SongSection[]): string {
  const out: string[] = [];
  for (const s of sections) {
    if (s.label) out.push(`[${s.label}]`);
    for (const line of s.lines) {
      // ChordLine.lyrics already excludes the chord row above it; for
      // inline-chord lines we still keep the lyric text — chord substrings
      // are short and the Translator tolerates them gracefully.
      if (line.lyrics?.trim()) out.push(line.lyrics);
    }
    out.push("");
  }
  return out.join("\n").trim();
}

export function TranslateLyricsButton({ sections, sourceLanguage = "uk" }: Props) {
  // null = haven't checked yet; false = unsupported (hide button entirely).
  const [supported, setSupported] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"en" | "pl" | "de">("en");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);

  useEffect(() => {
    setSupported("Translator" in window);
  }, []);

  // Re-check availability whenever the user picks a different target language.
  // 'downloadable' means the model needs a one-time install — first click
  // triggers it.
  useEffect(() => {
    if (!open || !window.Translator) return;
    let cancelled = false;
    window.Translator
      .availability({ sourceLanguage, targetLanguage: target })
      .then((a) => { if (!cancelled) setAvailability(a); })
      .catch(() => { if (!cancelled) setAvailability("unavailable"); });
    return () => { cancelled = true; };
  }, [open, target, sourceLanguage]);

  async function runTranslate() {
    if (!window.Translator) return;
    const text = extractLyrics(sections);
    if (!text) { setError("Немає тексту для перекладу"); return; }
    setError(null);
    setTranslating(true);
    setTranslated("");
    setDownloadPct(availability === "downloadable" ? 0 : null);
    try {
      const translator = await window.Translator.create({
        sourceLanguage,
        targetLanguage: target,
        monitor(m) {
          m.addEventListener("downloadprogress", (e: any) => {
            setDownloadPct(Math.round((e.loaded ?? 0) * 100));
          });
        },
      });
      setDownloadPct(null);
      // Stream so long lyrics appear incrementally instead of one big wait.
      const stream = translator.translateStreaming(text);
      let acc = "";
      for await (const chunk of stream) {
        acc += chunk;
        setTranslated(acc);
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Не вдалося перекласти");
    } finally {
      setTranslating(false);
    }
  }

  // Hide entirely if the browser doesn't ship the Translator API (Firefox,
  // Safari, older Chromium). We deliberately don't fall back to a cloud
  // translator — that would mean shipping song text to a third party and is
  // out of scope for an on-device-AI experiment.
  if (supported !== true) return null;

  return (
    <>
      <TeButton
        icon={Languages}
        iconSize={13}
        iconColor="var(--text-mid)"
        title="Перекласти текст пісні"
        aria-label="Перекласти текст пісні"
        style={{ width: 36, height: 36 }}
        onClick={() => setOpen(true)}
      />
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Переклад тексту">
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Переклад на:</span>
            <select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value as "en" | "pl" | "de");
                setTranslated(null);
                setError(null);
              }}
              aria-label="Цільова мова перекладу"
              className="te-inset px-2 py-1 text-xs font-bold outline-none bg-transparent"
              style={{ borderRadius: "0.5rem", color: "var(--text)" }}
            >
              <option value="en">English</option>
              <option value="pl">Polski</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          {availability === "unavailable" && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Ця мова поки не підтримується вашим браузером.
            </p>
          )}

          {!translated && !translating && availability && availability !== "unavailable" && (
            <button
              type="button"
              onClick={runTranslate}
              className="te-pill-btn py-2 text-xs font-bold"
              style={{ borderRadius: "0.5rem", color: "var(--orange)" }}
            >
              {availability === "downloadable" ? "Завантажити модель і перекласти" : "Перекласти"}
            </button>
          )}

          {translating && downloadPct !== null && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Завантаження моделі… {downloadPct}%
            </p>
          )}

          {translating && downloadPct === null && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Перекладаю…</p>
          )}

          {translated && (
            <pre
              className="text-sm whitespace-pre-wrap font-mono"
              style={{
                color: "var(--text)",
                maxHeight: "60vh",
                overflowY: "auto",
                background: "transparent",
              }}
            >
              {translated}
            </pre>
          )}

          {error && (
            <p className="text-xs" style={{ color: "var(--red, #d33)" }}>{error}</p>
          )}

          <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
            Переклад виконується на вашому пристрої через Chrome AI — текст
            пісні не передається третім особам.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
