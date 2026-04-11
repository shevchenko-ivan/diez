export const dynamic = "force-dynamic";

import { Navbar } from "@/shared/components/Navbar";
import { ArrowLeft, Save, User } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateArtist } from "@/features/artist/actions/admin";

export const metadata = { title: "Редагувати артиста — Diez" };

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
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <Link href="/admin/artists" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Артисти
        </Link>

        <div className="te-surface p-10" style={{ borderRadius: "2rem" }}>
          <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
            Редагувати артиста
          </h1>
          <p className="text-sm opacity-60 mb-10" style={{ color: "var(--text-muted)" }}>
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
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                  URL фото
                </label>
                <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
                  <input
                    name="photo_url"
                    defaultValue={artist.photo_url ?? ""}
                    placeholder="https://..."
                    className="w-full bg-transparent outline-none text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  />
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                Ім'я / Назва гурту *
              </label>
              <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
                <input
                  name="name"
                  required
                  defaultValue={artist.name}
                  className="w-full bg-transparent outline-none text-sm font-medium"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                Жанр
              </label>
              <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
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
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                Коротко про артиста
              </label>
              <div className="te-inset p-4" style={{ borderRadius: "1rem" }}>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={artist.bio ?? ""}
                  placeholder="Кілька речень про виконавця..."
                  className="w-full bg-transparent outline-none text-sm font-medium resize-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" className="te-btn-orange px-8 py-4 flex items-center gap-3 text-sm font-bold tracking-widest">
                <Save size={16} /> ЗБЕРЕГТИ
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
