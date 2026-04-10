import { HapticLink } from "@/shared/components/HapticLink";
import Image from "next/image";

interface ArtistCardProps {
  name: string;
  genre: string;
  songsCount: number;
  color: string;
  image?: string;
}

export function ArtistCard({ name, genre, songsCount, color, image }: ArtistCardProps) {
  return (
    <HapticLink
      href={`/artists/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}`}
      className="te-surface te-pressable flex flex-col"
      style={{ borderRadius: "1.25rem" }}
    >
      {/* Image area */}
      <div
        className="w-full aspect-square relative overflow-hidden"
        style={{ borderRadius: "1.25rem 1.25rem 0 0" }}
      >
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
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
