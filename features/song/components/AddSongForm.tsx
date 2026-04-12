"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { createSong } from "@/features/song/actions/admin";
import { slugify } from "@/lib/slugify";
import type { Artist } from "@/features/artist/services/artists";

const KEYS = ["C","Cm","C#","C#m","D","Dm","Eb","Ebm","E","Em","F","Fm","F#","F#m","G","Gm","Ab","Abm","A","Am","Bb","Bbm","B","Bm"];

interface Props {
  artists?: Artist[];
}

export function AddSongForm({ artists = [] }: Props) {
  const [title, setTitle] = useState("");
  const [artistValue, setArtistValue] = useState("");
  const [customArtist, setCustomArtist] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const slugPreview = slugify(title);
  const isCustom = artistValue === "__custom__";
  const finalArtist = isCustom ? customArtist : artistValue;

  const filtered = search.trim()
    ? artists.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : artists;

  const selectedArtist = artists.find((a) => a.name === artistValue);

  return (
    <form action={createSong} className="space-y-8">
      {/* Hidden field with final artist value */}
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

        {/* Artist */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>
            Виконавець *
          </label>

          {artists.length > 0 ? (
            <div className="space-y-2">
              {/* Selected state — shows chip, click to change */}
              {artistValue && !open ? (
                <button
                  type="button"
                  onClick={() => { setOpen(true); setSearch(""); }}
                  className="w-full te-inset px-4 py-3 flex items-center gap-3 text-left"
                  style={{ borderRadius: "1rem" }}
                >
                  {selectedArtist?.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedArtist.photo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium flex-1" style={{ color: "var(--text)" }}>
                    {isCustom ? customArtist : artistValue}
                  </span>
                  <span className="text-xs opacity-40" style={{ color: "var(--text-muted)" }}>змінити</span>
                </button>
              ) : (
                /* Dropdown */
                <div className="te-inset" style={{ borderRadius: "1rem", overflow: "hidden" }}>
                  <div className="px-4 pt-3 pb-1">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Пошук виконавця..."
                      autoFocus
                      className="w-full bg-transparent outline-none text-sm"
                      style={{ color: "var(--text)" }}
                    />
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: "11rem" }}>
                    {filtered.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setArtistValue(a.name); setOpen(false); setSearch(""); }}
                        className="w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
                        style={{ color: "var(--text)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {a.photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.photo_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        )}
                        {a.name}
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="px-4 py-2 text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
                        Не знайдено
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => { setArtistValue("__custom__"); setOpen(false); setSearch(""); }}
                      className="w-full text-left px-4 py-2 text-sm font-medium border-t"
                      style={{ borderColor: "rgba(0,0,0,0.06)", color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      + Інший виконавець
                    </button>
                  </div>
                </div>
              )}

              {/* Custom artist text input */}
              {isCustom && !open && (
                <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
                  <input
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    placeholder="Введіть ім'я виконавця"
                    className="w-full bg-transparent outline-none text-sm font-medium"
                    style={{ color: "var(--text)" }}
                    autoFocus
                  />
                </div>
              )}
            </div>
          ) : (
            /* Fallback: plain text input if no artists in DB */
            <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
              <input
                value={finalArtist}
                onChange={(e) => setArtistValue(e.target.value)}
                required
                placeholder="Напр. Океан Ельзи"
                className="w-full bg-transparent outline-none text-sm font-medium"
                style={{ color: "var(--text)" }}
              />
            </div>
          )}
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
