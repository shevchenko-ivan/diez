"use client";

import { useState } from "react";
import { Save, User } from "lucide-react";
import { createArtist } from "@/features/artist/actions/admin";
import { slugify } from "@/lib/slugify";
import { TeButton } from "@/shared/components/TeButton";

const GENRES = ["Рок", "Поп-рок", "Поп", "Інді", "Фолк", "Реп", "Електронна", "Шансон", "Народна", "Інше"];

export function AddArtistForm() {
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const slugPreview = slugify(name);

  return (
    <form action={createArtist} className="space-y-6">
      {/* Photo preview */}
      <div className="flex items-center gap-6 mb-2">
        <div
          className="w-24 h-24 rounded-full te-inset flex-shrink-0 flex items-center justify-center overflow-hidden"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <User size={32} style={{ color: "var(--text-muted)" }} />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label htmlFor="add-artist-photo" className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            URL фото
          </label>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <input
              id="add-artist-photo"
              name="photo_url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              aria-describedby="add-artist-photo-help"
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
          <p id="add-artist-photo-help" className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Вставте URL зображення (Supabase Storage, Google Drive, тощо)
          </p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="add-artist-name" className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          Ім'я / Назва гурту *
        </label>
        <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
          <input
            id="add-artist-name"
            name="name"
            required
            aria-required="true"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Напр. Океан Ельзи"
            className="w-full bg-transparent outline-none text-sm font-medium"
            style={{ color: "var(--text)" }}
          />
        </div>
        {slugPreview && (
          <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
            slug: <span style={{ color: "var(--orange-text)" }}>{slugPreview}</span>
          </p>
        )}
      </div>

      {/* Genre */}
      <div className="space-y-2">
        <label htmlFor="add-artist-genre" className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          Жанр
        </label>
        <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
          <select
            id="add-artist-genre"
            name="genre"
            className="w-full bg-transparent outline-none text-sm font-medium"
            style={{ color: "var(--text)" }}
          >
            <option value="">— Обрати —</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <label htmlFor="add-artist-bio" className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          Коротко про виконавця
        </label>
        <div className="te-inset p-4" style={{ borderRadius: "1rem" }}>
          <textarea
            id="add-artist-bio"
            name="bio"
            rows={3}
            placeholder="Кілька речень про виконавця..."
            className="w-full bg-transparent outline-none text-sm font-medium resize-none"
            style={{ color: "var(--text)" }}
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <TeButton shape="pill" type="submit" icon={Save} iconSize={16} className="px-8 py-4 flex items-center gap-3 text-sm font-bold tracking-widest">
          ЗБЕРЕГТИ
        </TeButton>
      </div>
    </form>
  );
}
