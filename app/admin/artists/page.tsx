export const dynamic = "force-dynamic";

import { Navbar } from "@/shared/components/Navbar";
import { ArrowLeft, Plus, Trash2, User } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { deleteArtist } from "@/features/artist/actions/admin";
import Image from "next/image";

export const metadata = { title: "Артисти — Адмінка | Diez" };

export default async function AdminArtistsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { data: artists } = await admin
    .from("artists")
    .select("id, slug, name, photo_url, genre")
    .order("name");

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/admin" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Адмін-панель
        </Link>

        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
              Артисти
            </h1>
            <p className="text-sm opacity-60" style={{ color: "var(--text-muted)" }}>
              {artists?.length ?? 0} виконавців
            </p>
          </div>
          <Link
            href="/admin/artists/new"
            className="te-btn-orange px-5 py-3 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
          >
            <Plus size={14} /> ДОДАТИ АРТИСТА
          </Link>
        </div>

        <div className="te-surface overflow-hidden" style={{ borderRadius: "1.5rem" }}>
          {(!artists || artists.length === 0) ? (
            <div className="p-12 text-center opacity-50" style={{ color: "var(--text-muted)" }}>
              Артистів ще немає. Додайте першого!
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b" style={{ borderColor: "rgba(0,0,0,0.06)", color: "var(--text-muted)" }}>
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Артист</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Жанр</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Slug</th>
                  <th className="px-6 py-4 text-right font-bold tracking-wider text-xs uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)", color: "var(--text)" }}>
                {artists.map((artist) => (
                  <tr key={artist.id} className="hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden te-inset flex-shrink-0 flex items-center justify-center">
                          {artist.photo_url ? (
                            <Image src={artist.photo_url} alt={artist.name} width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <User size={16} style={{ color: "var(--text-muted)" }} />
                          )}
                        </div>
                        <span className="font-bold">{artist.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 opacity-70">{artist.genre ?? "—"}</td>
                    <td className="px-6 py-4 font-mono text-xs opacity-60">{artist.slug}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <form action={deleteArtist}>
                          <input type="hidden" name="artistId" value={artist.id} />
                          <button
                            type="submit"
                            title="Видалити"
                            className="p-2 te-key rounded-lg opacity-60 hover:opacity-100 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
