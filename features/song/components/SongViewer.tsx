"use client";

import { useState, useEffect } from "react";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Minus, Plus, Play, Square, Type, ArrowUpRight, ArrowDownRight } from "lucide-react";

// Helper to transpose a single chord
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP: Record<string, string> = { "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#" };

function transposeChord(chord: string, semitones: number): string {
  if (!chord) return chord;
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  let root = match[1];
  const modifier = match[2];
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];
  
  const index = NOTES.indexOf(root);
  if (index === -1) return chord;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  return NOTES[newIndex] + modifier;
}

export function SongViewer({ song }: { song: Song }) {
  const [transpose, setTranspose] = useState(0);
  const [fontSize, setFontSize] = useState(16); // Base size in px
  const [scrollSpeed, setScrollSpeed] = useState(0); // 0 = stopped, 1-5 = speed levels
  const { trigger } = useHaptics();

  // Auto-scroll loop
  useEffect(() => {
    if (scrollSpeed === 0) return;
    const interval = setInterval(() => {
      window.scrollBy({ top: scrollSpeed, left: 0, behavior: "auto" });
    }, 50); // 50ms interval => 20fps
    return () => clearInterval(interval);
  }, [scrollSpeed]);

  const handleScrollToggle = () => {
    trigger("light");
    setScrollSpeed((prev) => (prev === 0 ? 1 : 0));
  };

  const handleScrollSpeed = (delta: number) => {
    trigger("light");
    setScrollSpeed((prev) => {
      if (prev === 0 && delta > 0) return 1;
      const next = Math.max(0, Math.min(5, prev + delta));
      return next;
    });
  };

  return (
    <div>
      {/* ── Chord palette ─────────────────────────────────────────────── */}
      <div className="te-surface mb-6" style={{ borderRadius: "1.25rem", padding: "1rem 1.25rem" }}>
        <div className="flex justify-between items-center mb-3">
          <p
            className="uppercase"
            style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 400 }}
          >
            Акорди {transpose !== 0 ? `(Транспонація: ${transpose > 0 ? "+" : ""}${transpose})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {song.chords.map((chord: string) => (
            <div
              key={chord}
              className="te-key font-mono-te flex items-center justify-center"
              style={{
                minWidth: 44,
                height: 36,
                padding: "0 0.75rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text)",
                letterSpacing: "0.02em",
              }}
            >
              {transposeChord(chord, transpose)}
            </div>
          ))}
        </div>
      </div>

      {/* ── Lyrics + chords (Render Blocks) ─────────────────────────────────── */}
      <div className="space-y-4 pb-24">
        {song.sections.map((section: SongSection) => (
          <div key={section.label} className="te-surface" style={{ borderRadius: "1.25rem", overflow: "hidden" }}>
             <div className="te-inset px-4 py-2 flex items-center gap-2" style={{ borderRadius: 0 }}>
               <span
                 className="uppercase font-mono-te"
                 style={{ fontSize: "0.6rem", letterSpacing: "0.12em", color: "var(--text-muted)" }}
               >
                 {section.label}
               </span>
             </div>
             <div className="px-5 py-4 space-y-4">
               {section.lines.map((line, i) => {
                 const words = line.lyrics.split(" ");
                 return (
                   <div key={i}>
                     {/* Chord Row */}
                     <div className="flex gap-0 mb-0.5 min-h-[1.25rem]" style={{ flexWrap: "nowrap" }}>
                       {words.map((word, j) => {
                         const chord = line.chords[j] || "";
                         const trChord = transposeChord(chord, transpose);
                         return (
                           <div key={j} className="relative" style={{ marginRight: "0.5rem" }}>
                             {trChord && (
                               <span
                                 className="font-mono-te absolute"
                                 style={{
                                   top: `-${fontSize * 0.7}px`,
                                   left: 0,
                                   fontSize: `${fontSize * 0.7}px`,
                                   fontWeight: 600,
                                   color: "var(--orange)",
                                   whiteSpace: "nowrap",
                                   letterSpacing: "0.01em",
                                 }}
                               >
                                 {trChord}
                               </span>
                             )}
                           </div>
                         );
                       })}
                     </div>
                     {/* Lyric Row */}
                     <p
                       style={{
                         fontSize: `${fontSize}px`,
                         lineHeight: 1.6,
                         color: "var(--text)",
                         fontWeight: 350,
                         letterSpacing: "0.005em",
                       }}
                     >
                       {line.lyrics}
                     </p>
                   </div>
                 );
               })}
             </div>
          </div>
        ))}
      </div>

      {/* ── Floating Controls Toolbar ────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/5 backdrop-blur-md p-1.5 te-inset shadow-xl" style={{ borderRadius: "999px" }}>
        
        {/* Transpose Controls */}
        <div className="flex items-center bg-white/5 p-1" style={{ borderRadius: "999px" }}>
          <button
            onClick={() => { trigger("light"); setTranspose((t) => t - 1); }}
            className="te-knob flex items-center justify-center w-8 h-8 rounded-full"
            title="Опустити на півтону"
          >
            <Minus size={14} />
          </button>
          <div className="px-3 flex items-center justify-center font-mono-te text-xs font-bold w-12" style={{ color: "var(--text-mid)" }}>
            {transpose > 0 ? "+" : ""}{transpose}
          </div>
          <button
            onClick={() => { trigger("light"); setTranspose((t) => t + 1); }}
            className="te-knob flex items-center justify-center w-8 h-8 rounded-full"
            title="Підняти на півтону"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Font Size Controls */}
        <div className="flex items-center bg-white/5 p-1" style={{ borderRadius: "999px", color: "var(--text-mid)" }}>
          <button
            onClick={() => { trigger("light"); setFontSize((f) => Math.max(12, f - 2)); }}
            className="te-knob flex items-center justify-center w-8 h-8 rounded-full"
          >
             <span className="text-[10px] font-bold">А-</span>
          </button>
          <div className="w-px h-4 bg-black/10 mx-1"></div>
          <button
            onClick={() => { trigger("light"); setFontSize((f) => Math.min(28, f + 2)); }}
            className="te-knob flex items-center justify-center w-8 h-8 rounded-full"
          >
             <span className="text-[14px] font-bold">А+</span>
          </button>
        </div>

        {/* Auto-scroll */}
        <div className="flex items-center bg-white/5 p-1" style={{ borderRadius: "999px", color: "var(--text-mid)" }}>
          <button
            onClick={() => handleScrollSpeed(-1)}
            className="te-knob flex items-center justify-center w-8 h-8 rounded-full opacity-60"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={handleScrollToggle}
            className={`te-knob flex items-center justify-center w-10 h-10 rounded-full mx-1 ${scrollSpeed > 0 ? "text-[var(--orange)] shadow-inner" : ""}`}
            style={{ 
               backgroundColor: scrollSpeed > 0 ? "var(--surface)" : undefined,
               boxShadow: scrollSpeed > 0 ? "inset 2px 2px 5px rgba(0,0,0,0.1), inset -2px -2px 5px rgba(255,255,255,0.7)" : undefined
            }}
          >
            {scrollSpeed > 0 ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-1" />}
          </button>
          <button
            onClick={() => handleScrollSpeed(1)}
            className="te-knob flex items-center justify-center w-8 h-8 rounded-full opacity-60"
          >
            <Plus size={12} />
          </button>
        </div>

      </div>
    </div>
  );
}
