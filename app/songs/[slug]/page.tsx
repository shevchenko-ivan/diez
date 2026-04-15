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
import { Eye, Pencil } from "lucide-react";
import { BackButton } from "@/shared/components/BackButton";
import { siteUrl, hasEnvVars } from "@/lib/utils";
import { slugify } from "@/lib/slugify";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteFooter } from "@/shared/components/SiteFooter";

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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-8 pb-20">

        {/* ── Header (single row, centered title) ─────────────────────── */}
        <div className="te-surface mb-4 grid items-center" style={{ borderRadius: "1.25rem", padding: "0.4rem 1rem", gridTemplateColumns: "1fr auto 1fr" }}>
          {/* Left: Back */}
          <BackButton fallback="/songs" />

          {/* Center: Title + meta inline */}
          <div className="flex items-center justify-center gap-2 px-4 flex-wrap">
            <Link
              href={`/artists/${artistSlug}`}
              className="hover:underline whitespace-nowrap"
              style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 700, color: "var(--text-muted)", lineHeight: 1.2 }}
            >
              {song.artist}
            </Link>
            <span style={{ color: "var(--text-muted)", opacity: 0.3 }}>·</span>
            <h1
              style={{ fontSize: "1rem", letterSpacing: "-0.02em", fontWeight: 700, color: "var(--text)", lineHeight: 1.2, whiteSpace: "nowrap" }}
            >
              {song.title}
            </h1>
            <DifficultyBadge difficulty={song.difficulty} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 justify-end">
            {songId && (
              <Link
                href={`/admin/songs/edit?id=${songId}`}
                className="te-knob flex items-center justify-center"
                style={{ width: 36, height: 36, color: "var(--orange)" }}
                title="Редагувати"
              >
                <Pencil size={14} />
              </Link>
            )}
            <SongActions />
          </div>
        </div>

        {/* ── Dynamic Song Viewer (Chords, Lyrics, Controls) ── */}
        <SongViewer song={song} />


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
      <SiteFooter />
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
