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
  const time_signature = (formData.get("time_signature") as string)?.trim() || null;
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

  // Create the song first (primary_variant_id filled in a second step).
  const { data: songRow, error: songErr } = await admin
    .from("songs")
    .insert({
      slug: finalSlug,
      title,
      artist,
      genre,
      key,
      difficulty,
      time_signature,
      chords: parsed.chords,
      sections: { raw: lyricsRaw, sections: parsed.sections },
      status: "published",
      submitted_by: adminId,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (songErr || !songRow) throw new Error(`Помилка збереження: ${songErr?.message}`);

  const { data: variantRow, error: varErr } = await admin
    .from("song_variants")
    .insert({
      song_id: songRow.id,
      label: "Основний",
      sections: { raw: lyricsRaw, sections: parsed.sections },
      chords: parsed.chords,
      key,
      status: "published",
      author_id: adminId,
    })
    .select("id")
    .single();

  if (varErr || !variantRow) throw new Error(`Помилка варіанта: ${varErr?.message}`);

  await admin.from("songs").update({ primary_variant_id: variantRow.id }).eq("id", songRow.id);

  revalidateTag("songs", "max");
  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/");
  revalidatePath(`/songs/${finalSlug}`);
  redirect(`/songs/${finalSlug}`);
}

// ─── Song variants ────────────────────────────────────────────────────────────

async function getSongSlug(songId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("songs").select("slug").eq("id", songId).single();
  return (data?.slug as string | undefined) ?? null;
}

export async function createVariant(formData: FormData) {
  const adminId = await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");
  const label = (formData.get("label") as string)?.trim() || "Новий варіант";
  const key = (formData.get("key") as string)?.trim() || "Am";
  const capo = formData.get("capo") ? Number(formData.get("capo")) : null;
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();
  const makePrimary = formData.get("make_primary") === "on";

  if (!lyricsRaw) throw new Error("Потрібен текст з акордами");

  const parsed = parseLyricsWithChords(lyricsRaw);
  const admin = createAdminClient();

  const { data: variant, error } = await admin
    .from("song_variants")
    .insert({
      song_id: songId,
      label,
      sections: { raw: lyricsRaw, sections: parsed.sections },
      chords: parsed.chords,
      key,
      capo,
      status: "published",
      author_id: adminId,
    })
    .select("id")
    .single();

  if (error || !variant) throw new Error(`Помилка: ${error?.message}`);

  if (makePrimary) {
    await admin.from("songs").update({ primary_variant_id: variant.id }).eq("id", songId);
  }

  const slug = await getSongSlug(songId);
  revalidateTag("songs", "max");
  if (slug) revalidatePath(`/songs/${slug}`);
  revalidatePath("/admin");
  if (slug) redirect(`/songs/${slug}?v=${variant.id}`);
}

export async function updateVariant(formData: FormData) {
  await requireAdmin();

  const variantId = assertUuid(formData.get("variantId") as string, "ID варіанта");
  const label = (formData.get("label") as string)?.trim();
  const key = (formData.get("key") as string)?.trim();
  const capo = formData.get("capo") ? Number(formData.get("capo")) : null;
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();

  const parsed = lyricsRaw ? parseLyricsWithChords(lyricsRaw) : null;

  const admin = createAdminClient();
  const { data: variant } = await admin
    .from("song_variants")
    .select("song_id")
    .eq("id", variantId)
    .single();
  if (!variant) throw new Error("Варіант не знайдено");

  const { error } = await admin
    .from("song_variants")
    .update({
      ...(label ? { label } : {}),
      ...(key ? { key } : {}),
      capo,
      ...(parsed
        ? {
            sections: { raw: lyricsRaw, sections: parsed.sections },
            chords: parsed.chords,
          }
        : {}),
    })
    .eq("id", variantId);

  if (error) throw new Error(`Помилка: ${error.message}`);

  // Mirror key/capo/sections/chords to songs table when this variant is the
  // primary — the view page reads these from songs-level columns via
  // applyVariant fallback, and this guards against join/RLS quirks.
  const songId = variant.song_id as string;
  const { data: parentSong } = await admin
    .from("songs")
    .select("primary_variant_id")
    .eq("id", songId)
    .single();
  if (parentSong?.primary_variant_id === variantId) {
    await admin
      .from("songs")
      .update({
        ...(key ? { key } : {}),
        capo,
        ...(parsed
          ? {
              sections: { raw: lyricsRaw, sections: parsed.sections },
              chords: parsed.chords,
            }
          : {}),
      })
      .eq("id", songId);
  }

  const slug = await getSongSlug(songId);
  revalidateTag("songs", "max");
  if (slug) revalidatePath(`/songs/${slug}`);
  revalidatePath("/admin");

  const returnTo = (formData.get("returnTo") as string) || (slug ? `/songs/${slug}?v=${variantId}` : "/admin");
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/admin";
  const sep = safeReturn.includes("?") ? "&" : "?";
  redirect(`${safeReturn}${sep}saved=variant`);
}

export async function setPrimaryVariant(formData: FormData) {
  await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");
  const variantId = assertUuid(formData.get("variantId") as string, "ID варіанта");

  const admin = createAdminClient();
  // Ensure the variant actually belongs to this song.
  const { data: variant } = await admin
    .from("song_variants")
    .select("song_id")
    .eq("id", variantId)
    .single();
  if (!variant || variant.song_id !== songId) throw new Error("Варіант не належить пісні");

  const { error } = await admin
    .from("songs")
    .update({ primary_variant_id: variantId })
    .eq("id", songId);
  if (error) throw new Error(`Помилка: ${error.message}`);

  const slug = await getSongSlug(songId);
  revalidateTag("songs", "max");
  if (slug) revalidatePath(`/songs/${slug}`);
  revalidatePath("/admin");
}

export async function deleteVariant(formData: FormData) {
  await requireAdmin();

  const variantId = assertUuid(formData.get("variantId") as string, "ID варіанта");

  const admin = createAdminClient();
  const { data: variant } = await admin
    .from("song_variants")
    .select("song_id")
    .eq("id", variantId)
    .single();
  if (!variant) throw new Error("Варіант не знайдено");

  // Refuse to delete the last variant or the current primary — keep data safe.
  const { data: song } = await admin
    .from("songs")
    .select("primary_variant_id")
    .eq("id", variant.song_id)
    .single();
  if (song?.primary_variant_id === variantId) {
    throw new Error("Не можна видалити основний варіант — спочатку оберіть інший");
  }
  const { count } = await admin
    .from("song_variants")
    .select("id", { count: "exact", head: true })
    .eq("song_id", variant.song_id);
  if ((count ?? 0) <= 1) throw new Error("Має лишитися хоча б один варіант");

  const { error } = await admin.from("song_variants").delete().eq("id", variantId);
  if (error) throw new Error(`Помилка: ${error.message}`);

  const slug = await getSongSlug(variant.song_id as string);
  revalidateTag("songs", "max");
  if (slug) revalidatePath(`/songs/${slug}`);
  revalidatePath("/admin");
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

  revalidateTag("songs", "max");
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
  const time_signature = (formData.get("time_signature") as string)?.trim() || null;
  const difficulty = (formData.get("difficulty") as string) || null;
  const status = (formData.get("status") as string) || null;
  const cover_image = sanitizeUrl((formData.get("cover_image") as string)?.trim());
  const youtube_id = extractYoutubeId(formData.get("youtube_id") as string);
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();

  if (!title || !artist) throw new Error("Назва та виконавець обов'язкові");

  const parsed = lyricsRaw
    ? parseLyricsWithChords(lyricsRaw)
    : null;

  const admin = createAdminClient();
  const { data: songBefore, error } = await admin
    .from("songs")
    .update({
      title, artist, album, genre, ...(key ? { key } : {}), capo, time_signature,
      difficulty, status, cover_image, youtube_id,
      ...(parsed ? {
        sections: { raw: lyricsRaw, sections: parsed.sections },
        chords: parsed.chords,
      } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", songId)
    .select("primary_variant_id")
    .single();

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  // Keep the primary variant in sync with the song-level edit — so switching
  // between the "song" edit and variant dropdown stays consistent.
  if (songBefore?.primary_variant_id) {
    await admin
      .from("song_variants")
      .update({
        ...(key ? { key } : {}),
        capo,
        ...(parsed ? {
          sections: { raw: lyricsRaw, sections: parsed.sections },
          chords: parsed.chords,
        } : {}),
      })
      .eq("id", songBefore.primary_variant_id);
  }

  revalidateTag("songs", "max");
  revalidatePath("/songs");
  revalidatePath("/admin/songs");
  revalidatePath("/admin");
  revalidatePath("/");

  const returnTo = (formData.get("returnTo") as string) || "/admin/songs";
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/admin/songs";
  const sep = safeReturn.includes("?") ? "&" : "?";
  redirect(`${safeReturn}${sep}saved=meta`);
}

// ─── Update song + active variant in one go ─────────────────────────────────
// Unified save path used by the admin edit page. Keeps the form single-button
// so there are no ambiguous "save-meta vs save-variant" states.

export async function updateSongFull(formData: FormData) {
  await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");
  const variantId = assertUuid(formData.get("variantId") as string, "ID варіанта");

  // ── Song-level (meta) ─────────────────────────────────────────────────────
  const title = (formData.get("title") as string)?.trim();
  const artist = (formData.get("artist") as string)?.trim();
  const album = (formData.get("album") as string)?.trim() || null;
  const genre = (formData.get("genre") as string)?.trim() || null;
  const difficulty = (formData.get("difficulty") as string) || null;
  const status = (formData.get("status") as string) || null;
  const time_signature = (formData.get("time_signature") as string)?.trim() || null;
  const cover_image = sanitizeUrl((formData.get("cover_image") as string)?.trim());
  const youtube_id = extractYoutubeId(formData.get("youtube_id") as string);

  if (!title || !artist) throw new Error("Назва та виконавець обов'язкові");

  // ── Variant-level ─────────────────────────────────────────────────────────
  const label = (formData.get("label") as string)?.trim();
  const key = (formData.get("key") as string)?.trim();
  const capo = formData.get("capo") ? Number(formData.get("capo")) : null;
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();
  const parsed = lyricsRaw ? parseLyricsWithChords(lyricsRaw) : null;

  const admin = createAdminClient();

  // Make sure the variant belongs to this song (guards against forged IDs).
  const { data: variantRow } = await admin
    .from("song_variants")
    .select("song_id")
    .eq("id", variantId)
    .single();
  if (!variantRow || variantRow.song_id !== songId) {
    throw new Error("Варіант не належить пісні");
  }

  // 1) Update the variant.
  const { error: variantErr } = await admin
    .from("song_variants")
    .update({
      ...(label ? { label } : {}),
      ...(key ? { key } : {}),
      capo,
      ...(parsed
        ? { sections: { raw: lyricsRaw, sections: parsed.sections }, chords: parsed.chords }
        : {}),
    })
    .eq("id", variantId);
  if (variantErr) throw new Error(`Помилка варіанта: ${variantErr.message}`);

  // 2) Update the song meta — and mirror variant-level fields to songs when
  //    this variant is the primary (so view-page reads stay consistent).
  const { data: songRow } = await admin
    .from("songs")
    .select("primary_variant_id, slug")
    .eq("id", songId)
    .single();
  const isPrimary = songRow?.primary_variant_id === variantId;

  const { error: songErr } = await admin
    .from("songs")
    .update({
      title, artist, album, genre, difficulty, status, time_signature,
      cover_image, youtube_id,
      ...(isPrimary
        ? {
            ...(key ? { key } : {}),
            capo,
            ...(parsed
              ? { sections: { raw: lyricsRaw, sections: parsed.sections }, chords: parsed.chords }
              : {}),
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", songId);
  if (songErr) throw new Error(`Помилка пісні: ${songErr.message}`);

  revalidateTag("songs", "max");
  revalidatePath("/songs");
  revalidatePath("/admin/songs");
  revalidatePath("/admin");
  revalidatePath("/");
  if (songRow?.slug) revalidatePath(`/songs/${songRow.slug}`);

  const returnTo = (formData.get("returnTo") as string) || "/admin/songs";
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/admin/songs";
  const sep = safeReturn.includes("?") ? "&" : "?";
  redirect(`${safeReturn}${sep}saved=meta`);
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

  revalidateTag("songs", "max");
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
  const updated_at = new Date().toISOString();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error } = await admin
      .from("songs")
      .update({ status, updated_at })
      .in("id", chunk);
    if (error) throw new Error(`Помилка: ${error.message}`);
  }

  revalidateTag("songs", "max");
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
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error } = await admin
      .from("songs")
      .delete()
      .in("id", chunk)
      .eq("status", "archived");
    if (error) throw new Error(`Помилка: ${error.message}`);
  }

  revalidateTag("songs", "max");
  revalidatePath("/songs");
  revalidatePath("/admin/songs");
  revalidatePath("/admin");
  revalidatePath("/");
}
