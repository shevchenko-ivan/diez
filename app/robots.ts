import { type MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

// Block all crawlers on non-production deployments (previews, local).
// NEXT_PUBLIC_SITE_URL is the primary signal; VERCEL_ENV backs it up so an
// accidentally dropped env var can't silently de-index the whole prod site.
const isProduction =
  !!process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_ENV === "production";

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  // /add and /auth are deliberately NOT here: both are publicly reachable and
  // carry meta noindex — Google must be able to crawl them once to READ that
  // noindex. A robots Disallow would block the crawl and leave them stuck as
  // «Indexed, though blocked by robots.txt» (they're linked from the Navbar).
  // /ui-kit and /api, by contrast, 307-redirect anonymous requests via the
  // middleware, so a crawl can never reach a noindex tag — robots Disallow is
  // the only mechanism that keeps them out of the «Page with redirect» report.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/profile", "/ui-kit", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
