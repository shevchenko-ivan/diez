"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { slugify } from "@/lib/slugify";
import { parseLyricsWithChords } from "../lib/parseLyrics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string | null | undefined, label = "ID"): string {
  if (!value || !UUID_RE.test(value)) throw new Error(`Невалідний ${label}`);
  return value;
}

const STRUM_VALUES = new Set(["D", "U", "Dx", "Ux"]);

function parseStrumming(value: string | null | undefined): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const clean = parsed.filter((s): s is string => typeof s === "string" && STRUM_VALUES.has(s));
    return clean.length > 0 ? clean : null;
  } catch {
    return null;
  }
}

function sanitizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("https://") && !value.startsWith("http://")) return null;
  return value;
}

// Extract an 11-char YouTube video ID from any of:
// - bare ID                               (LIqeDVeWeHY)
// - https://youtu.be/LIqeDVeWeHY?si=...
// - https://www.youtube.com/watch?v=LIqeDVeWeHY&...
// - https://www.youtube.com/embed/LIqeDVeWeHY
// - https://www.youtube.com/shorts/LIqeDVeWeHY
// Returns null if nothing looks like a YouTube ID.
function extractYoutubeId(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  // Bare ID — 11 chars of [A-Za-z0-9_-]
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  // Try to pull from a URL
  const m =
    v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Не авторизовано");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Тільки для адміністраторів");
  return user.id;
}


// ─── Create song ──────────────────────────────────────────────────────────────

export async function createSong(formData: FormData) {
  const adminId = await requireAdmin();

  const title = (formData.get("title") as string)?.trim();
  const artist = (formData.get("artist") as string)?.trim();
  const genre = (formData.get("genre") as string)?.trim() || "Інше";
  const key = (formData.get("key") as string)?.trim() || "Am";
  const difficulty = (formData.get("difficulty") as string) || "easy";
  const tempo = formData.get("tempo") ? Number(formData.get("tempo")) : null;
  const time_signature = (formData.get("time_signature") as string)?.trim() || null;
  const strumming = parseStrumming(formData.get("strumming") as string);
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();

  if (!title || !artist || !lyricsRaw) {
    throw new Error("Заповніть обов'язкові поля: назва, виконавець, текст");
  }

  const slug = slugify(title) || `song-${Date.now()}`;
  const parsed = parseLyricsWithChords(lyricsRaw);

  const admin = createAdminClient();

  // Check slug uniqueness, append timestamp suffix if needed
  const { data: existing } = await admin
    .from("songs")
    .select("slug")
    .eq("slug", slug)
    .single();

  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const { error } = await admin.from("songs").insert({
    slug: finalSlug,
    title,
    artist,
    genre,
    key,
    difficulty,
    tempo,
    time_signature,
    strumming,
    chords: parsed.chords,
    sections: { raw: lyricsRaw, sections: parsed.sections },
    status: "published", // Admin-created songs are published immediately in MVP
    submitted_by: adminId,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidateTag("songs");
  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/");
  revalidatePath(`/songs/${finalSlug}`);
  redirect(`/songs/${finalSlug}`);
}

// ─── Update song status ───────────────────────────────────────────────────────

export async function updateSongStatus(formData: FormData) {
  const adminId = await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");
  const status = formData.get("status") as string;

  if (!status) throw new Error("Відсутні параметри");
  if (!["published", "archived", "draft"].includes(status)) {
    throw new Error("Невалідний статус");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("songs")
    .update({
      status,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", songId);

  if (error) throw new Error(`Помилка оновлення: ${error.message}`);

  revalidateTag("songs");
  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/admin");
  revalidatePath("/");
}

// ─── Update song ──────────────────────────────────────────────────────────────

export async function updateSong(formData: FormData) {
  await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");

  const title = (formData.get("title") as string)?.trim();
  const artist = (formData.get("artist") as string)?.trim();
  const album = (formData.get("album") as string)?.trim() || null;
  const genre = (formData.get("genre") as string)?.trim() || null;
  const key = (formData.get("key") as string)?.trim() || undefined;
  const capo = formData.get("capo") ? Number(formData.get("capo")) : null;
  const tempo = formData.get("tempo") ? Number(formData.get("tempo")) : null;
  const time_signature = (formData.get("time_signature") as string)?.trim() || null;
  const difficulty = (formData.get("difficulty") as string) || null;
  const status = (formData.get("status") as string) || null;
  const cover_image = sanitizeUrl((formData.get("cover_image") as string)?.trim());
  const cover_color = (formData.get("cover_color") as string)?.trim() || null;
  const youtube_id = extractYoutubeId(formData.get("youtube_id") as string);
  const strummingRaw = formData.get("strumming");
  const strumming = strummingRaw === null ? undefined : parseStrumming(strummingRaw as string);
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();

  if (!title || !artist) throw new Error("Назва та виконавець обов'язкові");

  const parsed = lyricsRaw
    ? parseLyricsWithChords(lyricsRaw)
    : null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("songs")
    .update({
      title, artist, album, genre, ...(key ? { key } : {}), capo, tempo, time_signature,
      difficulty, status, cover_image, cover_color, youtube_id,
      ...(strumming !== undefined ? { strumming } : {}),
      ...(parsed ? {
        sections: { raw: lyricsRaw, sections: parsed.sections },
        chords: parsed.chords,
      } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", songId);

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidateTag("songs");
  revalidatePath("/songs");
  revalidatePath("/admin/songs");
  revalidatePath("/admin");
  revalidatePath("/");

  const returnTo = (formData.get("returnTo") as string) || "/admin/songs";
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/admin/songs";
  redirect(safeReturn);
}

// ─── Delete song (only from archive) ─────────────────────────────────────────

export async function deleteSong(formData: FormData) {
  await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");

  const admin = createAdminClient();
  // Only allow deleting archived songs
  const { data: song } = await admin.from("songs").select("status").eq("id", songId).single();
  if (song?.status !== "archived") throw new Error("Спочатку заархівуйте пісню");

  const { error } = await admin.from("songs").delete().eq("id", songId);

  if (error) throw new Error(`Помилка видалення: ${error.message}`);

  revalidateTag("songs");
  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/admin");
  revalidatePath("/");
}

// ─── Bulk song operations ─────────────────────────────────────────────────────

export async function bulkUpdateSongStatus(formData: FormData) {
  await requireAdmin();

  const ids = (formData.get("ids") as string)?.split(",").filter(id => UUID_RE.test(id));
  const status = formData.get("status") as string;

  if (!ids?.length) return;
  if (!["published", "archived", "draft"].includes(status)) throw new Error("Невалідний статус");

  const admin = createAdminClient();
  const { error } = await admin
    .from("songs")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(`Помилка: ${error.message}`);

  revalidateTag("songs");
  revalidatePath("/songs");
  revalidatePath("/admin/songs");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function bulkDeleteSongs(formData: FormData) {
  await requireAdmin();

  const ids = (formData.get("ids") as string)?.split(",").filter(id => UUID_RE.test(id));
  if (!ids?.length) return;

  const admin = createAdminClient();
  // Only delete archived songs
  const { error } = await admin
    .from("songs")
    .delete()
    .in("id", ids)
    .eq("status", "archived");
  if (error) throw new Error(`Помилка: ${error.message}`);

  revalidateTag("songs");
  revalidatePath("/songs");
  revalidatePath("/admin/songs");
  revalidatePath("/admin");
  revalidatePath("/");
}
