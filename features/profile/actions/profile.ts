"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateMyProfile(formData: FormData): Promise<ProfileActionResult> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Потрібен вхід у систему." };

  const rawName = (formData.get("displayName") as string | null)?.trim() ?? "";
  const removeAvatar = formData.get("removeAvatar") === "true";
  const file = formData.get("avatar") as File | null;

  if (rawName.length < 2 || rawName.length > 40) {
    return { ok: false, error: "Ім'я має бути від 2 до 40 символів." };
  }

  // Read current avatar so we can clean up the old object on replace/remove.
  const { data: current } = await sb
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  let avatarUrl: string | null = current?.avatar_url ?? null;

  if (file && file.size > 0) {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return { ok: false, error: "Підтримуються лише JPG, PNG або WebP." };
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: "Розмір фото не може перевищувати 2 МБ." };
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadErr } = await sb.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadErr) return { ok: false, error: `Не вдалось завантажити фото: ${uploadErr.message}` };

    const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
    const newUrl = pub.publicUrl;

    if (avatarUrl) await deleteAvatarObject(sb, avatarUrl, user.id);
    avatarUrl = newUrl;
  } else if (removeAvatar && avatarUrl) {
    await deleteAvatarObject(sb, avatarUrl, user.id);
    avatarUrl = null;
  }

  const { error: updateErr } = await sb
    .from("profiles")
    .update({ username: rawName, avatar_url: avatarUrl })
    .eq("id", user.id);
  if (updateErr) return { ok: false, error: `Не вдалось зберегти профіль: ${updateErr.message}` };

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { ok: true };
}

// Best-effort cleanup; ignore errors so a stale storage object never blocks
// a profile update. Validates the path belongs to the current user before delete.
async function deleteAvatarObject(
  sb: Awaited<ReturnType<typeof createClient>>,
  publicUrl: string,
  userId: string,
): Promise<void> {
  const marker = "/avatars/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path.startsWith(`${userId}/`)) return;
  await sb.storage.from("avatars").remove([path]);
}
