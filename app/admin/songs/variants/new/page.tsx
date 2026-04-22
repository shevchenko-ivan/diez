export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PageShell } from "@/shared/components/PageShell";
import { FormField } from "@/shared/components/FormField";
import { BackButton } from "@/shared/components/BackButton";
import { TeButton } from "@/shared/components/TeButton";
import { StrummingEditor } from "@/features/song/components/StrummingEditor";
import { RhythmBlock } from "../../edit/RhythmBlock";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createVariant } from "@/features/song/actions/admin";
import { AutoResizeTextarea } from "../../edit/AutoResizeTextarea";
import { Save } from "lucide-react";

export const metadata = { title: "Новий варіант — Diez" };

const KEYS = ["Am", "Em", "Dm", "Gm", "Cm", "Fm", "Bm", "C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewVariantPage({
  searchParams,
}: {
  searchParams: Promise<{ songId?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { songId } = await searchParams;
  if (!songId || !UUID_RE.test(songId)) redirect("/admin/songs");

  const { data: song } = await admin
    .from("songs")
    .select("id, slug, title, artist, key")
    .eq("id", songId)
    .single();
  if (!song) redirect("/admin/songs");

  const { count: variantsCount } = await admin
    .from("song_variants")
    .select("id", { count: "exact", head: true })
    .eq("song_id", song.id);

  const nextIndex = (variantsCount ?? 0) + 1;
  const defaultLabel = `Варіант ${nextIndex}`;

  return (
    <PageShell maxWidth="2xl" footer={false}>
      <div className="mb-8">
        <BackButton fallback={`/songs/${song.slug}`} />
      </div>

      <form action={createVariant} className="space-y-6">
        <input type="hidden" name="songId" value={song.id} />

        <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
          <h1 className="text-3xl font-bold mb-1 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
            Новий варіант
          </h1>
          <p className="text-xs font-mono opacity-40 mb-8" style={{ color: "var(--text-muted)" }}>
            {song.artist} — {song.title}
          </p>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Назва варіанту *">
                <input name="label" required defaultValue={defaultLabel} className="field-input" style={{ color: "var(--text)" }} />
              </FormField>
              <FormField label="Тональність">
                <select name="key" defaultValue={song.key ?? "Am"} className="field-input" style={{ color: "var(--text)" }}>
                  {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </FormField>
              <FormField label="Капо">
                <input name="capo" type="number" min={0} max={12} placeholder="0" className="field-input" style={{ color: "var(--text)" }} />
              </FormField>
            </div>

            <label className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text)" }}>
              <input type="checkbox" name="make_primary" className="w-4 h-4" />
              Зробити основним варіантом
            </label>
          </div>
        </div>

        <RhythmBlock initialEnabled={false}>
          <FormField label="Темп (BPM)">
            <input name="tempo" type="number" min={40} max={300} placeholder="120" className="field-input" style={{ color: "var(--text)" }} />
          </FormField>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--text-muted)" }}>
              Бій / ритмічний малюнок
            </label>
            <div className="te-inset p-4" style={{ borderRadius: "1rem" }}>
              <StrummingEditor name="strumming" />
            </div>
          </div>
        </RhythmBlock>

        <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
          <h2 className="text-lg font-bold mb-6 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
            Текст з акордами *
          </h2>
          <div className="te-inset p-4" style={{ borderRadius: "1rem" }}>
            <AutoResizeTextarea
              name="lyrics_with_chords"
              placeholder={"Куплет 1:\n[Am]Слова пісні [C]тут\n[G]Наступний рядок\n\nПриспів:\n[F]Приспів тут"}
              className="field-input w-full resize-none font-mono text-xs leading-relaxed"
              style={{ color: "var(--text)" }}
            />
          </div>

          <div className="pt-6 flex justify-end">
            <TeButton shape="pill" type="submit" className="px-8 py-4 flex items-center gap-3 text-sm font-bold tracking-widest">
              <Save size={16} />
              СТВОРИТИ ВАРІАНТ
            </TeButton>
          </div>
        </div>
      </form>
    </PageShell>
  );
}
