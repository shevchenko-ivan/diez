"use client";

import { useEffect, useState } from "react";
import { HapticLink } from "@/shared/components/HapticLink";
import { MySongCard } from "@/features/song/components/MySongCard";
import { PlaylistCard } from "@/features/playlist/components/PlaylistCard";
import { getPersonalHomeData, type MySongRow } from "./actions";
import type { Playlist } from "@/features/playlist/types";

// «Додані пісні» + «Мої списки» — the two personal home-page sections. The
// page itself is force-static, so these render client-side after mount, and
// only for visitors carrying a Supabase auth cookie (guests: zero requests,
// zero layout change). Both sections sit below the fold, so the late pop-in
// doesn't shift anything the visitor is looking at.
export function PersonalHomeSections() {
  const [data, setData] = useState<{ mySongs: MySongRow[]; myPlaylists: Playlist[] } | null>(null);

  useEffect(() => {
    if (!document.cookie.includes("-auth-token")) return;
    let disposed = false;
    getPersonalHomeData()
      .then((d) => { if (!disposed) setData(d); })
      .catch(() => { /* personalization is best-effort */ });
    return () => { disposed = true; };
  }, []);

  if (!data) return null;

  return (
    <>
      {data.mySongs.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Додані пісні" href="/profile" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 sm:gap-3">
            {data.mySongs.slice(0, 4).map((song) => (
              <MySongCard
                key={song.id}
                id={song.id}
                slug={song.slug}
                title={song.title}
                artist={song.artist}
                status={song.status}
                coverImage={song.cover_image ?? undefined}
                coverColor={song.cover_color ?? undefined}
              />
            ))}
          </div>
        </section>
      )}

      {data.myPlaylists.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Мої списки" href="/profile/lists" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 sm:gap-3">
            {data.myPlaylists.slice(0, 4).map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Mirrors the server page's SectionHeader (app/page.tsx) — kept in sync by
// hand; the server helper can't be imported into a client module.
function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2
        className="font-bold"
        style={{ fontSize: "1.0625rem", letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        {title}
      </h2>
      {href && (
        <HapticLink
          href={href}
          className="text-[11px] font-medium uppercase tracking-wide hover:underline shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          Дивитись всі <span style={{ opacity: 0.5 }}>→</span>
        </HapticLink>
      )}
    </div>
  );
}
