export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { BackButton } from "@/shared/components/BackButton";
import { AddSongForm, type InitialSong } from "@/features/song/components/AddSongForm";
import { getAllArtists } from "@/features/artist/services/artists";
import type { StrumPattern, NoteLength } from "@/features/song/types";
import { SongStatusBadge } from "@/features/song/components/SongStatusBadge";

export const metadata = {
  title: "Редагувати пісню — Diez",
  robots: { index: false, follow: false },
};

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/profile/songs/${id}/edit`);

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  const isAdmin = !!profile?.is_admin;

  // Service-role read: drafts/pending aren't visible under the public RLS, but
  // the author (or an admin) is allowed to edit them.
  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("id, slug, title, artist, genre, key, difficulty, sections, status, submitted_by")
    .eq("id", id)
    .single();

  if (!song) notFound();
  if (song.submitted_by !== user.id && !isAdmin) notFound();

  const { data: patternRows } = await admin
    .from("song_strumming_patterns")
    .select("id, position, name, tempo, note_length, strokes")
    .eq("song_id", id)
    .order("position", { ascending: true });

  const patterns: StrumPattern[] = (patternRows ?? []).map((p) => ({
    id: p.id as string,
    position: (p.position as number) ?? 0,
    name: (p.name as string) ?? "Бій",
    tempo: (p.tempo as number) ?? 100,
    noteLength: ((p.note_length as string) ?? "1/8") as NoteLength,
    strokes: (p.strokes as StrumPattern["strokes"]) ?? [],
  }));

  const sections = song.sections as { raw?: string } | null;
  const initial: InitialSong = {
    songId: song.id as string,
    title: (song.title as string) ?? "",
    artist: (song.artist as string) ?? "",
    genre: (song.genre as string) ?? "Інше",
    key: (song.key as string) ?? "Am",
    difficulty: (song.difficulty as string) ?? "easy",
    lyricsRaw: sections?.raw ?? "",
    status: (song.status as string) ?? "draft",
    patterns,
  };

  const artists = await getAllArtists();

  return (
    <PageShell maxWidth="4xl" footer={false}>
      <BackButton fallback="/profile" label="Назад" inline />

      <div className="te-surface p-10 md:p-14" style={{ borderRadius: "2rem" }}>
        <div className="flex items-center gap-3 mb-2">
          <PageHeader title="Редагувати пісню" subtitle="Оновіть дані й надішліть на перевірку" />
        </div>
        <div className="mb-6 -mt-2">
          <SongStatusBadge status={initial.status} />
        </div>

        <AddSongForm artists={artists} isAdmin={isAdmin} mode="edit" initial={initial} />
      </div>
    </PageShell>
  );
}
