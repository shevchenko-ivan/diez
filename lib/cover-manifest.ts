import { readFileSync } from "node:fs";
import path from "node:path";

// Build-time cover snapshot (see tools/prefetch-covers.ts): top-list covers
// are downloaded at build, compressed and served first-party from /public.
// The manifest maps slug → local path; a song that isn't in it (rotated into
// the top after the last build, or the snapshot was skipped) falls back to
// its CDN URL. Server-only — reads the filesystem.
let cache: Record<string, string> | null | undefined;

export function localCover(slug: string): string | null {
  if (cache === undefined) {
    try {
      cache = JSON.parse(
        readFileSync(path.join(process.cwd(), "public", "_covers", "manifest.json"), "utf8"),
      ) as Record<string, string>;
    } catch {
      cache = null;
    }
  }
  return cache?.[slug] ?? null;
}
