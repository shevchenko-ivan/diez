// Build-time snapshot of the home page's images.
//
// Downloads the covers of the current "Топ популярних" + "Нові пісні" songs
// (the same queries the home page runs) and the photos of ALL approved
// artists, compresses them to 500px webp and writes them to public/_covers/
// together with a manifest ({"s:<slug>": path, "a:<slug>": path}). The page
// swaps them in with the CDN URL as fallback, so the first screen renders
// entirely first-party — no third-party DNS/TLS on the LCP critical path.
//
// Artists are snapshotted in full (≈150 photos, ~30-50 KB each) instead of
// replicating the strip's ranking logic (score aggregation + curated order,
// features/artist/services/artists.ts) — whatever the strip shows is covered.
//
// Freshness: re-snapshotted on every deploy. A song/artist missing from the
// manifest renders from its CDN URL exactly as before; content hashes in the
// filenames bust caches; the whole directory is wiped before regeneration.
//
// This script must NEVER fail the build: every failure path logs and exits 0.
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { coverThumb } from "../lib/utils";

const OUT_DIR = path.join(process.cwd(), "public", "_covers");
const SONGS_LIMIT = 12; // matches both home-page song strips' limit
const CONCURRENCY = 8;

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

type Task = { key: string; slug: string; url: string };

async function main() {
  await loadEnvLocal();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) {
    console.log("[covers] Supabase env missing — skipping snapshot");
    return;
  }
  const rest = async (q: string): Promise<Record<string, string | null>[]> => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: { apikey: key } });
    if (!r.ok) throw new Error(`REST ${q.split("?")[0]}: HTTP ${r.status}`);
    return r.json();
  };

  const tasks: Task[] = [];
  try {
    const [trending, fresh, artists] = await Promise.all([
      rest(`songs_search?select=slug,cover_image&order=source_views.desc.nullslast&limit=${SONGS_LIMIT}`),
      rest(`songs_search?select=slug,cover_image&order=created_at.desc&limit=${SONGS_LIMIT}`),
      rest(`artists?select=slug,photo_url&status=eq.approved`),
    ]);
    for (const r of [...trending, ...fresh]) {
      if (r.slug && r.cover_image) tasks.push({ key: `s:${r.slug}`, slug: r.slug, url: r.cover_image });
    }
    for (const r of artists) {
      if (r.slug && r.photo_url) tasks.push({ key: `a:${r.slug}`, slug: r.slug, url: r.photo_url });
    }
  } catch (e) {
    console.log(`[covers] ${String(e)} — skipping snapshot`);
    return;
  }

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
  // Songs sharing one cover (or an artist photo doubling as a cover) download
  // and encode once.
  const byUrl = new Map<string, Promise<string | null>>();
  let done = 0;

  const processOne = async (t: Task): Promise<void> => {
    let file = await byUrl.get(t.url);
    if (file === undefined) {
      const p = (async (): Promise<string | null> => {
        const src = coverThumb(t.url, 500) ?? t.url;
        // Wikimedia 429s concurrent bursts — back off and retry a couple of
        // times before giving up on a file.
        let r = await fetch(src);
        for (let retry = 0; !r.ok && r.status === 429 && retry < 3; retry++) {
          await new Promise((res) => setTimeout(res, 4000 * (retry + 1)));
          r = await fetch(src);
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        let buf: Buffer = Buffer.from(await r.arrayBuffer());
        let ext = "jpg";
        if (sharp) {
          buf = await sharp(buf)
            .resize(500, 500, { fit: "inside", withoutEnlargement: true })
            // q75 over q82: ~22% smaller on the heavy photographic covers
            // (58 KB → 45 KB measured on a 500px Deezer source) with nothing
            // visible at the 150px the cards actually render at. Cover weight
            // is what makes the homepage's lab score swing ~10 points between
            // builds, since the trending set — and its images — changes.
            .webp({ quality: 75 })
            .toBuffer();
          ext = "webp";
        }
        const hash = createHash("sha1").update(buf).digest("hex").slice(0, 8);
        const name = `${t.slug}.${hash}.${ext}`;
        await writeFile(path.join(OUT_DIR, name), buf);
        return name;
      })();
      byUrl.set(t.url, p.catch(() => null));
      file = await p.catch((e) => {
        console.log(`[covers] ${t.key}: ${String(e)} — skip`);
        return null;
      });
    } else {
      file = await file;
    }
    if (file) {
      manifest[t.key] = `/_covers/${file}`;
      done++;
    }
  };

  // Bounded parallelism — stay gentle with the CDNs (Wikimedia 429s bursts).
  const queue = [...tasks];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let t = queue.shift(); t; t = queue.shift()) await processOne(t);
    }),
  );

  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest));
  console.log(`[covers] snapshot: ${done}/${tasks.length} images`);
}

main().catch((e) => console.log("[covers] failed:", String(e)));
