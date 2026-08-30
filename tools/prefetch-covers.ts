// Build-time cover snapshot for the home page's above-the-fold strip.
//
// Downloads the covers of the current "Топ популярних" songs (the same query
// the home page runs), compresses them to 500px webp and writes them to
// public/_covers/ together with a slug → path manifest. The page then serves
// its LCP image first-party — no third-party DNS/TLS on the critical path and
// a smaller payload than the source CDNs ship.
//
// Freshness: the list is re-snapshotted on every deploy. A song that rotates
// into the top between deploys is simply absent from the manifest and renders
// from its CDN URL exactly as before — stale copies are impossible by
// construction (unused files are wiped, hashes bust browser caches).
//
// This script must NEVER fail the build: every failure path logs and exits 0.
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { coverThumb } from "../lib/utils";

const OUT_DIR = path.join(process.cwd(), "public", "_covers");
const LIMIT = 12; // matches getSongsPage({ sortBy: "source_views", limit: 12 })

// `npm run build` locally doesn't load .env.local (Next does that only for its
// own process) — read it manually so the snapshot works outside Vercel too.
async function loadEnvLocal() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    const text = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local — rely on the platform env */
  }
}

async function main() {
  await loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.log("[covers] Supabase env missing — skipping snapshot");
    return;
  }

  const res = await fetch(
    `${url}/rest/v1/songs_search?select=slug,cover_image&order=source_views.desc.nullslast&limit=${LIMIT}`,
    { headers: { apikey: key } },
  );
  if (!res.ok) {
    console.log(`[covers] top-songs fetch failed (HTTP ${res.status}) — skipping snapshot`);
    return;
  }
  const rows = (await res.json()) as { slug: string; cover_image: string | null }[];

  // sharp is a transitive dependency of next; if a future lockfile drops it,
  // fall back to storing the CDN bytes untouched rather than failing.
  let sharp: typeof import("sharp") | null = null;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("[covers] sharp unavailable — storing originals without recompression");
  }

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const manifest: Record<string, string> = {};
  for (const row of rows) {
    if (!row.cover_image) continue;
    try {
      const src = coverThumb(row.cover_image, 500) ?? row.cover_image;
      const r = await fetch(src);
      if (!r.ok) {
        console.log(`[covers] ${row.slug}: HTTP ${r.status} — skip`);
        continue;
      }
      let buf: Buffer = Buffer.from(await r.arrayBuffer());
      let ext = "jpg";
      if (sharp) {
        buf = await sharp(buf)
          .resize(500, 500, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        ext = "webp";
      }
      // Content hash in the name: a re-snapshot with a changed cover gets a
      // new URL, so long-lived browser/CDN caches can never serve stale bytes.
      const hash = createHash("sha1").update(buf).digest("hex").slice(0, 8);
      const file = `${row.slug}.${hash}.${ext}`;
      await writeFile(path.join(OUT_DIR, file), buf);
      manifest[row.slug] = `/_covers/${file}`;
      console.log(`[covers] ${row.slug}: ${(buf.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.log(`[covers] ${row.slug}: ${String(e)} — skip`);
    }
  }

  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest));
  console.log(`[covers] snapshot: ${Object.keys(manifest).length}/${rows.length} covers`);
}

main().catch((e) => console.log("[covers] failed:", String(e)));
