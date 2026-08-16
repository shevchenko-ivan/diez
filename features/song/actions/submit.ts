"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { slugify } from "@/lib/slugify";
import { parseLyricsWithChords } from "../lib/parseLyrics";
import { classifySubmission } from "../lib/detectLang";
import { extractYoutubeId } from "../lib/youtube";
import { matchArtist } from "@/features/artist/lib/match";

export type SubmitStatus = "published" | "pending" | "draft";

export type SubmitResult =
  | { ok: true; status: SubmitStatus; slug: string; songId: string; ru?: boolean }
  | { ok: false; reason: "auth" | "blocked" | "validation" | "error"; message: string };

/**
 * User-facing song submission & editing (distinct from the admin `createSong`).
 *
 * Status model:
 * - Admins always publish directly (trusted authors).
 * - Regular users never auto-publish: "submit" → `pending` review queue.
 * - "draft" (Зберегти чернеткою) → `draft`, visible only to the author on their
 *   profile, never in the catalogue or the admin queue.
 * - Russian lyrics from a regular user are NOT hard-rejected anymore: the song
 *   is saved as a `draft` and the result carries `ru: true` so the form can warn
 *   the author that it won't be published (they can fix the text or delete it).
 *
 * Writes use the service-role client because songs RLS only allows the service
 * role to write — the trust boundary is these server actions, which authenticate
 * the user and control the resulting status.
 */

type Actor = { userId: string; isAdmin: boolean; isBlocked: boolean };

async function resolveActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // `is_blocked` is added by migration 026 — tolerate its absence so the core
  // flow works before the migration is applied (fall back to is_admin only).
  let isAdmin = false;
  let isBlocked = false;
  const full = await supabase.from("profiles").select("is_admin, is_blocked").eq("id", user.id).single();
  if (full.error) {
    const fallback = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    isAdmin = !!fallback.data?.is_admin;
  } else {
    isAdmin = !!full.data?.is_admin;
    isBlocked = !!(full.data as { is_blocked?: boolean })?.is_blocked;
  }
  return { userId: user.id, isAdmin, isBlocked };
}

type Fields = {
  title: string;
  artist: string;
  genre: string;
  key: string;
  difficulty: string;
  lyricsRaw: string;
  youtubeRaw: string;
};

function readFields(formData: FormData): Fields {
  return {
    title: (formData.get("title") as string)?.trim() || "",
    artist: (formData.get("artist") as string)?.trim() || "",
    genre: (formData.get("genre") as string)?.trim() || "Інше",
    key: (formData.get("key") as string)?.trim() || "Am",
    difficulty: (formData.get("difficulty") as string) || "easy",
    lyricsRaw: (formData.get("lyrics_with_chords") as string)?.trim() || "",
    youtubeRaw: (formData.get("youtube") as string)?.trim() || "",
  };
}

// Cover upload limits — mirror the artist-photo rules (see features/artist/actions/submit.ts).
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const MIN_COVER_BYTES = 4 * 1024; // reject near-empty files
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validate + upload the song cover into the public `avatars` bucket under the
 * uploader's own folder (bucket RLS allows writes only there). Returns the
 * public URL, null when no file was attached, or a user-facing error string.
 */
async function uploadCover(
  formData: FormData,
  userId: string,
): Promise<{ url: string | null } | { error: string }> {
  const file = formData.get("cover") as File | null;
  if (!file || file.size === 0) return { url: null };
  if (!ALLOWED_COVER_TYPES.includes(file.type)) {
    return { error: "Обкладинка: підтримуються лише JPG, PNG або WebP." };
  }
  if (file.size > MAX_COVER_BYTES) {
    return { error: "Обкладинка завелика — максимум 5 МБ." };
  }
  if (file.size < MIN_COVER_BYTES) {
    return { error: "Обкладинка замала або пошкоджена. Завантажте якісніше зображення." };
  }
  const supabase = await createClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/cover-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadErr) {
    return { error: `Не вдалося завантажити обкладинку: ${uploadErr.message}` };
  }
  return { url: supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl };
}

function readIntent(formData: FormData): "submit" | "draft" {
  return (formData.get("intent") as string) === "draft" ? "draft" : "submit";
}

/**
 * Decide the resulting status and whether to flag Russian lyrics.
 *   admin + submit            → published
 *   user  + submit + russian  → draft (+ ru flag: "saved, won't publish")
 *   user  + submit + ok       → pending (review queue, never auto-publish)
 *   any   + draft             → draft (ru flag set if a user's text reads Russian)
 */
function decideOutcome(
  intent: "submit" | "draft",
  isAdmin: boolean,
  lyricsRaw: string,
): { status: SubmitStatus; ru: boolean } {
  const russian = !isAdmin && lyricsRaw.length > 0 && classifySubmission(lyricsRaw) === "reject";
  if (intent === "draft") return { status: "draft", ru: russian };
  if (isAdmin) return { status: "published", ru: false };
  if (russian) return { status: "draft", ru: true };
  return { status: "pending", ru: false };
}

const NOTE_LENGTHS = ["1/4", "1/8", "1/16", "1/4t", "1/8t", "1/16t"];

/** Parse the form's optional strumming-pattern payload into insertable rows. */
function parsePatternRows(raw: string | null, songId: string) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{
      name?: string; tempo?: number; noteLength?: string; strokes?: unknown[];
    }>;
    return (Array.isArray(parsed) ? parsed : [])
      .slice(0, 12)
      .filter((p) => Array.isArray(p.strokes) && p.strokes.length > 0)
      .map((p, i) => ({
        song_id: songId,
        position: i,
        name: (p.name || `Бій ${i + 1}`).slice(0, 60),
        tempo: Math.max(40, Math.min(240, Math.round(Number(p.tempo) || 100))),
        note_length: NOTE_LENGTHS.includes(p.noteLength ?? "") ? p.noteLength : "1/8",
        strokes: p.strokes,
      }));
  } catch {
    return []; // malformed payload — skip silently, song is still saved
  }
}

function revalidatePublished(slug: string) {
  revalidateTag("songs", "max");
  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/");
  revalidatePath(`/songs/${slug}`);
}

/**
 * Resolve a typed artist name to the canonical `artists.name` — case-, alphabet-
 * and alias-insensitive (see matchArtist). Songs must reference a real artist
 * row so the artist page (`.eq("artist", name)`) always finds them; storing the
 * canonical spelling is what makes that link work. Any status counts: a just-
 * created pending artist is still a valid target for its author's song.
 */
async function resolveCanonicalArtist(
  admin: ReturnType<typeof createAdminClient>,
  input: string,
): Promise<string | null> {
  if (!input) return null;
  // range() lifts the default 1000-row cap.
  const { data } = await admin.from("artists").select("name, aliases").range(0, 9999);
  return matchArtist(data ?? [], input)?.name ?? null;
}

/** Validate fields for the chosen intent. Draft only needs a title to anchor it. */
function validate(intent: "submit" | "draft", f: Fields): string | null {
  if (intent === "draft") {
    if (!f.title) return "Додайте хоча б назву, щоб зберегти чернетку.";
    return null;
  }
  if (!f.title || !f.artist || !f.lyricsRaw) {
    return "Заповніть назву, виконавця і текст з акордами.";
  }
  return null;
}

export async function submitSong(_prev: SubmitResult | null, formData: FormData): Promise<SubmitResult> {
  const actor = await resolveActor();
  if (!actor) return { ok: false, reason: "auth", message: "Щоб додати пісню, увійдіть у свій акаунт." };
  if (actor.isBlocked) return { ok: false, reason: "blocked", message: "Ваш акаунт обмежено в додаванні пісень." };

  const intent = readIntent(formData);
  const f = readFields(formData);
  const invalid = validate(intent, f);
  if (invalid) return { ok: false, reason: "validation", message: invalid };

  const youtube_id = extractYoutubeId(f.youtubeRaw);
  if (f.youtubeRaw && !youtube_id) {
    return { ok: false, reason: "validation", message: "Не вдалося розпізнати посилання на YouTube. Вставте лінк на відео, напр. https://www.youtube.com/watch?v=…" };
  }

  const admin = createAdminClient();

  // The song must point at a real artist row (canonical spelling) — otherwise
  // it never shows up on the artist page. Drafts are lenient: free text stays,
  // but if it already resolves we canonicalize early. Checked BEFORE the cover
  // upload so a validation error can't orphan a storage object.
  if (f.artist) {
    const canonical = await resolveCanonicalArtist(admin, f.artist);
    if (canonical) {
      f.artist = canonical;
    } else if (intent === "submit") {
      return {
        ok: false,
        reason: "validation",
        message: `Виконавця «${f.artist}» ще немає в каталозі. Оберіть його зі списку підказок або натисніть «Створити» в полі виконавця й додайте його фото.`,
      };
    }
  }

  const cover = await uploadCover(formData, actor.userId);
  if ("error" in cover) return { ok: false, reason: "validation", message: cover.error };
  // Cover is mandatory for user submissions; admins can skip it — their songs
  // get covers from the enrichment pipeline. Drafts can be saved without one.
  if (intent === "submit" && !actor.isAdmin && !cover.url) {
    return { ok: false, reason: "validation", message: "Додайте обкладинку пісні." };
  }

  const { status, ru } = decideOutcome(intent, actor.isAdmin, f.lyricsRaw);
  const parsed = parseLyricsWithChords(f.lyricsRaw);

  const baseSlug = slugify(f.title) || `song-${Date.now()}`;
  const { data: existing } = await admin.from("songs").select("slug").eq("slug", baseSlug).maybeSingle();
  const finalSlug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

  const { data: songRow, error: songErr } = await admin
    .from("songs")
    .insert({
      slug: finalSlug,
      title: f.title,
      artist: f.artist,
      genre: f.genre,
      key: f.key,
      difficulty: f.difficulty,
      chords: parsed.chords,
      sections: { raw: f.lyricsRaw, sections: parsed.sections },
      status,
      submitted_by: actor.userId,
      ...(cover.url ? { cover_image: cover.url } : {}),
      ...(youtube_id ? { youtube_id } : {}),
      ...(status === "published" ? { reviewed_by: actor.userId, reviewed_at: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();

  if (songErr || !songRow) {
    return { ok: false, reason: "error", message: `Не вдалося зберегти: ${songErr?.message ?? "невідома помилка"}` };
  }

  const { data: variantRow, error: varErr } = await admin
    .from("song_variants")
    .insert({
      song_id: songRow.id,
      label: "Основний",
      sections: { raw: f.lyricsRaw, sections: parsed.sections },
      chords: parsed.chords,
      key: f.key,
      status,
      author_id: actor.userId,
    })
    .select("id")
    .single();

  if (varErr || !variantRow) {
    // Roll back the orphan song so a failed variant can't leave a broken row.
    await admin.from("songs").delete().eq("id", songRow.id);
    return { ok: false, reason: "error", message: `Не вдалося зберегти варіант: ${varErr?.message ?? "невідома помилка"}` };
  }

  await admin.from("songs").update({ primary_variant_id: variantRow.id }).eq("id", songRow.id);

  const rows = parsePatternRows(formData.get("strumming_patterns") as string | null, songRow.id);
  if (rows.length > 0) await admin.from("song_strumming_patterns").insert(rows);

  if (status === "published") revalidatePublished(finalSlug);
  revalidatePath("/profile");

  return { ok: true, status, slug: finalSlug, songId: songRow.id, ru };
}

/**
 * Edit a song the current user submitted (or any song, for admins). Re-runs the
 * same status logic: a regular user re-submitting bumps the song back to
 * `pending`; saving as draft keeps it private; Russian text routes to draft.
 */
export async function updateMySubmission(
  songId: string,
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  const actor = await resolveActor();
  if (!actor) return { ok: false, reason: "auth", message: "Увійдіть, щоб редагувати пісню." };
  if (actor.isBlocked) return { ok: false, reason: "blocked", message: "Ваш акаунт обмежено." };

  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("id, slug, submitted_by, primary_variant_id, cover_image")
    .eq("id", songId)
    .single();
  if (!song) return { ok: false, reason: "error", message: "Пісню не знайдено." };
  if (song.submitted_by !== actor.userId && !actor.isAdmin) {
    return { ok: false, reason: "auth", message: "Ви можете редагувати лише власні пісні." };
  }

  const intent = readIntent(formData);
  const f = readFields(formData);
  const invalid = validate(intent, f);
  if (invalid) return { ok: false, reason: "validation", message: invalid };

  const youtube_id = extractYoutubeId(f.youtubeRaw);
  if (f.youtubeRaw && !youtube_id) {
    return { ok: false, reason: "validation", message: "Не вдалося розпізнати посилання на YouTube. Вставте лінк на відео, напр. https://www.youtube.com/watch?v=…" };
  }

  // Same artist gate as submitSong — canonicalize or reject before the upload.
  if (f.artist) {
    const canonical = await resolveCanonicalArtist(admin, f.artist);
    if (canonical) {
      f.artist = canonical;
    } else if (intent === "submit") {
      return {
        ok: false,
        reason: "validation",
        message: `Виконавця «${f.artist}» ще немає в каталозі. Оберіть його зі списку підказок або натисніть «Створити» в полі виконавця й додайте його фото.`,
      };
    }
  }

  // A newly attached file replaces the cover; otherwise the existing one stays.
  const cover = await uploadCover(formData, actor.userId);
  if ("error" in cover) return { ok: false, reason: "validation", message: cover.error };
  if (intent === "submit" && !actor.isAdmin && !cover.url && !song.cover_image) {
    return { ok: false, reason: "validation", message: "Додайте обкладинку пісні." };
  }

  const { status, ru } = decideOutcome(intent, actor.isAdmin, f.lyricsRaw);
  const parsed = parseLyricsWithChords(f.lyricsRaw);

  const { error: songErr } = await admin
    .from("songs")
    .update({
      title: f.title,
      artist: f.artist,
      genre: f.genre,
      key: f.key,
      difficulty: f.difficulty,
      chords: parsed.chords,
      sections: { raw: f.lyricsRaw, sections: parsed.sections },
      status,
      ...(cover.url ? { cover_image: cover.url } : {}),
      youtube_id,
      updated_at: new Date().toISOString(),
      ...(status === "published" ? { reviewed_by: actor.userId, reviewed_at: new Date().toISOString() } : {}),
    })
    .eq("id", songId);
  if (songErr) return { ok: false, reason: "error", message: `Не вдалося зберегти: ${songErr.message}` };

  if (song.primary_variant_id) {
    await admin
      .from("song_variants")
      .update({
        sections: { raw: f.lyricsRaw, sections: parsed.sections },
        chords: parsed.chords,
        key: f.key,
        status,
      })
      .eq("id", song.primary_variant_id);
  }

  // Replace strumming patterns wholesale — simplest correct sync for an edit.
  await admin.from("song_strumming_patterns").delete().eq("song_id", songId);
  const rows = parsePatternRows(formData.get("strumming_patterns") as string | null, songId);
  if (rows.length > 0) await admin.from("song_strumming_patterns").insert(rows);

  revalidatePublished(song.slug);
  revalidatePath("/profile");
  revalidatePath(`/profile/songs/${songId}/edit`);

  return { ok: true, status, slug: song.slug, songId, ru };
}

/** Delete a song the current user submitted (or any, for admins). */
export async function deleteMySubmission(songId: string): Promise<{ ok: boolean; message?: string }> {
  const actor = await resolveActor();
  if (!actor) return { ok: false, message: "Увійдіть, щоб видалити пісню." };

  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("submitted_by, slug, status")
    .eq("id", songId)
    .single();
  if (!song) return { ok: false, message: "Пісню не знайдено." };
  if (song.submitted_by !== actor.userId && !actor.isAdmin) {
    return { ok: false, message: "Ви можете видаляти лише власні пісні." };
  }

  const { error } = await admin.from("songs").delete().eq("id", songId);
  if (error) return { ok: false, message: `Не вдалося видалити: ${error.message}` };

  revalidatePath("/profile");
  if (song.status === "published") revalidatePublished(song.slug);
  return { ok: true };
}
