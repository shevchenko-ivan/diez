export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { AdminTable, AdminTh, AdminTr } from "@/shared/components/AdminTable";
import { ArrowLeft, Plus, Trash2, User, Pencil } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { deleteArtist, updateArtistPhoto } from "@/features/artist/actions/admin";

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
    <PageShell maxWidth="5xl" footer={false}>
      <Link href="/admin" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
        <ArrowLeft size={14} /> Адмін-панель
      </Link>

      <PageHeader
        title="Артисти"
        subtitle={`${artists?.length ?? 0} виконавців`}
        action={
          <Link
            href="/admin/artists/new"
            className="te-btn-orange px-5 py-3 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
          >
            <Plus size={14} /> ДОДАТИ АРТИСТА
          </Link>
        }
      />

        <AdminTable
          isEmpty={!artists || artists.length === 0}
          emptyMessage="Артистів ще немає. Додайте першого!"
          headers={<>
            <AdminTh className="w-10" />
            <AdminTh>Артист</AdminTh>
            <AdminTh>URL фото</AdminTh>
            <AdminTh className="w-8">Жанр</AdminTh>
            <AdminTh className="text-right w-16">Дії</AdminTh>
          </>}
        >
          {artists?.map((artist) => (
            <AdminTr key={artist.id}>
              <td className="px-4 py-3">
                <div className="w-10 h-10 rounded-full overflow-hidden te-inset flex-shrink-0 flex items-center justify-center">
                  {artist.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.photo_url} alt={artist.name} className="object-cover w-full h-full" />
                  ) : (
                    <User size={16} style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-bold">{artist.name}</span>
                <p className="font-mono text-xs opacity-40 mt-0.5">{artist.slug}</p>
              </td>
              <td className="px-4 py-3">
                <form action={updateArtistPhoto} className="flex items-center gap-2">
                  <input type="hidden" name="artistId" value={artist.id} />
                  <div className="te-inset px-3 py-1.5 flex-1" style={{ borderRadius: "0.75rem" }}>
                    <input
                      name="photo_url"
                      defaultValue={artist.photo_url ?? ""}
                      placeholder="https://..."
                      className="w-full bg-transparent outline-none text-xs font-mono"
                      style={{ color: "var(--text)", minWidth: 0 }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="te-key px-3 py-1.5 text-xs font-bold tracking-widest shrink-0"
                    style={{ borderRadius: "0.75rem", color: "var(--orange)" }}
                  >
                    ОК
                  </button>
                </form>
              </td>
              <td className="px-4 py-3 opacity-60 text-xs">{artist.genre ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/artists/edit?id=${artist.id}`}
                    title="Редагувати"
                    className="p-2 te-key rounded-lg opacity-40 hover:opacity-100"
                  >
                    <Pencil size={15} />
                  </Link>
                  <form action={deleteArtist}>
                    <input type="hidden" name="artistId" value={artist.id} />
                    <button
                      type="submit"
                      title="Видалити"
                      className="p-2 te-key rounded-lg opacity-40 hover:opacity-100 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              </td>
            </AdminTr>
          ))}
        </AdminTable>
    </PageShell>
  );
}
