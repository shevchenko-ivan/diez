export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { FormField } from "@/shared/components/FormField";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateSong } from "@/features/song/actions/admin";

export const metadata = { title: "Редагувати пісню — Diez" };

const GENRES = ["Рок", "Поп-рок", "Поп", "Інді", "Фолк", "Реп", "Електронна", "Шансон", "Народна", "Інше"];
const KEYS = ["Am", "Em", "Dm", "Gm", "Cm", "Fm", "Bm", "C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab"];
const DIFFICULTIES = [
  { value: "easy", label: "Легка" },
  { value: "medium", label: "Середня" },
  { value: "hard", label: "Складна" },
];
const STATUSES = [
  { value: "published", label: "Опубліковано" },
  { value: "draft", label: "Чернетка" },
  { value: "archived", label: "В архіві" },
];

export default async function EditSongPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { id } = await searchParams;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_RE.test(id)) redirect("/admin/songs");

  const { data: song } = await admin
    .from("songs")
    .select("id, slug, title, artist, album, genre, key, capo, tempo, difficulty, status, cover_image, cover_color, youtube_id")
    .eq("id", id)
    .single();

  if (!song) redirect("/admin/songs");

  return (
    <PageShell maxWidth="2xl" footer={false}>
      <Link href="/admin/songs" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
        <ArrowLeft size={14} /> Пісні
      </Link>

      <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
        <h1 className="text-3xl font-bold mb-1 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          Редагувати пісню
        </h1>
        <p className="text-xs font-mono opacity-40 mb-10" style={{ color: "var(--text-muted)" }}>
          slug: {song.slug}
        </p>

        <form action={updateSong} className="space-y-6">
          <input type="hidden" name="songId" value={song.id} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Назва *">
              <input name="title" required defaultValue={song.title} className="field-input" style={{ color: "var(--text)" }} />
            </FormField>
            <FormField label="Виконавець *">
              <input name="artist" required defaultValue={song.artist} className="field-input" style={{ color: "var(--text)" }} />
            </FormField>
          </div>

          <FormField label="Альбом">
            <input name="album" defaultValue={song.album ?? ""} placeholder="Назва альбому" className="field-input" style={{ color: "var(--text)" }} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Жанр">
              <select name="genre" defaultValue={song.genre ?? ""} className="field-input" style={{ color: "var(--text)" }}>
                <option value="">— Обрати —</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>
            <FormField label="Тональність">
              <select name="key" defaultValue={song.key ?? ""} className="field-input" style={{ color: "var(--text)" }}>
                <option value="">— Обрати —</option>
                {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Капо (лад)">
              <input name="capo" type="number" min={0} max={12} defaultValue={song.capo ?? ""} placeholder="0" className="field-input" style={{ color: "var(--text)" }} />
            </FormField>
            <FormField label="Темп (BPM)">
              <input name="tempo" type="number" min={40} max={300} defaultValue={song.tempo ?? ""} placeholder="120" className="field-input" style={{ color: "var(--text)" }} />
            </FormField>
            <FormField label="Складність">
              <select name="difficulty" defaultValue={song.difficulty ?? "easy"} className="field-input" style={{ color: "var(--text)" }}>
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </FormField>
            <FormField label="Статус">
              <select name="status" defaultValue={song.status ?? "draft"} className="field-input" style={{ color: "var(--text)" }}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="URL обкладинки">
            <input name="cover_image" defaultValue={song.cover_image ?? ""} placeholder="https://..." className="field-input" style={{ color: "var(--text)" }} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Колір обкладинки (hex)">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  defaultValue={song.cover_color ?? "#888888"}
                  onChange={undefined}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                  id="cover_color_picker"
                />
                <input
                  name="cover_color"
                  id="cover_color"
                  defaultValue={song.cover_color ?? ""}
                  placeholder="#C8D5E8"
                  className="field-input flex-1"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </FormField>
            <FormField label="YouTube ID">
              <input name="youtube_id" defaultValue={song.youtube_id ?? ""} placeholder="dQw4w9WgXcQ" className="field-input" style={{ color: "var(--text)" }} />
            </FormField>
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" className="te-btn-orange px-8 py-4 flex items-center gap-3 text-sm font-bold tracking-widest">
              <Save size={16} /> ЗБЕРЕГТИ
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
