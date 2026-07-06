"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slugify";
import { isMissingStatusColumn } from "@/features/artist/lib/status";

export type SubmitArtistResult =
  | { ok: true; artist: { id: string; slug: string; name: string; photo_url: string | null } }
  | { ok: false; reason: "auth" | "validation" | "error"; message: string };

// Photo upload limits — mirror the avatars bucket (see updateMyProfile).
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MIN_PHOTO_BYTES = 8 * 1024; // reject near-empty / over-compressed thumbnails
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * User-facing artist creation (from the "Додати пісню" form, when the typed
 * artist isn't in the catalogue). Name + optional uploaded photo + short bio.
 * Reuses an existing artist on an exact name match so users don't spawn
 * duplicates. Photo goes to the public `avatars` bucket under the uploader's
 * own folder (the bucket's RLS allows writes only there).
 */
export async function submitArtist(formData: FormData): Promise<SubmitArtistResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth", message: "Увійдіть, щоб додати виконавця." };

  // Blocked submitters can't create artists either (mirrors the song-submit
  // gate). Tolerant of the column being absent pre-migration-026: an error or
  // missing row simply reads as "not blocked".
  const { data: prof } = await supabase
    .from("profiles")
    .select("is_blocked")
    .eq("id", user.id)
    .maybeSingle();
  if ((prof as { is_blocked?: boolean } | null)?.is_blocked) {
    return { ok: false, reason: "auth", message: "Ваш акаунт обмежено. Звʼяжіться з нами, якщо вважаєте це помилкою." };
  }

  const name = (formData.get("name") as string)?.trim();
  const bioRaw = (formData.get("bio") as string | null)?.trim() ?? "";
  const bio = bioRaw.length > 0 ? bioRaw.slice(0, 1000) : null;
  const file = formData.get("photo") as File | null;
  if (!name) return { ok: false, reason: "validation", message: "Вкажіть імʼя виконавця." };
  if (name.length > 120) return { ok: false, reason: "validation", message: "Надто довге імʼя." };

  const admin = createAdminClient();

  // Reuse an existing artist on a case-insensitive exact name match — skip the
  // upload entirely so we don't orphan a storage object for a duplicate.
  // Escape ILIKE wildcards: user input like "AC%DC" or "_" must match
  // literally, not as a pattern (otherwise it can grab an unrelated artist).
  const namePattern = name.replace(/[\\%_]/g, "\\$&");
  const { data: existingByName } = await admin
    .from("artists")
    .select("id, slug, name, photo_url")
    .ilike("name", namePattern)
    .limit(1)
    .maybeSingle();
  if (existingByName) {
    return {
      ok: true,
      artist: {
        id: existingByName.id as string,
        slug: existingByName.slug as string,
        name: existingByName.name as string,
        photo_url: (existingByName.photo_url as string | null) ?? null,
      },
    };
  }

  // Photo is required. Upload with the session client so the bucket RLS
  // (owner-folder write) applies. Validate type/size first.
  if (!file || file.size === 0) {
    return { ok: false, reason: "validation", message: "Додайте фото виконавця." };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { ok: false, reason: "validation", message: "Підтримуються лише JPG, PNG або WebP." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, reason: "validation", message: "Зображення завелике — максимум 5 МБ." };
  }
  if (file.size < MIN_PHOTO_BYTES) {
    return { ok: false, reason: "validation", message: "Зображення замале або надто стиснуте. Завантажте якісніше фото." };
  }
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/artist-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadErr) {
    return { ok: false, reason: "error", message: `Не вдалося завантажити фото: ${uploadErr.message}` };
  }
  const photo_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;

  const baseSlug = slugify(name) || `artist-${Date.now()}`;
  const { data: slugTaken } = await admin.from("artists").select("slug").eq("slug", baseSlug).maybeSingle();
  const finalSlug = slugTaken ? `${baseSlug}-${Date.now()}` : baseSlug;

  // User-submitted artists land as `pending` — hidden publicly until an admin
  // approves them in the moderation queue (see 027_artist_moderation.sql).
  // Pre-027 fallback: if the status column isn't there yet, insert without it.
  let { data: inserted, error } = await admin
    .from("artists")
    .insert({ slug: finalSlug, name, photo_url, bio, status: "pending" })
    .select("id, slug, name, photo_url")
    .single();
  if (error && isMissingStatusColumn(error)) {
    ({ data: inserted, error } = await admin
      .from("artists")
      .insert({ slug: finalSlug, name, photo_url, bio })
      .select("id, slug, name, photo_url")
      .single());
  }

  if (error || !inserted) {
    return { ok: false, reason: "error", message: "Не вдалося створити виконавця. Спробуйте ще раз." };
  }

  revalidatePath("/artists");
  return {
    ok: true,
    artist: {
      id: inserted.id as string,
      slug: inserted.slug as string,
      name: inserted.name as string,
      photo_url: (inserted.photo_url as string | null) ?? null,
    },
  };
}
