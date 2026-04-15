"use client";

import { useState, useRef } from "react";
import { Save } from "lucide-react";
import { createSong } from "@/features/song/actions/admin";
import { slugify } from "@/lib/slugify";
import type { Artist } from "@/features/artist/services/artists";

const KEYS = ["C","Cm","C#","C#m","D","Dm","D#","D#m","E","Em","F","Fm","F#","F#m","G","Gm","G#","G#m","A","Am","A#","A#m","B","Bm"];

interface Props {
  artists?: Artist[];
}

export function AddSongForm({ artists = [] }: Props) {
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");        // what user types
  const [selected, setSelected] = useState("");  // confirmed artist name
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const slugPreview = slugify(title);

  const suggestions = input.trim().length > 0
    ? artists.filter((a) => a.name.toLowerCase().includes(input.toLowerCase())).slice(0, 8)
    : [];

  function pick(name: string) {
    setSelected(name);
    setInput(name);
    setShowSuggestions(false);
  }

  function handleInput(val: string) {
    setInput(val);
    setSelected("");           // clear confirmed selection when typing
    setShowSuggestions(true);
  }

  function handleBlur() {
    // small delay so click on suggestion fires first
    setTimeout(() => setShowSuggestions(false), 150);
  }

  const finalArtist = selected || input;

  return (
    <form action={createSong} className="space-y-8">
      <input type="hidden" name="artist" value={finalArtist} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>
            Назва пісні *
          </label>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Напр. Без бою"
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
          {slugPreview && (
            <p className="ml-1 text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
              slug: <span style={{ color: "var(--orange)" }}>{slugPreview}</span>
            </p>
          )}
        </div>

        {/* Artist autocomplete */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>
            Виконавець *
          </label>
          <div className="relative">
            <div className="te-inset px-4 py-3 flex items-center gap-2" style={{ borderRadius: "1rem" }}>
              {selected && artists.find(a => a.name === selected)?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artists.find(a => a.name === selected)!.photo_url!}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                />
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                onFocus={() => input.trim() && setShowSuggestions(true)}
                onBlur={handleBlur}
                placeholder="Напр. Океан Ельзи"
                className="w-full bg-transparent outline-none text-sm font-medium"
                style={{ color: "var(--text)" }}
                autoComplete="off"
              />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 te-surface overflow-hidden"
                style={{ borderRadius: "1rem", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
              >
                {suggestions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onMouseDown={() => pick(a.name)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                    style={{ color: "var(--text)" }}
                  >
                    {a.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.photo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full te-inset flex-shrink-0" />
                    )}
                    <span>{a.name}</span>
                    {a.genre && (
                      <span className="ml-auto text-xs opacity-40">{a.genre}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Жанр</label>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <select
              name="genre"
              defaultValue="Рок"
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              <option value="Рок">Рок</option>
              <option value="Поп-рок">Поп-рок</option>
              <option value="Поп">Поп</option>
              <option value="Інді">Інді</option>
              <option value="Фолк">Фолк</option>
              <option value="Шансон">Шансон</option>
              <option value="Інше">Інше</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Тональність</label>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <select
              name="key"
              defaultValue="Am"
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              {KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Складність</label>
        <div className="flex gap-4 flex-wrap">
          <label className="te-key flex-1 flex items-center justify-center gap-2 px-6 py-4 cursor-pointer min-w-[120px]">
            <input type="radio" name="difficulty" value="easy" defaultChecked className="accent-orange-500" />
            <span className="text-sm font-bold">Легка</span>
          </label>
          <label className="te-key flex-1 flex items-center justify-center gap-2 px-6 py-4 cursor-pointer min-w-[120px]">
            <input type="radio" name="difficulty" value="medium" className="accent-orange-500" />
            <span className="text-sm font-bold">Середня</span>
          </label>
          <label className="te-key flex-1 flex items-center justify-center gap-2 px-6 py-4 cursor-pointer min-w-[120px]">
            <input type="radio" name="difficulty" value="hard" className="accent-orange-500" />
            <span className="text-sm font-bold">Складна</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-bold tracking-widest uppercase ml-1 flex items-baseline justify-between"
          style={{ color: "var(--text-muted)" }}
        >
          <span>Текст і акорди *</span>
          <span className="hidden sm:inline text-[10px] opacity-70 normal-case tracking-normal">
            Акорди в дужках [Am]. Секції розділяйте порожнім рядком. Назва секції з двокрапкою: &quot;Приспів:&quot;
          </span>
        </label>
        <div className="te-inset p-4" style={{ borderRadius: "1.5rem" }}>
          <textarea
            name="lyrics_with_chords"
            required
            rows={12}
            placeholder={`Куплет 1:\n[Am]Вставай, мила [C]моя, вставай\n[G]Більшого вимагай\n\nПриспів:\n[F]Ти моя, [C]моя земля\n[G]Ти моє тепле [Am]вогнище`}
            className="w-full bg-transparent outline-none text-sm font-medium min-h-[200px] resize-y font-mono leading-relaxed"
            style={{ color: "var(--text)" }}
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={!finalArtist.trim()}
          className="te-btn-orange px-8 py-4 flex items-center gap-3 text-sm font-bold tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={16} /> ОПУБЛІКУВАТИ
        </button>
      </div>
    </form>
  );
}
