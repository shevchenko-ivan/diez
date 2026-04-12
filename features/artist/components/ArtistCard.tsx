import { HapticLink } from "@/shared/components/HapticLink";
import { slugify } from "@/lib/slugify";

interface ArtistCardProps {
  name: string;
  genre: string;
  songsCount: number;
  color: string;
  image?: string;
  slug?: string;
}

export function ArtistCard({ name, genre, songsCount, color, image, slug }: ArtistCardProps) {
  const href = `/artists/${slug ?? slugify(name)}`;

  return (
    <HapticLink
      href={href}
      className="te-surface te-pressable flex flex-col"
      style={{ borderRadius: "1.25rem" }}
    >
      {/* Image area */}
      <div
        className="w-full aspect-square relative overflow-hidden"
        style={{ borderRadius: "1.25rem 1.25rem 0 0" }}
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
      </div>

      {/* Name */}
      <div className="p-3">
        <p
          className="font-medium text-xs tracking-wide leading-tight uppercase"
          style={{ color: "var(--text)", letterSpacing: "0.04em" }}
        >
          {name}
        </p>
        <p
          className="text-xs font-medium mt-0.5 uppercase"
          style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.08em" }}
        >
          {genre} · {songsCount} ♪
        </p>
      </div>
    </HapticLink>
  );
}
