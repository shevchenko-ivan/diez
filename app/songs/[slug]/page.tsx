export const dynamic = "force-dynamic";

import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSongBySlug, getAllSongs } from "@/features/song/services/songs";
import { type Song } from "@/features/song/types";
import { Navbar } from "@/shared/components/Navbar";
import { SongActions } from "@/features/song/components/SongActions";
import { SongViewer } from "@/features/song/components/SongViewer";
import { SongCard } from "@/features/song/components/SongCard";
import { ChevronLeft, Eye, Music, Pencil } from "lucide-react";
import { siteUrl, hasEnvVars } from "@/lib/utils";
import { slugify } from "@/lib/slugify";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return {};

  const difficultyLabel =
    song.difficulty === "easy" ? "легка" : song.difficulty === "medium" ? "середня" : "складна";
  const title = `${song.title} — ${song.artist} | Акорди | Diez`;
  const description = `Акорди пісні «${song.title}» виконавця ${song.artist}. Тональність: ${song.key}, складність: ${difficultyLabel}. Акорди: ${song.chords.join(", ")}.`;

  return {
    title,
    description,
    alternates: { canonical: `/songs/${slug}` },
    openGraph: {
      title: `${song.title} — ${song.artist}`,
      description,
      type: "article",
      url: `/songs/${slug}`,
      // Use song cover when available; falls back to app/opengraph-image.png via Next.js inheritance.
      // Relative paths are resolved against metadataBase in app/layout.tsx.
      ...(song.coverImage && {
        images: [{ url: song.coverImage, alt: `${song.title} — ${song.artist}` }],
      }),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return notFound();

  const artistSlug = slugify(song.artist);
  const allSongs = await getAllSongs();
  const otherSongs = allSongs
    .filter((s) => s.artist === song.artist && s.slug !== slug)
    .slice(0, 4);

  // Check admin — get song ID for edit link
  let songId: string | null = null;
  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles").select("is_admin").eq("id", user.id).single();
        if (profile?.is_admin) {
          const { data } = await admin.from("songs").select("id").eq("slug", slug).single();
          songId = data?.id ?? null;
        }
      }
    } catch { /* not admin or not logged in */ }
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: song.title,
    composer: { "@type": "MusicGroup", name: song.artist },
    musicalKey: song.key,
    genre: song.genre,
    url: `${siteUrl}/songs/${song.slug}`,
    ...(song.album && {
      inAlbum: { "@type": "MusicAlbum", name: song.album },
    }),
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 lg:px-8 pb-20">

        {/* ── Back ─────────────────────────────────────────────────────── */}
        <div className="pt-2 pb-6">
          <Link
            href="/"
            className="te-key inline-flex items-center gap-1.5 px-3 py-2 text-xs"
            style={{ color: "var(--text-mid)", fontWeight: 400 }}
          >
            <ChevronLeft size={13} strokeWidth={2.5} />
            Назад
          </Link>
        </div>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="te-surface mb-4" style={{ borderRadius: "1.5rem", padding: "1.5rem" }}>
          <div className="flex items-start justify-between gap-4">

            {/* Title block */}
            <div>
              <p
                className="uppercase mb-1"
                style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 400 }}
              >
                {song.genre} ·{" "}
                <Link
                  href={`/artists/${artistSlug}`}
                  style={{ color: "var(--text-muted)" }}
                  className="hover:underline"
                >
                  {song.artist}
                </Link>
              </p>
              <h1
                style={{
                  fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
                  letterSpacing: "-0.03em",
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.1,
                  marginBottom: "1rem",
                }}
              >
                {song.title}
              </h1>

              {/* Info chips row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Key */}
                <div
                  className="te-lcd font-mono-te px-3 py-1 flex items-center gap-1.5"
                  style={{ fontSize: "0.72rem" }}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: "0.58rem" }}>KEY</span>
                  <span>{song.key}</span>
                </div>

                {/* Capo */}
                {song.capo !== undefined && song.capo > 0 && (
                  <div
                    className="te-lcd font-mono-te px-3 py-1 flex items-center gap-1.5"
                    style={{ fontSize: "0.72rem" }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "0.58rem" }}>CAPO</span>
                    <span>{song.capo}</span>
                  </div>
                )}

                {/* Tempo */}
                {song.tempo && (
                  <div
                    className="te-lcd font-mono-te px-3 py-1 flex items-center gap-1.5"
                    style={{ fontSize: "0.72rem" }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "0.58rem" }}>BPM</span>
                    <span>{song.tempo}</span>
                  </div>
                )}

                {/* Difficulty dot */}
                <DifficultyBadge difficulty={song.difficulty} />

                {/* Views */}
                <div
                  className="flex items-center gap-1"
                  style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
                >
                  <Eye size={11} />
                  <span className="font-mono-te">{song.views.toLocaleString("uk")}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <SongActions />
              {songId && (
                <Link
                  href={`/admin/songs/edit?id=${songId}`}
                  className="te-key inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                  style={{ color: "var(--orange)", borderRadius: "0.75rem" }}
                >
                  <Pencil size={12} />
                  Редагувати
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Dynamic Song Viewer (Chords, Lyrics, Controls) ── */}
        <SongViewer song={song} />

        {/* ── Album / author meta ───────────────────────────────────────── */}
        <div
          className="te-inset mt-6 flex items-center gap-3"
          style={{ borderRadius: "1rem", padding: "0.875rem 1.125rem" }}
        >
          <div
            className="te-knob flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36 }}
          >
            <Music size={14} style={{ color: "var(--text-mid)" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text)" }}>
              {song.artist}{song.album ? ` — ${song.album}` : ""}
            </p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 350 }}>
              Акорди підібрані спільнотою · Складність:{" "}
              <span style={{ color: "var(--text-mid)" }}>
                {song.difficulty === "easy" ? "легка" : song.difficulty === "medium" ? "середня" : "складна"}
              </span>
            </p>
          </div>
        </div>

        {/* ── Other songs by this artist ────────────────────────────────── */}
        {otherSongs.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="uppercase tracking-wider"
                style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.12em" }}
              >
                Ще від {song.artist}
              </h2>
              <Link
                href={`/artists/${artistSlug}`}
                className="te-key px-3 py-1.5"
                style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}
              >
                Всі пісні →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {otherSongs.map(({ key: _k, ...s }) => (
                <SongCard key={s.slug} {...s} />
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: Song["difficulty"] }) {
  const map = {
    easy:   { label: "Easy",   color: "#10b981" },
    medium: { label: "Medium", color: "#f59e0b" },
    hard:   { label: "Hard",   color: "#ef4444" },
  };
  const { label, color } = map[difficulty];

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 te-inset"
      style={{ borderRadius: "999px" }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span
        className="font-mono-te uppercase"
        style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--text-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}
