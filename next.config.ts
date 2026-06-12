import type { NextConfig } from "next";

// Content-Security-Policy in *Report-Only* mode — logs violations to the
// browser console / report endpoint but does NOT block anything. Lets us
// confirm we've enumerated every domain we actually load from over a week
// or two of real traffic, then we can flip to enforcing later by changing
// the header name to "Content-Security-Policy".
//
// Sources whitelisted:
// - self: our own origin
// - inline scripts: 'unsafe-inline' is required because Next.js streams
//   inline runtime config + we ship inline JSON-LD scripts. The
//   alternative is per-request nonces which is a bigger refactor.
// - PostHog: eu-assets/eu.i for SDK + ingest
// - Supabase: project subdomain for auth + DB
// - Vercel: live feedback + analytics
// - Image CDNs we already whitelist for next/image
// - YouTube: for the embedded player iframe on song pages
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://eu-assets.i.posthog.com https://us-assets.i.posthog.com https://va.vercel-scripts.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://upload.wikimedia.org https://*.supabase.co https://*.mzstatic.com https://i.ytimg.com https://i.scdn.co https://*.dzcdn.net https://*.musify.club https://*.posthog.com https://www.google-analytics.com https://*.google-analytics.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://eu.i.posthog.com https://us.i.posthog.com https://eu-assets.i.posthog.com https://us-assets.i.posthog.com https://vitals.vercel-insights.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  // HSTS — tell browsers to refuse plain-HTTP for 2 years. Vercel already
  // 301s http→https but HSTS removes that round-trip and protects against
  // SSL-strip attacks on first visit (for repeat visitors).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Report-Only — violations log but don't block. Flip name to
  // "Content-Security-Policy" once we've verified clean traffic.
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.mzstatic.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "**.dzcdn.net" },
      { protocol: "https", hostname: "**.musify.club" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // 301 every request to the auto-generated Vercel deployment URL onto
      // the canonical domain. Without this, Google indexes both hosts and
      // treats them as duplicates — canonical tags mitigate but a hard
      // permanent redirect is strictly better. `redirects()` runs before
      // proxy middleware, so the auth check never fires for these requests.
      {
        source: "/:path*",
        has: [{ type: "host", value: "diez-ten.vercel.app" }],
        destination: "https://diez.net.ua/:path*",
        permanent: true,
      },
      // Preview deployments (diez-<hash>-shevchenko-ivans-projects.vercel.app)
      // are short-lived per-branch URLs — fine for testing, but if Google
      // ever stumbles on one we want it on the canonical domain too.
      {
        source: "/:path*",
        has: [{ type: "host", value: "(.*).shevchenko-ivans-projects.vercel.app" }],
        destination: "https://diez.net.ua/:path*",
        permanent: true,
      },
      // «Народні» merged into «Українська класика» (June 2026) — keep the
      // old topic URL alive for inbound links and Google's index.
      {
        source: "/songs/topic/folk",
        destination: "/songs/topic/ukrainian",
        permanent: true,
      },
      // Old query-string topic URLs → path-based canonical. Path URLs
      // rank better than query strings (Google docs + every SEO audit).
      // The `has` matcher captures the `topic` query param via the named
      // group `slug`; the destination then references `:slug`. Permanent
      // = 301 so any existing inbound links consolidate to the new URL.
      {
        source: "/songs",
        has: [{ type: "query", key: "topic", value: "(?<slug>.+)" }],
        destination: "/songs/topic/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
