"use client";

import { useState, useEffect, useRef } from "react";
import { Song, SongSection } from "@/features/song/types";
import { useHaptics } from "@/shared/hooks/useHaptics";
import { Minus, Plus, Play, Square, ChevronUp, ChevronDown } from "lucide-react";

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

const LEDIndicatorKnob = ({ value, max, label, size = "md", icon: Icon }: { value: number; max: number; label: string; size?: "sm" | "md"; icon?: any }) => {
  const count = 16;
  const dots = Array.from({ length: count });
  const knobSize = size === "sm" ? "w-10 h-10" : "w-12 h-12";
  const ringSize = size === "sm" ? "w-20 h-20" : "w-24 h-24";
  const ringRadius = size === "sm" ? 34 : 42;

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${ringSize} flex items-center justify-center`}>
        {/* LED Track (Background) */}
        <div className="absolute inset-2 rounded-full border-[1px] border-black/5 shadow-inner opacity-50" />
        
        {/* LED Dots */}
        <div className="absolute inset-0">
          {dots.map((_, i) => {
            const angle = (i / count) * 360;
            const rotation = angle + 180; // Start at bottom center (180deg)
            const isActive = (value / max) * count > i;
            
            return (
              <div
                key={i}
                className={clsx(
                  "absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300",
                  isActive 
                    ? "bg-[rgb(255,136,0)] shadow-[0_0_8px_rgba(255,136,0,0.8),0_0_12px_rgba(255,136,0,0.4)] scale-110" 
                    : "bg-black/5 shadow-inner"
                )}
                style={{
                  transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(-${ringRadius}px)`,
                }}
              />
            );
          })}
        </div>

        {/* Main Knob Body */}
        <div className={clsx(
          "relative rounded-full te-knob flex items-center justify-center shadow-lg transition-transform active:scale-95",
          knobSize
        )}>
          {/* Physical indentation marker */}
          <div className="w-1.5 h-1.5 rounded-full bg-black/10 shadow-inner absolute top-1.5" />
          {/* Shine effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
          {Icon && <Icon size={12} className="opacity-40" />}
        </div>
      </div>
      <span className="te-label mt-2">{label}</span>
    </div>
  );
};

import { clsx } from "clsx";

export function SongViewer({ song }: { song: Song }) {
  const [transpose, setTranspose] = useState(0);
  const [fontSize, setFontSize] = useState(16); // Base size in px
  const [scrollSpeed, setScrollSpeed] = useState(0); // 0 = stopped, 1-5 = speed levels
  const { trigger } = useHaptics();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // --- Strumming Player Logic ---
  const [activeStrumIndex, setActiveStrumIndex] = useState(-1);
  const [isPlayingStrum, setIsPlayingStrum] = useState(false);
  
  // Use a ref for the audio context to ensure it survives re-renders and is initialized on user gesture
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    if (!isPlayingStrum || !song.strumming || !song.tempo || !audioContextRef.current) {
      setActiveStrumIndex(-1);
      return;
    }

    const audioCtx = audioContextRef.current;
    const intervalMs = (60 / song.tempo / 2) * 1000;
    let index = 0;

    const playTick = (hit: string) => {
      // Create components
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      
      const isDown = hit.startsWith("D");
      const isMute = hit.endsWith("x");
      
      // Sound design: Low pass filter for "thump", higher for "strum"
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(isMute ? 800 : (isDown ? 1200 : 2000), audioCtx.currentTime);
      
      osc.frequency.setValueAtTime(isMute ? 80 : (isDown ? 110 : 165), audioCtx.currentTime);
      osc.type = "triangle";
      
      const volume = isMute ? 0.15 : (isDown ? 0.4 : 0.3);
      const duration = isMute ? 0.04 : 0.12;

      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);

      // --- Enhanced Rhythmic Haptics ---
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        const vibDuration = isDown ? 35 : 20;
        navigator.vibrate(vibDuration);
      } else {
        trigger(isDown ? "medium" : "light");
      }
    };

    const timer = setInterval(() => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      
      const currentHit = song.strumming![index];
      setActiveStrumIndex(index);
      playTick(currentHit);
      index = (index + 1) % song.strumming!.length;
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [isPlayingStrum, song.strumming, song.tempo, trigger]);

  return (
    <div className="pb-32 max-w-4xl mx-auto px-4">
      {/* ── Strumming pattern (Studio Rack Style) ─────────────────────────── */}
      {song.strumming && (
        <div className="te-surface mb-8 rounded-[2rem] p-6 shadow-sm border border-black/5 bg-[#fbfbfb]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <span className="te-label mb-1">Pattern Engine</span>
              <h3 className="text-xl font-bold tracking-tight text-[var(--text)]">RHYTHM SECTION</h3>
            </div>
            {song.tempo && (
              <div className="flex gap-8 items-center">
                 <LEDIndicatorKnob 
                   value={song.tempo} 
                   max={250} 
                   label={`${song.tempo} BPM`}
                 />
                 <div className="te-socket p-1.5 rounded-full">
                    <button 
                      onClick={() => { trigger("medium"); initAudio(); setIsPlayingStrum(!isPlayingStrum); }}
                      className="te-knob w-10 h-10 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      {isPlayingStrum ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                    </button>
                 </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 te-socket p-4 rounded-2xl overflow-x-auto no-scrollbar bg-[#f0f0f0]">
            {song.strumming.map((hit, i) => {
              const isDown = hit.startsWith("D");
              const isMute = hit.endsWith("x");
              const isActive = activeStrumIndex === i;
              return (
                <div key={i} className="flex flex-col items-center gap-3 flex-shrink-0">
                  <div
                    className="te-key w-10 h-14 flex items-center justify-center text-xl"
                    style={{
                      color: isDown ? "var(--orange)" : "var(--text)",
                      opacity: isMute ? 0.5 : 1,
                      transform: isActive ? "translateY(2px)" : "none",
                      boxShadow: isActive ? "var(--sh-physical-pressed)" : "var(--sh-physical)"
                    }}
                  >
                    {isDown ? "↓" : "↑"}
                  </div>
                  <div className={`te-led ${isActive ? "te-led-active" : ""}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Dashboard Controls ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {/* Transpose Module */}
        <div className="te-surface rounded-[2rem] p-6 flex flex-col items-center justify-between min-h-[160px]">
          <span className="te-label mb-4">Pitch Transpose</span>
          <div className="flex items-center gap-6">
            <div className="te-control-pill">
              <button onClick={() => setTranspose(prev => prev - 1)} className="te-control-pill-btn">
                <Minus size={18} />
              </button>
              <button onClick={() => setTranspose(prev => prev + 1)} className="te-control-pill-btn">
                <Plus size={18} />
              </button>
            </div>
            <div className="text-3xl font-bold font-mono tracking-tighter w-14 text-center">
              {transpose > 0 ? `+${transpose}` : transpose}
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {[-2, -1, 0, 1, 2].map(v => (
              <div key={v} className={`w-1.5 h-1.5 rounded-full ${transpose === v ? "bg-[var(--accent)] shadow-[0_0_5px_var(--accent)]" : "bg-black/10"}`} />
            ))}
          </div>
        </div>

        {/* Font Size Module */}
        <div className="te-surface rounded-[2rem] p-6 flex flex-col items-center justify-between">
          <span className="te-label mb-4">Display Scale</span>
          <div className="flex items-center gap-6">
            <div className="te-control-pill">
              <button onClick={() => setFontSize(prev => Math.max(12, prev - 2))} className="te-control-pill-btn">
                <Minus size={18} />
              </button>
              <button onClick={() => setFontSize(prev => Math.min(28, prev + 2))} className="te-control-pill-btn">
                <Plus size={18} />
              </button>
            </div>
            <div className="text-3xl font-bold font-mono tracking-tighter w-14 text-center">
              {fontSize}
            </div>
          </div>
          <span className="te-label mt-4 opacity-50">Pixels</span>
        </div>

        {/* Auto Scroll Module */}
        <div className="te-surface rounded-[2rem] p-6 flex flex-col items-center justify-between">
          <span className="te-label mb-4">Motor Drive</span>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-center">
                <LEDIndicatorKnob 
                  value={scrollSpeed} 
                  max={5} 
                  label="Speed"
                />
                <div className="te-control-pill scale-75 mt-2">
                  <button onClick={() => handleScrollSpeed(-1)} className="te-control-pill-btn">
                    <Minus size={18} />
                  </button>
                  <button onClick={() => handleScrollSpeed(1)} className="te-control-pill-btn">
                    <Plus size={18} />
                  </button>
                </div>
             </div>
             <div className="h-12 w-[1px] bg-black/5 mx-2" />
             <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={handleScrollToggle}
                  className={`te-key w-12 h-12 ${scrollSpeed > 0 ? "shadow-inner bg-orange-50" : ""}`}
                >
                  {scrollSpeed > 0 ? <Square size={16} className="text-[var(--orange)]" fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <div className={`te-led ${scrollSpeed > 0 ? "te-led-active" : ""}`} />
             </div>
          </div>
        </div>
      </div>

      {/* ── Lyrics Content ──────────────────────────────────────────────── */}
      <div className="space-y-8">
        {song.sections.map((section: SongSection) => (
          <div key={section.label} className="te-surface rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
             <div className="bg-[#f0f0f0] border-b border-black/5 px-6 py-3 flex items-center justify-between">
                <span className="te-label opacity-70">{section.label}</span>
                <div className="flex gap-1">
                  {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-black/10" />)}
                </div>
             </div>
             <div className="px-8 py-8 space-y-8">
               {section.lines.map((line, i) => {
                 const words = line.lyrics.split(" ");
                 return (
                   <div key={i}>
                     <div className="flex gap-0 mb-1 min-h-[1.5rem]" style={{ flexWrap: "nowrap" }}>
                       {words.map((word, j) => {
                         const chord = line.chords[j] || "";
                         const trChord = transposeChord(chord, transpose);
                         return (
                           <div key={j} className="relative" style={{ marginRight: "0.5rem" }}>
                             {trChord && (
                               <span
                                 className="font-mono absolute font-bold"
                                 style={{
                                   top: `-${fontSize * 0.8}px`,
                                   left: 0,
                                   fontSize: `${fontSize * 0.75}px`,
                                   color: "var(--orange)",
                                   letterSpacing: "-0.02em",
                                 }}
                               >
                                 {trChord}
                               </span>
                             )}
                           </div>
                         );
                       })}
                     </div>
                     <p
                       style={{
                         fontSize: `${fontSize}px`,
                         lineHeight: 1.5,
                         color: "var(--text)",
                         fontWeight: 450,
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
    </div>
  );
}
