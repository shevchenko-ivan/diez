"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import type { Stroke, NoteLength } from "../types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_NOTE_LENGTHS: NoteLength[] = ["1/4", "1/8", "1/16", "1/4t", "1/8t", "1/16t"];

function assertUuid(value: string | null | undefined, label = "ID"): string {
  if (!value || !UUID_RE.test(value)) throw new Error(`Невалідний ${label}`);
  return value;
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

/**
 * Parses a JSON-encoded strokes array submitted from the editor.
 * Strict: drops any unknown keys, coerces direction, ignores invalid entries.
 * Returns null when the payload is unusable (caller decides whether to throw).
 */
function parseStrokes(value: string | null | undefined): Stroke[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const clean: Stroke[] = [];
    for (const raw of parsed) {
      if (!raw || typeof raw !== "object") continue;
      const obj = raw as Record<string, unknown>;
      const dir = obj.d === "U" ? "U" : obj.d === "D" ? "D" : null;
      if (!dir) continue;
      const stroke: Stroke = { d: dir };
      if (obj.a === true) stroke.a = true;
      if (obj.m === true) stroke.m = true;
      if (obj.r === true) stroke.r = true;
      clean.push(stroke);
    }
    return clean.length > 0 ? clean : null;
  } catch {
    return null;
  }
}

function parseTempo(value: string | null | undefined): number {
  const n = parseInt((value ?? "").trim(), 10);
  if (!Number.isFinite(n)) throw new Error("Невалідний темп");
  if (n < 30 || n > 320) throw new Error("Темп має бути 30-320 BPM");
  return n;
}

function parseNoteLength(value: string | null | undefined): NoteLength {
  const v = (value ?? "1/8").trim();
  if (!ALLOWED_NOTE_LENGTHS.includes(v as NoteLength)) {
    throw new Error("Невалідна тривалість ноти");
  }
  return v as NoteLength;
}

function parseName(value: string | null | undefined): string {
  const v = (value ?? "").trim().slice(0, 80);
  return v.length > 0 ? v : "Pattern";
}

async function revalidateForSong(admin: ReturnType<typeof createAdminClient>, songId: string) {
  const { data } = await admin.from("songs").select("slug").eq("id", songId).single();
  revalidateTag("songs", "max");
  if (data?.slug) revalidatePath(`/songs/${data.slug}`);
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createStrumPattern(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");
  const name = parseName(formData.get("name") as string);
  const tempo = parseTempo(formData.get("tempo") as string);
  const noteLength = parseNoteLength(formData.get("noteLength") as string);
  const strokes = parseStrokes(formData.get("strokes") as string);
  if (!strokes) throw new Error("Патерн порожній — додайте хоча б один удар");

  // Append at the end.
  const { data: existing } = await admin
    .from("song_strumming_patterns")
    .select("position")
    .eq("song_id", songId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;

  const { error } = await admin.from("song_strumming_patterns").insert({
    song_id: songId,
    position: nextPosition,
    name,
    tempo,
    note_length: noteLength,
    strokes,
  });
  if (error) throw new Error(`Помилка створення: ${error.message}`);

  await revalidateForSong(admin, songId);
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateStrumPattern(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const id = assertUuid(formData.get("id") as string, "ID патерну");
  const name = parseName(formData.get("name") as string);
  const tempo = parseTempo(formData.get("tempo") as string);
  const noteLength = parseNoteLength(formData.get("noteLength") as string);
  const strokes = parseStrokes(formData.get("strokes") as string);
  if (!strokes) throw new Error("Патерн порожній — додайте хоча б один удар");

  const { data: existing, error: fetchError } = await admin
    .from("song_strumming_patterns")
    .select("song_id")
    .eq("id", id)
    .single();
  if (fetchError || !existing) throw new Error("Патерн не знайдено");

  const { error } = await admin
    .from("song_strumming_patterns")
    .update({ name, tempo, note_length: noteLength, strokes })
    .eq("id", id);
  if (error) throw new Error(`Помилка оновлення: ${error.message}`);

  await revalidateForSong(admin, existing.song_id as string);
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteStrumPattern(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const id = assertUuid(formData.get("id") as string, "ID патерну");

  const { data: existing } = await admin
    .from("song_strumming_patterns")
    .select("song_id")
    .eq("id", id)
    .single();

  const { error } = await admin.from("song_strumming_patterns").delete().eq("id", id);
  if (error) throw new Error(`Помилка видалення: ${error.message}`);

  if (existing) await revalidateForSong(admin, existing.song_id as string);
}

// ─── Reorder ─────────────────────────────────────────────────────────────────

export async function reorderStrumPatterns(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");
  const orderedRaw = (formData.get("orderedIds") as string) ?? "";
  const orderedIds = orderedRaw.split(",").map((s) => s.trim()).filter((s) => UUID_RE.test(s));

  if (orderedIds.length === 0) return;

  // Update positions in a single round-trip per row. Small N (rarely > 10).
  await Promise.all(
    orderedIds.map((id, index) =>
      admin.from("song_strumming_patterns").update({ position: index }).eq("id", id).eq("song_id", songId),
    ),
  );

  await revalidateForSong(admin, songId);
}
