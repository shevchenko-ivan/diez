import { HapticLink } from "@/shared/components/HapticLink";
import { slugify } from "@/lib/slugify";
import { SaveArtistButton } from "./SaveArtistButton";

interface ArtistCardProps {
  name: string;
  genre: string;
  songsCount: number;
  color: string;
  image?: string;
  slug?: string;
  saved?: boolean;
}

export function ArtistCard({ name, songsCount, color, image, slug, saved }: ArtistCardProps) {
  const resolvedSlug = slug ?? slugify(name);
  const href = `/artists/${resolvedSlug}`;

  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      {/* Round avatar — only the circle is pressable */}
      <HapticLink
        href={href}
        className="artist-avatar relative block w-full"
        style={{
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 40% 35%, ${color}55, ${color}22)`,
              fontSize: "3.5rem",
              fontWeight: 900,
              color: `${color}60`,
            }}
          >
            {name.charAt(0)}
          </div>
        )}
      </HapticLink>

      {/* Name + heart */}
      <div className="w-full flex items-center justify-center gap-1.5 min-w-0">
        <HapticLink href={href} className="min-w-0">
          <p
            className="font-bold text-xs tracking-wide leading-tight uppercase text-center"
            style={{
              color: "var(--text)",
              letterSpacing: "0.04em",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {name}
          </p>
        </HapticLink>
        <div className="shrink-0">
          <SaveArtistButton
            artistSlug={resolvedSlug}
            artistName={name}
            songsCount={songsCount}
            initialSaved={!!saved}
            variant="bare"
            size={14}
            buttonSize={30}
          />
        </div>
      </div>

      <style>{`
        .artist-avatar { transition: transform 160ms ease; }
        .artist-avatar:hover { transform: scale(1.05); }
        .artist-avatar:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}
