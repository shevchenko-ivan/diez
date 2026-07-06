export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { BackButton } from "@/shared/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveReport } from "@/features/song/actions/reports";

export const metadata = { title: "Скарги — Адмінка | Diez" };

const REASON_LABELS: Record<string, string> = {
  russian: "Російськомовний контент",
  copyright: "Порушення авторських прав",
  wrong: "Неправильний текст / акорди",
  spam: "Спам або сміття",
  other: "Інше",
};

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  // Open reports, newest first, joined with their song.
  const { data: reports } = await admin
    .from("song_reports")
    .select("id, song_id, reason, details, created_at, songs(slug, title, artist, status)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(200);

  // PostgREST types the embedded relation as an array; normalize to a single
  // song object (a report always points at exactly one song).
  const list = ((reports ?? []) as unknown as Array<{
    id: string; song_id: string; reason: string; details: string | null; created_at: string;
    songs: { slug: string; title: string; artist: string; status: string } | { slug: string; title: string; artist: string; status: string }[] | null;
  }>).map((r) => ({
    ...r,
    songs: Array.isArray(r.songs) ? (r.songs[0] ?? null) : r.songs,
  }));

  return (
    <PageShell footer={false}>
      <div className="mb-8"><BackButton fallback="/admin" /></div>
      <PageHeader title="Скарги" subtitle={`${list.length} відкритих`} />

      {list.length === 0 ? (
        <div className="te-surface p-10 text-center" style={{ borderRadius: "1.5rem" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Скарг немає 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="te-surface p-5" style={{ borderRadius: "1.25rem" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(220,60,60,0.12)", color: "#dc3c3c" }}
                    >
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(r.created_at).toLocaleDateString("uk-UA")}
                    </span>
                  </div>
                  {r.songs ? (
                    <Link href={`/songs/${r.songs.slug}`} className="text-sm font-bold hover:underline" style={{ color: "var(--text)" }}>
                      {r.songs.title} — {r.songs.artist}
                      <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>({r.songs.status})</span>
                    </Link>
                  ) : (
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>Пісню видалено</span>
                  )}
                  {r.details && (
                    <p className="text-sm mt-1.5" style={{ color: "var(--text-mid)" }}>{r.details}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <form action={resolveReport}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <input type="hidden" name="action" value="dismiss" />
                    <button type="submit" className="px-3 py-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                      Відхилити скаргу
                    </button>
                  </form>
                  <form action={resolveReport}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <input type="hidden" name="songId" value={r.song_id} />
                    <input type="hidden" name="action" value="hide" />
                    <button type="submit" className="te-pill-btn px-3 py-2 text-xs font-bold">
                      Сховати пісню
                    </button>
                  </form>
                  <form action={resolveReport}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <input type="hidden" name="songId" value={r.song_id} />
                    <input type="hidden" name="action" value="block" />
                    <button
                      type="submit"
                      className="px-3 py-2 text-xs font-bold rounded-full"
                      style={{ background: "rgba(220,60,60,0.12)", color: "#dc3c3c" }}
                    >
                      Сховати + заблокувати автора
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
