"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";

export type ReportResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "validation" | "error"; message: string };

/**
 * "Поскаржитись" — any authenticated user can flag a song (Apple 1.2 UGC
 * requirement). Stored in song_reports; admins review in /admin/reports.
 */
export async function reportSong(_prev: ReportResult | null, formData: FormData): Promise<ReportResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth", message: "Щоб поскаржитись, увійдіть у свій акаунт." };

  const slug = (formData.get("slug") as string)?.trim();
  const reason = (formData.get("reason") as string)?.trim();
  // Cap server-side too — the client textarea maxLength is advisory only.
  const details = (formData.get("details") as string)?.trim().slice(0, 1000) || null;
  if (!slug || !reason) return { ok: false, reason: "validation", message: "Оберіть причину скарги." };

  // Resolve the song id from its public slug (songs are publicly readable).
  const { data: song } = await supabase.from("songs").select("id").eq("slug", slug).maybeSingle();
  if (!song) return { ok: false, reason: "validation", message: "Пісню не знайдено." };

  // One OPEN report per user per song — a repeat submit is answered with the
  // same thank-you instead of stacking duplicates in the admin queue. Checked
  // via the service role: reporters intentionally have no SELECT on the table.
  const admin = createAdminClient();
  const { data: dup } = await admin
    .from("song_reports")
    .select("id")
    .eq("song_id", song.id)
    .eq("reporter_id", user.id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  if (dup) return { ok: true };

  const { error } = await supabase
    .from("song_reports")
    .insert({ song_id: song.id, reporter_id: user.id, reason, details });

  if (error) return { ok: false, reason: "error", message: "Не вдалося надіслати скаргу. Спробуйте пізніше." };
  return { ok: true };
}

async function requireAdminId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизовано");
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) throw new Error("Тільки для адміністраторів");
  return user.id;
}

/** Resolve a report: just close it (content kept) or also act on the song/user. */
export async function resolveReport(formData: FormData) {
  const adminId = await requireAdminId();
  const reportId = (formData.get("reportId") as string)?.trim();
  const songId = (formData.get("songId") as string)?.trim();
  const action = formData.get("action") as string; // dismiss | hide | block

  if (!reportId) throw new Error("Відсутній ID скарги");
  const admin = createAdminClient();

  if (action === "hide" && songId) {
    // Take the reported song offline (back to draft) pending a closer look.
    const { error } = await admin
      .from("songs")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", songId);
    if (error) throw new Error(`Не вдалося сховати пісню: ${error.message}`);
  }

  if (action === "block" && songId) {
    // Hide the song AND block its submitter from further submissions. Both
    // updates are checked — silently marking the report resolved while the
    // block failed would leave the admin sure the author is banned when they
    // are not.
    const { error: hideErr } = await admin
      .from("songs")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", songId);
    if (hideErr) throw new Error(`Не вдалося сховати пісню: ${hideErr.message}`);
    const { data: song } = await admin.from("songs").select("submitted_by").eq("id", songId).single();
    if (song?.submitted_by) {
      const { error: blockErr } = await admin
        .from("profiles")
        .update({ is_blocked: true })
        .eq("id", song.submitted_by);
      if (blockErr) throw new Error(`Не вдалося заблокувати автора: ${blockErr.message}`);
    }
  }

  await admin
    .from("song_reports")
    .update({ status: action === "dismiss" ? "dismissed" : "resolved", resolved_at: new Date().toISOString(), resolved_by: adminId })
    .eq("id", reportId);

  revalidateTag("songs", "max");
  revalidatePath("/admin/reports");
  revalidatePath("/songs");
  revalidatePath("/");
}
