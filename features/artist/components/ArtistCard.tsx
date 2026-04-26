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

      {/* Name centered under the image; heart floats absolutely on the right
          so it doesn't affect name centering. */}
      <div
        className={`artist-row relative w-full flex items-center justify-center ${saved ? "is-saved" : ""}`}
        style={{ minHeight: 30 }}
      >
        <HapticLink href={href} className="block w-full">
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
        <div className="artist-save absolute right-0 top-1/2 -translate-y-1/2">
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
        /* Hide heart by default on hover-capable devices; reveal on row hover.
           Keep it visible whenever the artist is already saved so the user
           always has a way to un-save without hunting for it. */
        @media (hover: hover) {
          .artist-row:not(.is-saved) .artist-save {
            opacity: 0;
            transition: opacity 140ms ease;
            pointer-events: none;
          }
          .artist-row:not(.is-saved):hover .artist-save,
          .artist-row:not(.is-saved):focus-within .artist-save {
            opacity: 1;
            pointer-events: auto;
          }
        }
      `}</style>
    </div>
  );
}
