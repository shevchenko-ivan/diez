import { type MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

// Block all crawlers on non-production deployments (previews, local).
// NEXT_PUBLIC_SITE_URL must be set only in the production environment.
const isProduction = !!process.env.NEXT_PUBLIC_SITE_URL;

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/profile", "/add", "/auth/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
