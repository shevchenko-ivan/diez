"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { slugify } from "@/lib/slugify";
import { parseLyricsWithChords } from "../lib/parseLyrics";
import { classifySubmission } from "../lib/detectLang";

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
};

function readFields(formData: FormData): Fields {
  return {
    title: (formData.get("title") as string)?.trim() || "",
    artist: (formData.get("artist") as string)?.trim() || "",
    genre: (formData.get("genre") as string)?.trim() || "Інше",
    key: (formData.get("key") as string)?.trim() || "Am",
    difficulty: (formData.get("difficulty") as string) || "easy",
    lyricsRaw: (formData.get("lyrics_with_chords") as string)?.trim() || "",
  };
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

  const { status, ru } = decideOutcome(intent, actor.isAdmin, f.lyricsRaw);
  const parsed = parseLyricsWithChords(f.lyricsRaw);
  const admin = createAdminClient();

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
    .select("id, slug, submitted_by, primary_variant_id")
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
