import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { AddSongForm } from "@/features/song/components/AddSongForm";
import { BackButton } from "@/shared/components/BackButton";
import { getAllArtists } from "@/features/artist/services/artists";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Додати пісню — Diez",
  description: "Додайте нову пісню з акордами до каталогу Diez. Діліться гітарними акордами з українською спільнотою музикантів.",
  robots: { index: false, follow: false },
};

export default async function AddSongPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = !!profile?.is_admin;
  }

  const artists = user ? await getAllArtists() : [];

  return (
    <PageShell maxWidth="4xl" footer={false}>
      <BackButton fallback="/songs" label="Назад" inline />

      <div className="te-surface p-10 md:p-14" style={{ borderRadius: "2rem" }}>
        <PageHeader title="Додати пісню" subtitle="Додайте нову пісню до каталогу" />

        {user && (
          <p className="text-xs mb-6 -mt-2" style={{ color: "var(--text-muted)", lineHeight: 1.65 }}>
            Додавайте пісні будь-якою мовою, крім російської. Ви відповідаєте за контент,
            який публікуєте, і підтверджуєте, що маєте право ним ділитися.{" "}
            <Link href="/terms" target="_blank" className="underline" style={{ color: "var(--text-mid)" }}>
              Детальніше про правила →
            </Link>
          </p>
        )}

        {user ? (
          <AddSongForm artists={artists} isAdmin={isAdmin} />
        ) : (
          <div className="text-center py-8 space-y-5">
            <LogIn size={40} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
              Щоб додати пісню до каталогу, увійдіть у свій акаунт. Так ми зможемо
              повʼязати ваш внесок із вами й сповістити, коли пісню опублікують.
            </p>
            <Link
              href="/auth/login?next=/add"
              className="inline-flex items-center gap-2 te-pill-btn px-6 py-3 text-sm font-bold"
            >
              <LogIn size={16} /> Увійти
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}
