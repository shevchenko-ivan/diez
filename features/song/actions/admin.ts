"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slugify";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Parse "[Am]lyrics [F]more lyrics" into sections format.
// Each double-newline starts a new section. Section headers like "Куплет 1:"
// at the start of a block become the label.
function parseLyricsWithChords(raw: string): {
  sections: { label: string; lines: { chords: string[]; lyrics: string }[] }[];
  chords: string[];
} {
  const allChords = new Set<string>();
  const blocks = raw.split(/\n\s*\n/).filter((b) => b.trim());

  const sections = blocks.map((block, idx) => {
    const rawLines = block.split("\n").filter((l) => l.trim());

    // Check if first line is a section header (e.g. "Куплет 1:" or "Приспів")
    let label = `Секція ${idx + 1}`;
    let dataLines = rawLines;
    const headerMatch = rawLines[0]?.match(/^([^[\]]+):\s*$/);
    if (headerMatch) {
      label = headerMatch[1].trim();
      dataLines = rawLines.slice(1);
    }

    const lines = dataLines.map((line) => {
      const chords: string[] = [];
      let lyrics = "";
      // Split on chord markers like [Am], [F#m7]
      const parts = line.split(/\[([^\]]+)\]/);
      // parts alternates: text, chord, text, chord, ...
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          // Text segment
          lyrics += parts[i];
        } else {
          // Chord name
          chords.push(parts[i]);
          allChords.add(parts[i]);
        }
      }
      return { chords, lyrics: lyrics.trim() };
    });

    return { label, lines };
  });

  return { sections, chords: Array.from(allChords) };
}

// ─── Create song ──────────────────────────────────────────────────────────────

export async function createSong(formData: FormData) {
  const adminId = await requireAdmin();

  const title = (formData.get("title") as string)?.trim();
  const artist = (formData.get("artist") as string)?.trim();
  const genre = (formData.get("genre") as string)?.trim() || "Інше";
  const key = (formData.get("key") as string)?.trim() || "Am";
  const difficulty = (formData.get("difficulty") as string) || "easy";
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();

  if (!title || !artist || !lyricsRaw) {
    throw new Error("Заповніть обов'язкові поля: назва, виконавець, текст");
  }

  const slug = slugify(title) || `song-${Date.now()}`;
  const { sections, chords } = parseLyricsWithChords(lyricsRaw);

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
    chords,
    sections,
    status: "published", // Admin-created songs are published immediately in MVP
    submitted_by: adminId,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/");
  revalidatePath(`/songs/${finalSlug}`);
  redirect(`/songs/${finalSlug}`);
}

// ─── Update song status ───────────────────────────────────────────────────────

export async function updateSongStatus(formData: FormData) {
  const adminId = await requireAdmin();

  const songId = formData.get("songId") as string;
  const status = formData.get("status") as string;

  if (!songId || !status) throw new Error("Відсутні параметри");
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

  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/admin");
  revalidatePath("/");
}

// ─── Update song (metadata) ───────────────────────────────────────────────────

export async function updateSong(formData: FormData) {
  await requireAdmin();

  const songId = formData.get("songId") as string;
  if (!songId) throw new Error("Відсутній ID пісні");

  const title = (formData.get("title") as string)?.trim();
  const artist = (formData.get("artist") as string)?.trim();
  const album = (formData.get("album") as string)?.trim() || null;
  const genre = (formData.get("genre") as string)?.trim() || null;
  const key = (formData.get("key") as string)?.trim() || null;
  const capo = formData.get("capo") ? Number(formData.get("capo")) : null;
  const tempo = formData.get("tempo") ? Number(formData.get("tempo")) : null;
  const difficulty = (formData.get("difficulty") as string) || null;
  const status = (formData.get("status") as string) || null;
  const cover_image = (formData.get("cover_image") as string)?.trim() || null;
  const cover_color = (formData.get("cover_color") as string)?.trim() || null;
  const youtube_id = (formData.get("youtube_id") as string)?.trim() || null;

  if (!title || !artist) throw new Error("Назва та виконавець обов'язкові");

  const admin = createAdminClient();
  const { error } = await admin
    .from("songs")
    .update({
      title, artist, album, genre, key, capo, tempo,
      difficulty, status, cover_image, cover_color, youtube_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", songId);

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidatePath("/songs");
  revalidatePath("/admin/songs");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin/songs");
}

// ─── Delete song ──────────────────────────────────────────────────────────────

export async function deleteSong(formData: FormData) {
  await requireAdmin();

  const songId = formData.get("songId") as string;
  if (!songId) throw new Error("Відсутній ID пісні");

  const admin = createAdminClient();
  const { error } = await admin.from("songs").delete().eq("id", songId);

  if (error) throw new Error(`Помилка видалення: ${error.message}`);

  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin/songs");
}
