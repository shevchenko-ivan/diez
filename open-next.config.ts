// Cloudflare (OpenNext) build config. Used only by `npm run cf:build`;
// the Vercel build ignores this file.
//
// Cache layout, mirroring what Vercel's ISR gives us today:
//   • R2        — rendered pages/RSC payloads (incremental cache), wrapped
//                 in the per-colo Cache API so hot pages skip R2 reads.
//   • DO tags   — revalidateTag / revalidatePath state (sharded Durable
//                 Objects, no D1 table to migrate).
//   • DO queue  — the 30-day `revalidate` backstop: stale pages re-render
//                 in the background, deduplicated, like Vercel ISR.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  tagCache: doShardedTagCache({ baseShardSize: 4 }),
  queue: doQueue,
  enableCacheInterception: true,
});
