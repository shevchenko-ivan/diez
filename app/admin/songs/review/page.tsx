export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Layers, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar } from "@/shared/components/Navbar";
import { BackButton } from "@/shared/components/BackButton";
import { TeButton } from "@/shared/components/TeButton";
import { getSongForReview } from "@/features/song/services/songs";
import { SongPageProvider, MobileVariantRow, PreviewSongViewer } from "@/features/song/components/SongPageClient";
import { SongStatusBadge } from "@/features/song/components/SongStatusBadge";
import { isSameSong } from "@/features/song/lib/song-identity";
import { mergeSubmissionAsVariant, updateSongStatus } from "@/features/song/actions/admin";
import { ConfirmForm } from "./ConfirmForm";

export const metadata = { title: "Перегляд пропозиції — Diez", robots: { index: false, follow: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Read-only look at a submission exactly as it would appear on the site.
// Moderation used to mean opening the edit form, where «Зберегти» quietly
// published the song (the status select had no «на перевірці» option) — so
// looking and deciding are now separate: this page changes nothing until one
// of the explicit buttons is pressed.
export default async function ReviewSongPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { id } = await searchParams;
  if (!id || !UUID_RE.test(id)) redirect("/admin/songs?tab=pending");

  const review = await getSongForReview(id);
  if (!review) redirect("/admin/songs?tab=pending");
  const { song, status, submittedBy } = review;
  if (status === "published") redirect(`/songs/${song.slug}`);

  const [{ data: submitter }, { data: sameArtist }] = await Promise.all([
    submittedBy
      ? admin.from("profiles").select("username, email").eq("id", submittedBy).single()
      : Promise.resolve({ data: null }),
    admin
      .from("songs")
      .select("id, slug, title, artist, song_variants!song_variants_song_id_fkey(id)")
      .eq("status", "published")
      .eq("artist", song.artist)
      .range(0, 9999),
  ]);
  const twin = (sameArtist ?? []).find((p) => p.id !== id && isSameSong(p, song));
  const twinVariants = (twin?.song_variants as unknown[] | undefined)?.length ?? 0;
  const submitterName = submitter?.username || submitter?.email?.split("@")[0] || null;
  const canDecide = status === "pending" || status === "draft";

  return (
    <div className="min-h-screen min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-8 pt-1 pb-20">
        <div className="mb-4">
          <BackButton fallback="/admin/songs?tab=pending" />
        </div>

        {/* ── Moderation panel ─────────────────────────────────────────── */}
        <section className="te-surface p-5 md:p-6 mb-6" style={{ borderRadius: "1.5rem" }}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SongStatusBadge status={status} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Перегляд пропозиції
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {song.title} <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>— {song.artist}</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {submitterName ? <>Запропонував(ла): <b style={{ color: "var(--text)" }}>{submitterName}</b>. </> : null}
            Це лише перегляд: тут нічого не зміниться, доки ви не оберете дію нижче.
          </p>

          {twin && (
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--orange-text)" }}>
              ⚠ Ця пісня вже є на сайті:{" "}
              <Link href={`/songs/${twin.slug}`} target="_blank" className="underline">
                {twin.title}
              </Link>{" "}
              ({twinVariants} {twinVariants === 1 ? "варіант" : twinVariants < 5 ? "варіанти" : "варіантів"}). Найкраще додати пропозицію
              туди як ще один варіант — оригінал не зміниться.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canDecide && twin && (
              <ConfirmForm
                action={mergeSubmissionAsVariant}
                message={`Додати цю пропозицію як новий варіант до «${twin.title}»? Існуючі варіанти не зміняться, а окрема пісня-пропозиція буде видалена.`}
              >
                <input type="hidden" name="songId" value={id} />
                <input type="hidden" name="targetSlug" value={twin.slug} />
                <TeButton
                  shape="pill"
                  type="submit"
                  className="px-4 py-2.5 inline-flex items-center gap-2 text-xs font-bold"
                  style={{ color: "var(--orange)" }}
                >
                  <Layers size={14} />
                  Додати як варіант до «{twin.title}»
                </TeButton>
              </ConfirmForm>
            )}
            {canDecide && (
              <ConfirmForm
                action={updateSongStatus}
                message={
                  twin
                    ? `Опублікувати як ОКРЕМУ пісню? На сайті буде дві «${song.title}».`
                    : `Опублікувати «${song.title}» на сайті?`
                }
              >
                <input type="hidden" name="songId" value={id} />
                <input type="hidden" name="status" value="published" />
                <input type="hidden" name="returnTo" value="song" />
                <TeButton
                  shape="pill"
                  type="submit"
                  className="px-4 py-2.5 inline-flex items-center gap-2 text-xs font-bold"
                  style={{ color: twin ? "var(--text-muted)" : "var(--orange)" }}
                >
                  <Eye size={14} />
                  {twin ? "Опублікувати окремою піснею" : "Опублікувати"}
                </TeButton>
              </ConfirmForm>
            )}
            <TeButton
              shape="pill"
              href={`/admin/songs/edit?id=${id}`}
              className="px-4 py-2.5 inline-flex items-center gap-2 text-xs font-bold"
              style={{ color: "var(--text-muted)" }}
            >
              <Pencil size={14} />
              Виправити текст
            </TeButton>
          </div>
        </section>

        {/* ── The song as visitors would see it ────────────────────────── */}
        <SongPageProvider baseSong={song}>
          <MobileVariantRow />
          <PreviewSongViewer />
        </SongPageProvider>
      </main>
    </div>
  );
}
