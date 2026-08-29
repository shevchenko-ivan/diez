import Image from "next/image";
import { HapticLink } from "@/shared/components/HapticLink";
import { slugify } from "@/lib/slugify";
import { coverThumb } from "@/lib/utils";
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

  // No content-visibility on the card (removed 2026-08): its real height
  // tracks the grid column width (the avatar is aspect-ratio 1:1), so any
  // constant containIntrinsicSize is wrong at most viewports — ~199px on a
  // 375px phone, ~250px at lg. Each of ~140 cards snapping from the 220px
  // placeholder to its real height on slow devices was the main source of the
  // field CLS of 1.03 on /artists. Rendering 140 flat cards without the skip
  // is cheap; the CLS was not.
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
          // next/image proxies external photos through /_next/image — without
          // this, a raw <img> ships the original multi-MB Wikipedia portrait
          // straight to the browser and tanks LCP on /artists.
          <Image
            src={coverThumb(image) as string}
            alt={`${name} — фото виконавця`}
            title={name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div
            className="artist-fallback absolute inset-0 flex items-center justify-center"
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
            className="font-medium text-xs tracking-wide leading-tight uppercase text-center"
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

      {/* Hover/save styles live in globals.css (.artist-avatar / .artist-row):
          an inline <style> here shipped once PER CARD — 150 copies and ~1KB
          each on /artists, most of the page's 975KB of raw HTML. */}
    </div>
  );
}
