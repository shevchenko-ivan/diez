import Link from "next/link";
import { Globe, Link as LinkIcon, Lock, ListMusic } from "lucide-react";
import type { Playlist, PlaylistVisibility } from "../types";

const VIS_META: Record<PlaylistVisibility, { label: string; icon: typeof Lock }> = {
  private: { label: "Приватний", icon: Lock },
  unlisted: { label: "За посиланням", icon: LinkIcon },
  public: { label: "Публічний", icon: Globe },
};

interface Props {
  playlist: Playlist;
  /** If true, card links to public /lists/[slug] instead of /profile/lists/[id] */
  publicLink?: boolean;
}

// Fanned-out polaroid stack used on the homepage / profile lists strip.
// Inspired by Notion-style collection cards: a few covers tilted in a fan,
// minimal chrome, title with a right-aligned count badge.
export function PlaylistCard({ playlist, publicLink = false }: Props) {
  const href = publicLink
    ? `/lists/${playlist.slug}`
    : `/profile/lists/${playlist.id}`;
  const VisIcon = VIS_META[playlist.visibility].icon;
  const count = playlist.songCount ?? 0;
  const covers = (playlist.coverImages ?? []).slice(0, 3);
  const fanCount = Math.max(covers.length, 1);

  return (
    <Link
      href={href}
      className="flex flex-col group cursor-pointer"
    >
      {/* Stacked covers ─ fanned polaroid look */}
      <div className="w-full aspect-[4/3] relative">
        {covers.length === 0 ? (
          <div
            className="absolute rounded-lg flex items-center justify-center"
            style={{
              width: "55%",
              aspectRatio: "1 / 1",
              left: "22.5%",
              top: "15%",
              background: "linear-gradient(145deg, rgba(255,136,0,0.18), rgba(255,136,0,0.06))",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12), 0 0 0 3px var(--bg)",
            }}
          >
            <ListMusic size={28} style={{ color: "var(--orange)", opacity: 0.7 }} />
          </div>
        ) : (
          covers.map((c, i) => {
            // -1, 0, 1 distribution for 3 items; 0 for single item.
            const offset = fanCount === 1 ? 0 : i - (fanCount - 1) / 2;
            const isImg = c.startsWith("http") || c.startsWith("/");
            const rotation = offset * 8;
            const translateX = offset * 18; // % of container width
            const isCenter = Math.abs(offset) < 0.5;
            // On hover side cards spread wider + tilt more, centre lifts up.
            const hoverRotation = isCenter ? 0 : offset * 14;
            const hoverTranslate = isCenter ? "translateY(-6%)" : `translateX(${offset * 8}%)`;
            return (
              <div
                key={i}
                className="playlist-fan-cover absolute rounded-lg overflow-hidden"
                style={{
                  width: "55%",
                  aspectRatio: "1 / 1",
                  left: `calc(22.5% + ${translateX}%)`,
                  top: "15%",
                  transformOrigin: "center bottom",
                  ["--fan-rest" as string]: `rotate(${rotation}deg)`,
                  ["--fan-hover" as string]: `rotate(${hoverRotation}deg) ${hoverTranslate}`,
                  zIndex: isCenter ? 3 : 1,
                  backgroundImage: isImg ? `url(${c})` : undefined,
                  background: !isImg ? `linear-gradient(145deg, ${c}CC, ${c}66)` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.18), 0 0 0 3px var(--bg)",
                }}
              />
            );
          })
        )}
      </div>

      {/* Title row + count badge */}
      <div className="px-1 mt-2 flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-sm tracking-tight leading-tight line-clamp-1" style={{ color: "var(--text)" }}>
          {playlist.name}
        </h3>
        <span className="text-xs font-medium tabular-nums shrink-0" style={{ color: "var(--text-muted)" }}>
          {count}
        </span>
      </div>

      {/* Meta line ─ visibility */}
      <div className="px-1 mt-0.5">
        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <VisIcon size={11} strokeWidth={2} aria-hidden="true" />
          {VIS_META[playlist.visibility].label}
        </span>
      </div>
    </Link>
  );
}

