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

export function PlaylistCard({ playlist, publicLink = false }: Props) {
  const href = publicLink
    ? `/lists/${playlist.slug}`
    : `/profile/lists/${playlist.id}`;
  const VisIcon = VIS_META[playlist.visibility].icon;
  const count = playlist.songCount ?? 0;
  const covers = playlist.coverImages ?? [];

  return (
    <Link
      href={href}
      className="te-surface te-pressable flex flex-col group relative overflow-hidden"
      style={{ borderRadius: "1.25rem" }}
    >
      <div className="w-full aspect-[4/3] relative overflow-hidden bg-[var(--surface)] border-b border-[rgba(0,0,0,0.05)]">
        {covers.length > 0 ? (
          <div className="w-full h-full grid" style={{ gridTemplateColumns: covers.length > 1 ? "1fr 1fr" : "1fr" }}>
            {covers.slice(0, 3).map((c, i) => {
              const isImg = c.startsWith("http") || c.startsWith("/");
              return (
                <div
                  key={i}
                  className="w-full h-full"
                  style={
                    isImg
                      ? { backgroundImage: `url(${c})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : { background: `linear-gradient(145deg, ${c}CC, ${c}66)` }
                  }
                />
              );
            })}
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, rgba(255,136,0,0.15), rgba(255,136,0,0.05))" }}
          >
            <ListMusic size={40} style={{ color: "var(--orange)", opacity: 0.6 }} />
          </div>
        )}
      </div>
      <div className="flex flex-col p-3.5 gap-1.5 flex-1">
        <h3 className="font-bold text-sm tracking-tight leading-tight line-clamp-1" style={{ color: "var(--text)" }}>
          {playlist.name}
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
            {count} {pluralSongs(count)}
          </span>
          <span className="opacity-30 text-[10px]" style={{ color: "var(--text-muted)" }}>•</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
            <VisIcon size={10} strokeWidth={2} />
            {VIS_META[playlist.visibility].label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function pluralSongs(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "пісня";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "пісні";
  return "пісень";
}
