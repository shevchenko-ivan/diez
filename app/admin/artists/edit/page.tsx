export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { FormField } from "@/shared/components/FormField";
import { ArrowLeft, Save, User } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateArtist } from "@/features/artist/actions/admin";
import { TeButton } from "@/shared/components/TeButton";

export const metadata = { title: "Редагувати виконавця — Diez" };

const GENRES = ["Рок", "Поп-рок", "Поп", "Інді", "Фолк", "Реп", "Електронна", "Шансон", "Народна", "Інше"];

export default async function EditArtistPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { id } = await searchParams;
  if (!id) redirect("/admin/artists");

  const { data: artist } = await admin
    .from("artists")
    .select("id, name, photo_url, bio, genre, slug")
    .eq("id", id)
    .single();

  if (!artist) redirect("/admin/artists");

  return (
    <PageShell maxWidth="2xl" footer={false}>
      <Link href="/admin/artists" className="inline-flex items-center gap-1 text-xs mb-8 transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> Виконавці
      </Link>

      <div className="te-surface p-10" style={{ borderRadius: "2rem" }}>
        <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          Редагувати виконавця
        </h1>
        <p className="text-sm font-medium opacity-60 mb-10" style={{ color: "var(--text-muted)" }}>
          slug: <span className="font-mono">{artist.slug}</span>
        </p>

        <form action={updateArtist} className="space-y-6">
          <input type="hidden" name="artistId" value={artist.id} />

          {/* Photo preview + URL */}
          <div className="flex items-center gap-6 mb-2">
            <div className="w-24 h-24 rounded-full te-inset flex-shrink-0 flex items-center justify-center overflow-hidden">
              {artist.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artist.photo_url} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <User size={32} style={{ color: "var(--text-muted)" }} />
              )}
            </div>
            <FormField label="URL фото">
              <input
                name="photo_url"
                defaultValue={artist.photo_url ?? ""}
                placeholder="https://..."
                className="w-full bg-transparent outline-none text-sm font-medium"
                style={{ color: "var(--text)" }}
              />
            </FormField>
          </div>

          <FormField label="Ім'я / Назва гурту *">
            <input
              name="name"
              required
              defaultValue={artist.name}
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </FormField>

          <FormField label="Жанр">
            <select
              name="genre"
              defaultValue={artist.genre ?? ""}
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              <option value="">— Обрати —</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Коротко про виконавця">
            <textarea
              name="bio"
              rows={3}
              defaultValue={artist.bio ?? ""}
              placeholder="Кілька речень про виконавця..."
              className="w-full bg-transparent outline-none text-sm font-medium resize-none"
              style={{ color: "var(--text)" }}
            />
          </FormField>

          <div className="pt-2 flex justify-end">
            <TeButton shape="pill" type="submit" icon={Save} iconSize={16} className="px-8 py-4 flex items-center gap-3 text-sm font-bold tracking-widest">
              ЗБЕРЕГТИ
            </TeButton>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
