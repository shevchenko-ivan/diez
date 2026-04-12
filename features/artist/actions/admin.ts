"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slugify";

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

async function requireAdmin(): Promise<void> {
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
}

export async function createArtist(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const photo_url = sanitizeUrl((formData.get("photo_url") as string)?.trim());
  const bio = (formData.get("bio") as string)?.trim() || null;
  const genre = (formData.get("genre") as string)?.trim() || null;

  if (!name) throw new Error("Назва обов'язкова");

  const slug = slugify(name) || `artist-${Date.now()}`;

  const admin = createAdminClient();

  // Handle slug uniqueness
  const { data: existing } = await admin
    .from("artists")
    .select("slug")
    .eq("slug", slug)
    .single();

  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const { error } = await admin.from("artists").insert({
    slug: finalSlug,
    name,
    photo_url,
    bio,
    genre,
  });

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidatePath("/artists");
  revalidatePath("/admin/artists");
  redirect("/admin/artists");
}

export async function updateArtistPhoto(formData: FormData) {
  await requireAdmin();

  const artistId = assertUuid(formData.get("artistId") as string, "ID артиста");
  const photo_url = sanitizeUrl((formData.get("photo_url") as string)?.trim());

  const admin = createAdminClient();
  const { error } = await admin
    .from("artists")
    .update({ photo_url })
    .eq("id", artistId);

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidatePath("/artists");
  revalidatePath("/admin/artists");
}

export async function updateArtist(formData: FormData) {
  await requireAdmin();

  const artistId = assertUuid(formData.get("artistId") as string, "ID артиста");
  const name = (formData.get("name") as string)?.trim();
  const photo_url = sanitizeUrl((formData.get("photo_url") as string)?.trim());
  const bio = (formData.get("bio") as string)?.trim() || null;
  const genre = (formData.get("genre") as string)?.trim() || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("artists")
    .update({ name, photo_url, bio, genre })
    .eq("id", artistId);

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidatePath("/artists");
  revalidatePath("/admin/artists");
  redirect("/admin/artists");
}

export async function deleteArtist(formData: FormData) {
  await requireAdmin();

  const artistId = assertUuid(formData.get("artistId") as string, "ID артиста");

  const admin = createAdminClient();
  const { error } = await admin.from("artists").delete().eq("id", artistId);
  if (error) throw new Error(`Помилка видалення: ${error.message}`);

  revalidatePath("/artists");
  revalidatePath("/admin/artists");
}
