import { readFileSync } from "node:fs";
import path from "node:path";

// Build-time image snapshot (see tools/prefetch-covers.ts): home-page covers
// and artist photos are downloaded at build, compressed and served
// first-party from /public. The manifest maps namespaced keys ("s:<slug>" for
// songs, "a:<slug>" for artists) → local path; anything missing (rotated in
// after the last build, or the snapshot was skipped) falls back to its CDN
// URL. Server-only — reads the filesystem.
let cache: Record<string, string> | null | undefined;

function lookup(key: string): string | null {
  if (cache === undefined) {
    try {
      cache = JSON.parse(
        readFileSync(path.join(process.cwd(), "public", "_covers", "manifest.json"), "utf8"),
      ) as Record<string, string>;
    } catch {
      cache = null;
    }
  }
  return cache?.[key] ?? null;
}

export function localCover(slug: string): string | null {
  return lookup(`s:${slug}`);
}

export function localArtistPhoto(slug: string): string | null {
  return lookup(`a:${slug}`);
}
