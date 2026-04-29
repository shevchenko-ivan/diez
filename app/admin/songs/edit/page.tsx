export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { FormField } from "@/shared/components/FormField";
import { Save, Star, Trash2 } from "lucide-react";
import { BackButton } from "@/shared/components/BackButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateSongFull, setPrimaryVariant, deleteVariant } from "@/features/song/actions/admin";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { VariantTabs } from "./VariantTabs";
import { TeButton } from "@/shared/components/TeButton";
import { StrumPatternsEditor } from "@/features/song/components/StrumPatternsEditor";
import { mapPatternRow } from "@/features/song/services/songs";
import type { StrumPattern } from "@/features/song/types";
import { StringAutocomplete } from "./StringAutocomplete";
import { AlbumAutocomplete } from "./AlbumAutocomplete";
import { Suspense } from "react";
import { SavedToast } from "@/shared/components/SavedToast";

export const metadata = { title: "Редагувати пісню — Diez" };

// Matches standalone chord tokens: Am, C#m7, Bbmaj7, F/C, Cmaj7#11, C7b9, etc.
// Whitelist of qualities mirrors features/song/lib/parseLyrics.ts — keep in sync.
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
const CHORD_TOKEN_RE = new RegExp(
  `^[A-H][b#]?(${CHORD_QUALITIES})?(\\/[A-H][b#]?)?$`,
);

function isChordOnlyLine(text: string): boolean {
  const tokens = text.trim().split(/\s+/);
  return tokens.length > 0 && tokens.every((t) => CHORD_TOKEN_RE.test(t));
}

// Serialize word-aligned chords as UG-style: chord line above lyric line,
// with chords padded to align above their word.
function serializeWordAligned(words: string[], chords: string[]): string {
  // Build the lyric line and track each word's column position
  const lyricLine = words.join(" ");
  const wordCols: number[] = [];
  let col = 0;
  for (let j = 0; j < words.length; j++) {
    wordCols.push(col);
    col += words[j].length + 1; // +1 for space
  }

  // Build chord line with spaces so each chord sits above its word
  let chordLine = "";
  for (let j = 0; j < chords.length; j++) {
    if (!chords[j]) continue;
    const targetCol = wordCols[j] ?? chordLine.length;
    while (chordLine.length < targetCol) chordLine += " ";
    chordLine += chords[j];
  }

  return chordLine.trimEnd() + "\n" + lyricLine;
}

function serializeSections(data: unknown): string {
  // New format: { raw, sections } — return raw text as-is
  if (data && typeof data === "object" && "raw" in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).raw as string;
  }

  // Legacy: SongSection[] — reconstruct from parsed data
  const sections = data;
  if (!Array.isArray(sections)) return "";
  return (sections as { label: string; lines: { chords: string[]; lyrics: string }[] }[])
    .map((section) => {
      const header = section.label ? `${section.label}:\n` : "";
      const lines = section.lines
        .map((line) => {
          const words = line.lyrics ? line.lyrics.split(/\s+/) : [];
          const chords = line.chords ?? [];
          const hasChords = chords.some((c) => c);

          // Chord-only line (no lyrics)
          if (words.length === 0 && chords.length > 0) {
            return chords.join("  ");
          }

          // Word-aligned: render as two lines (chord line + lyric line)
          if (hasChords && chords.length === words.length) {
            return serializeWordAligned(words, chords);
          }

          // Legacy: chords stored as lyrics text (bare chord names)
          if (line.lyrics && isChordOnlyLine(line.lyrics)) {
            return line.lyrics.trim();
          }

          // Lyrics only or legacy sequential chords
          if (hasChords) {
            const prefix = chords.filter(Boolean).map((c) => `[${c}]`).join("");
            return prefix + (line.lyrics ?? "");
          }

          return line.lyrics ?? "";
        })
        .join("\n");
      return header + lines;
    })
    .join("\n\n");
}

const GENRES = ["Рок", "Поп-рок", "Поп", "Інді", "Фолк", "Реп", "Електронна", "Шансон", "Народна", "Інше"];
const STATUSES = [
  { value: "published", label: "Опубліковано" },
  { value: "draft", label: "Чернетка" },
  { value: "archived", label: "В архіві" },
];

export default async function EditSongPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; from?: string; variant?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { id, from, variant: variantParam } = await searchParams;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_RE.test(id)) redirect("/admin/songs");

  const { data: song } = await admin
    .from("songs")
    .select("id, slug, title, artist, album, genre, time_signature, difficulty, status, cover_image, cover_color, youtube_id, primary_variant_id")
    .eq("id", id)
    .single();

  if (!song) redirect("/admin/songs");

  const { data: metaRows } = await admin
    .from("songs")
    .select("artist, album");
  const artistSuggestions = Array.from(
    new Set((metaRows ?? []).map((r) => (r.artist as string)?.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "uk"));
  const albumPairs = ((metaRows ?? []) as Array<{ artist: string | null; album: string | null }>)
    .map((r) => ({ artist: (r.artist ?? "").trim(), album: (r.album ?? "").trim() }))
    .filter((p) => p.artist && p.album);

  const { data: variants } = await admin
    .from("song_variants")
    .select("id, label, created_at, views, key, capo, sections")
    .eq("song_id", song.id)
    .order("created_at", { ascending: true });

  const primaryVariantId = (song.primary_variant_id as string | null) ?? null;
  const allVariants = (variants ?? []) as Array<{
    id: string;
    label: string;
    created_at: string;
    views: number | null;
    key: string;
    capo: number | null;
    sections: unknown;
  }>;

  const requested =
    variantParam && UUID_RE.test(variantParam)
      ? allVariants.find((v) => v.id === variantParam)
      : null;
  const activeVariant =
    requested ??
    allVariants.find((v) => v.id === primaryVariantId) ??
    allVariants[0];

  const isActivePrimary = activeVariant ? activeVariant.id === primaryVariantId : false;

  // Rich strumming patterns (per-song, not per-variant — see migration 019).
  const { data: patternRows } = await admin
    .from("song_strumming_patterns")
    .select("id, position, name, tempo, note_length, strokes")
    .eq("song_id", song.id)
    .order("position", { ascending: true });
  const strumPatterns: StrumPattern[] = (patternRows ?? []).map((r) =>
    mapPatternRow(r as Record<string, unknown>),
  );

  return (
    <PageShell maxWidth="2xl" footer={false}>
      <Suspense><SavedToast /></Suspense>
      <div className="mb-8">
        <BackButton fallback="/admin/songs" />
      </div>

      <h1 className="text-3xl font-bold mb-1 uppercase tracking-tighter px-2" style={{ color: "var(--text)" }}>
        Редагувати пісню
      </h1>
      <p className="text-xs font-mono opacity-40 mb-6 px-2" style={{ color: "var(--text-muted)" }}>
        slug: {song.slug}
      </p>

      {/* Mini-forms for variant-level side-actions (set primary / delete).
          Kept separate so the main form's inputs don't get submitted with them. */}
      {activeVariant && !isActivePrimary && (
        <>
          <form id="variant-primary-form" action={setPrimaryVariant} className="hidden">
            <input type="hidden" name="songId" value={song.id} />
            <input type="hidden" name="variantId" value={activeVariant.id} />
          </form>
          <form id="variant-delete-form" action={deleteVariant} className="hidden">
            <input type="hidden" name="variantId" value={activeVariant.id} />
          </form>
        </>
      )}

      {activeVariant ? (
        <form action={updateSongFull} className="space-y-6 mb-8">
          <input type="hidden" name="songId" value={song.id} />
          <input type="hidden" name="variantId" value={activeVariant.id} />
          <input
            type="hidden"
            name="returnTo"
            value={
              from === "song"
                ? `/songs/${song.slug}`
                : `/admin/songs/edit?id=${song.id}&variant=${activeVariant.id}`
            }
          />

          {/* ── Мета пісні ──────────────────────────────────────────────── */}
          <div className="te-surface p-5 md:p-6" style={{ borderRadius: "2rem" }}>
            <h2 className="text-lg font-bold mb-6 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
              Мета пісні
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Назва *">
                  <input name="title" required defaultValue={song.title} className="field-input" style={{ color: "var(--text)" }} />
                </FormField>
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                    Виконавець *
                  </label>
                  <StringAutocomplete name="artist" defaultValue={song.artist} suggestions={artistSuggestions} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                  Альбом
                </label>
                <AlbumAutocomplete name="album" defaultValue={song.album ?? ""} pairs={albumPairs} placeholder="Назва альбому" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Жанр">
                  <select name="genre" defaultValue={song.genre ?? ""} className="field-input" style={{ color: "var(--text)" }}>
                    <option value="">— Обрати —</option>
                    {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </FormField>
                <input type="hidden" name="difficulty" value={song.difficulty ?? "easy"} />
                <FormField label="Статус">
                  <select name="status" defaultValue={song.status ?? "draft"} className="field-input" style={{ color: "var(--text)" }}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </FormField>
                {/* Розмір прибрано — час такту визначає сам ритм
                    (note_length × кількість ударів у патерні). */}
              </div>

              <FormField label="URL обкладинки">
                <input name="cover_image" defaultValue={song.cover_image ?? ""} placeholder="https://..." className="field-input" style={{ color: "var(--text)" }} />
              </FormField>

              <FormField label="Пісня на YouTube (для плеєра)">
                <input
                  name="youtube_id"
                  defaultValue={song.youtube_id ?? ""}
                  placeholder="https://youtu.be/... або dQw4w9WgXcQ"
                  className="field-input"
                  style={{ color: "var(--text)" }}
                />
              </FormField>
            </div>
          </div>

          {/* ── Variant tabs ──────────────────────────────────────────── */}
          {allVariants.length > 0 && (
            <VariantTabs
              songId={song.id}
              activeVariantId={activeVariant.id}
              primaryVariantId={primaryVariantId}
              variants={allVariants.map((v) => ({ id: v.id, label: v.label }))}
              basePath="/admin/songs/edit"
              fromParam={from}
            />
          )}

          {/* ── Variant label + side actions (non-primary only) ───────── */}
          {isActivePrimary ? (
            <input type="hidden" name="label" value={activeVariant.label} />
          ) : (
            <div className="te-surface p-6" style={{ borderRadius: "1.5rem" }}>
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <FormField label="Назва варіанту">
                    <input name="label" defaultValue={activeVariant.label} className="field-input" style={{ color: "var(--text)" }} />
                  </FormField>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 pb-1.5">
                  <button
                    type="submit"
                    form="variant-primary-form"
                    className="te-pressable px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                    style={{ borderRadius: "0.75rem", color: "var(--orange)" }}
                    title="Зробити основним"
                  >
                    <Star size={12} />
                    Зробити основним
                  </button>
                  <button
                    type="submit"
                    form="variant-delete-form"
                    className="te-pressable px-2.5 py-1.5 text-xs font-bold"
                    style={{ borderRadius: "0.75rem", color: "var(--danger, #e46060)" }}
                    title="Видалити варіант"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Бій (multi-pattern editor — per song, not per variant) ── */}
          <div className="te-surface p-5 md:p-6" style={{ borderRadius: "2rem" }}>
            <StrumPatternsEditor songId={song.id} initial={strumPatterns} />
          </div>

          {/* ── Текст з акордами + один сабміт ───────────────────────── */}
          <div className="te-surface p-5 md:p-6" style={{ borderRadius: "2rem" }}>
            <h2 className="text-lg font-bold mb-6 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
              Текст з акордами
            </h2>
            <div className="te-inset p-4" style={{ borderRadius: "1rem" }}>
              <AutoResizeTextarea
                name="lyrics_with_chords"
                defaultValue={serializeSections(activeVariant.sections)}
                placeholder={"Куплет 1:\n[Am]Слова пісні [C]тут\n[G]Наступний рядок\n\nПриспів:\n[F]Приспів тут"}
                className="field-input w-full resize-none font-mono text-xs leading-relaxed"
                style={{ color: "var(--text)" }}
              />
            </div>
            <div className="pt-6 flex justify-end">
              <TeButton shape="pill" type="submit" className="px-8 py-4 flex items-center gap-3 text-sm font-bold tracking-widest">
                <Save size={16} />
                ЗБЕРЕГТИ
              </TeButton>
            </div>
          </div>
        </form>
      ) : null}

    </PageShell>
  );
}
